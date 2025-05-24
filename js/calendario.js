// calendario.js (corregido)
import { auth, db } from './firebase-config.js';
import {
  collection, query, onSnapshot, doc, getDoc, updateDoc, getDocs, Timestamp, deleteDoc
} from "https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-auth.js";

const listaJornadas = document.getElementById("lista-jornadas");
let usuarioActual = null;

function cargarCalendario() {
  onSnapshot(collection(db, "calendario"), async (snapshot) => {
    listaJornadas.innerHTML = "";

// Dentro de cargarCalendario():
const jornadas = await Promise.all(snapshot.docs.map(async (jornadaDoc) => {
  const jornadaData = jornadaDoc.data();
  const partidosRef = collection(db, `calendario/${jornadaDoc.id}/partidos`);
  const partidosSnap = await getDocs(partidosRef);

  // 🔥 Si no hay partidos, eliminar la jornada del Firestore y no renderizar nada
  if (partidosSnap.empty) {
    await deleteDoc(doc(db, "calendario", jornadaDoc.id));
    return null;
  }

  const partidosRenderizados = await Promise.all(partidosSnap.docs.map(async (partidoDoc) => {
    const partido = partidoDoc.data();

    const [equipoLocalSnap, equipoVisitanteSnap] = await Promise.all([
      getDoc(doc(db, "equipos", partido.equipoLocal)),
      getDoc(doc(db, "equipos", partido.equipoVisitante))
    ]);

    return crearElementoPartido({
      ...partido,
      id: partidoDoc.id,
      equipoLocal: { ...equipoLocalSnap.data(), id: equipoLocalSnap.id },
      equipoVisitante: { ...equipoVisitanteSnap.data(), id: equipoVisitanteSnap.id }
    }, jornadaDoc.id);
  }));

  const divJornada = document.createElement("div");
  divJornada.className = "jornada-card";
  divJornada.innerHTML = `<h2 class="jornada-titulo">${jornadaData.nombre}</h2>`;

  const divPartidos = document.createElement("div");
  divPartidos.className = "partidos-container";
  partidosRenderizados.forEach(p => divPartidos.appendChild(p));

  divJornada.appendChild(divPartidos);
  return divJornada;
}));

// Solo añadir jornadas no nulas
jornadas.filter(j => j !== null).forEach(j => listaJornadas.appendChild(j));

  });
}

async function crearElementoPartido(partido, jornadaId) {
  const divPartido = document.createElement("div");
  divPartido.className = "partido-card";

  try {
// Verifica si es admin O si es jugador de alguno de los equipos
const puedeEditar = usuarioActual && (
  usuarioActual.rol === "admin" || 
  partido.equipoLocal.jugadores.includes(usuarioActual.uid) || 
  partido.equipoVisitante.jugadores.includes(usuarioActual.uid)
);
    const tieneResultado = !!partido.resultado;

    const resultadoHTML = tieneResultado ? `
      <div class="resultado-final">
        <span>${formatearResultado(partido.resultado)}</span>
      </div>
    ` : '';

    const botonEditarHTML = !tieneResultado && puedeEditar ? `
      <button class="btn-mostrar-editor">Registrar Resultado</button>
    ` : '';

    divPartido.innerHTML = `
      <div class="encabezado-partido">
        <h3>${partido.equipoLocal.nombre} <span class="vs">VS</span> ${partido.equipoVisitante.nombre}</h3>
        ${botonEditarHTML}
      </div>

      <div class="editor-partido" style="display: none;">
        <div class="fecha-container">
          <label>Fecha:
            <input type="date" class="input-fecha"
              value="${partido.fecha?.toDate?.().toISOString().split('T')[0] || ''}">
          </label>
        </div>
        ${generarSetsHTML(partido, puedeEditar)}
        <button class="btn-guardar"
                data-jornada="${jornadaId}"
                data-partido="${partido.id}">
          Guardar Cambios
        </button>
      </div>

      ${resultadoHTML}
    `;

    if (!tieneResultado && puedeEditar) {
      divPartido.querySelector(".btn-mostrar-editor").addEventListener("click", (e) => {
        e.target.style.display = "none";
        divPartido.querySelector(".editor-partido").style.display = "block";
      });
    }

    if (puedeEditar && !tieneResultado) {
      divPartido.querySelector(".btn-guardar").addEventListener("click", async () => {
        const datos = obtenerDatosFormulario(divPartido);
        await guardarCambios(jornadaId, partido.id, datos);
      });
    }

  } catch (err) {
    console.error("Error mostrando partido:", err);
    divPartido.innerHTML = `<p>Error al cargar el partido</p>`;
  }

  return divPartido;
}

function generarSetsHTML(partido, editable) {
  const resultado = partido.resultado || {};
  return Array.from({ length: 3 }, (_, i) => {
    const setNum = i + 1;
    const set = resultado[`set${setNum}`] || { puntos1: "", puntos2: "" };
    return `
      <div class="set">
        <span class="set-numero">Set ${setNum}</span>
        <input type="number"
               class="input-set"
               ${!editable ? 'disabled' : ''}
               value="${set.puntos1}" min="0" placeholder="0">
        <span class="separador">-</span>
        <input type="number"
               class="input-set"
               ${!editable ? 'disabled' : ''}
               value="${set.puntos2}" min="0" placeholder="0">
      </div>
    `;
  }).join("");
}

function formatearResultado(resultado) {
  const sets = Object.values(resultado || {});
  const marcador = sets.reduce((acc, set) => {
    acc.local += set.puntos1;
    acc.visitante += set.puntos2;
    return acc;
  }, { local: 0, visitante: 0 });

  return `
    <div class="marcador-final">${marcador.local} - ${marcador.visitante}</div>
    <div class="sets-detalle">
      ${sets.map((s, i) => `Set ${i + 1}: ${s.puntos1}-${s.puntos2}`).join(" | ")}
    </div>
  `;
}

function obtenerDatosFormulario(divPartido) {
  const inputs = divPartido.querySelectorAll("input");
  return {
    fecha: Timestamp.fromDate(new Date(inputs[0].value)),
    resultado: {
      set1: { puntos1: Number(inputs[1].value), puntos2: Number(inputs[2].value) },
      set2: { puntos1: Number(inputs[3].value), puntos2: Number(inputs[4].value) },
      set3: { puntos1: Number(inputs[5].value), puntos2: Number(inputs[6].value) }
    }
  };
}

async function guardarCambios(jornadaId, partidoId, datos) {
  try {
    // 1. Guardar resultado en el partido
    await updateDoc(doc(db, `calendario/${jornadaId}/partidos/${partidoId}`), datos);

    // 2. Leer partido actualizado (para asegurarnos que tenemos datos correctos)
    const partidoRef = doc(db, `calendario/${jornadaId}/partidos/${partidoId}`);
    const partidoSnap = await getDoc(partidoRef);
    const partido = partidoSnap.data();

    if (!partido || !partido.resultado) {
      alert("Error: resultado no encontrado después de guardar.");
      return;
    }

    // 3. Calcular sets ganados/perdidos, puntos a favor/en contra
    const sets = Object.values(partido.resultado);
    let setsGanadosLocal = 0, setsGanadosVisitante = 0;
    let puntosLocal = 0, puntosVisitante = 0;

    sets.forEach(set => {
      if (set.puntos1 > set.puntos2) setsGanadosLocal++;
      else if (set.puntos2 > set.puntos1) setsGanadosVisitante++;

      puntosLocal += set.puntos1;
      puntosVisitante += set.puntos2;
    });

    // Determinar ganador del partido
    let partidosGanadosLocal = 0, partidosGanadosVisitante = 0;
    if (setsGanadosLocal > setsGanadosVisitante) partidosGanadosLocal = 1;
    else if (setsGanadosVisitante > setsGanadosLocal) partidosGanadosVisitante = 1;

    // 4. Actualizar clasificación de ambos equipos
    // Suponiendo que la colección "clasificacion" tiene documentos por equipo con id = equipoId

    const clasificacionLocalRef = doc(db, "clasificacion", partido.equipoLocal);
    const clasificacionVisitanteRef = doc(db, "clasificacion", partido.equipoVisitante);

    // Leer datos actuales
    const [localSnap, visitanteSnap] = await Promise.all([
      getDoc(clasificacionLocalRef),
      getDoc(clasificacionVisitanteRef)
    ]);

    const localData = localSnap.exists() ? localSnap.data() : {};
    const visitanteData = visitanteSnap.exists() ? visitanteSnap.data() : {};

    // Función para sumar valores o inicializar si no existen
    function sumar(a, b) {
      return (a || 0) + b;
    }

    // Actualizar local
    await updateDoc(clasificacionLocalRef, {
      setsGanados: sumar(localData.setsGanados, setsGanadosLocal),
      setsPerdidos: sumar(localData.setsPerdidos, setsGanadosVisitante),
      partidosGanados: sumar(localData.partidosGanados, partidosGanadosLocal),
      partidosPerdidos: sumar(localData.partidosPerdidos, partidosGanadosVisitante),
      puntosFavor: sumar(localData.puntosFavor, puntosLocal),
      puntosContra: sumar(localData.puntosContra, puntosVisitante),
      diferenciaPuntos: sumar(localData.diferenciaPuntos, puntosLocal - puntosVisitante)
    });

    // Actualizar visitante
    await updateDoc(clasificacionVisitanteRef, {
      setsGanados: sumar(visitanteData.setsGanados, setsGanadosVisitante),
      setsPerdidos: sumar(visitanteData.setsPerdidos, setsGanadosLocal),
      partidosGanados: sumar(visitanteData.partidosGanados, partidosGanadosVisitante),
      partidosPerdidos: sumar(visitanteData.partidosPerdidos, partidosGanadosLocal),
      puntosFavor: sumar(visitanteData.puntosFavor, puntosVisitante),
      puntosContra: sumar(visitanteData.puntosContra, puntosLocal),
      diferenciaPuntos: sumar(visitanteData.diferenciaPuntos, puntosVisitante - puntosLocal)
    });

    alert("✅ Resultados y clasificación actualizados");
  } catch (err) {
    console.error("❌ Error guardando cambios:", err);
    alert("Error al guardar: " + err.message);
  }
}


onAuthStateChanged(auth, async (user) => {
  try {
    if (user) {
      // Obtener documento del usuario
      const userDoc = await getDoc(doc(db, "usuarios", user.uid));
      
      if (!userDoc.exists()) {
        throw new Error("Usuario no registrado en la base de datos");
      }

      // Crear objeto de usuario combinando datos de Auth y Firestore
      usuarioActual = {
        ...user,          // Datos básicos de autenticación
        rol: userDoc.data().rol || 'usuario'  // Rol con valor por defecto
      };

      cargarCalendario();
    } else {
      window.location.href = "index.html";
    }
  } catch (error) {
    console.error("Error en autenticación:", error);
    auth.signOut();
    window.location.href = "index.html";
  }
});
