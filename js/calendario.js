import { auth, db } from './firebase-config.js';
import { 
  collection, onSnapshot, doc, getDoc, updateDoc, getDocs, 
  Timestamp, deleteDoc, writeBatch
} from "https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-auth.js";

const listaJornadas = document.getElementById("lista-jornadas");
let usuarioActual = null;

// Función principal para cargar el calendario
function cargarCalendario() {
  onSnapshot(collection(db, "calendario"), async (snapshot) => {
    listaJornadas.innerHTML = "";
    
    try {
      const jornadasPromesas = snapshot.docs.map(async (jornadaDoc) => {
        const partidosRef = collection(db, `calendario/${jornadaDoc.id}/partidos`);
        const partidosSnap = await getDocs(partidosRef);

        // Eliminar jornadas vacías
        if (partidosSnap.empty) {
          await deleteDoc(doc(db, "calendario", jornadaDoc.id));
          return null;
        }

        // Procesar partidos
        const partidosRenderizados = await Promise.all(
          partidosSnap.docs.map(async (partidoDoc) => {
            const partidoData = partidoDoc.data();
            
            // Obtener datos completos de los equipos desde Firestore
            const [equipoLocalSnap, equipoVisitanteSnap] = await Promise.all([
              getDoc(doc(db, "equipos", partidoData.equipoLocal)),
              getDoc(doc(db, "equipos", partidoData.equipoVisitante))
            ]);

            return crearElementoPartido({
              ...partidoData,
              id: partidoDoc.id,
              equipoLocal: { 
                id: equipoLocalSnap.id, 
                ...equipoLocalSnap.data() 
              },
              equipoVisitante: { 
                id: equipoVisitanteSnap.id, 
                ...equipoVisitanteSnap.data() 
              }
            }, jornadaDoc.id);
          })
        );

        // Crear elemento de la jornada
        const divJornada = document.createElement("div");
        divJornada.className = "jornada-card";
        divJornada.innerHTML = `<h2 class="jornada-titulo">${jornadaDoc.data().nombre}</h2>`;

        const divPartidos = document.createElement("div");
        divPartidos.className = "partidos-container";
        partidosRenderizados.forEach(p => divPartidos.appendChild(p));
        
        divJornada.appendChild(divPartidos);
        return divJornada;
      });

      const jornadas = await Promise.all(jornadasPromesas);
      jornadas.filter(j => j !== null).forEach(j => listaJornadas.appendChild(j));

    } catch (error) {
      console.error("Error cargando calendario:", error);
      listaJornadas.innerHTML = "<p class='error'>⚠️ Error al cargar el calendario</p>";
    }
  });
}

// Función para crear la tarjeta de un partido
  async function crearElementoPartido(partido, jornadaId) {
  const divPartido = document.createElement("div");
  divPartido.className = "partido-card";

  try {
    // Obtener datos de los equipos desde Firestore usando los IDs
    const [equipoLocalSnap, equipoVisitanteSnap] = await Promise.all([
      getDoc(doc(db, "equipos", partido.equipoLocal)), // 🟢 Usar el ID string
      getDoc(doc(db, "equipos", partido.equipoVisitante))
    ]);

    // Extraer datos de los equipos
    const equipoLocal = equipoLocalSnap.data();
    const equipoVisitante = equipoVisitanteSnap.data();

    // Verificar permisos de edición
    const puedeEditar = usuarioActual && (
      equipoLocal.jugadores.includes(usuarioActual.uid) || // 🟢 Acceder a jugadores del equipo
      equipoVisitante.jugadores.includes(usuarioActual.uid)
    );
    
    const tieneResultado = !!partido.resultado;

    // Formatear fecha
    const fechaTimestamp = partido.fecha?.toDate?.() || new Date(partido.fecha);
    const fechaFormateada = fechaTimestamp.toISOString().split('T')[0] || 'Fecha no definida';

    // Generar HTML
    divPartido.innerHTML = `
      <div class="encabezado-partido">
        <h3>${equipoLocal.nombre} <span class="vs">VS</span> ${equipoVisitante.nombre}</h3> <!-- 🟢 Nombres reales -->
        ${!tieneResultado && puedeEditar ? 
          `<button class="btn-mostrar-editor">⚡ Registrar Resultado</button>` : ''}
      </div>

      ${tieneResultado ? `
        <div class="resultado-final">
          ${formatearResultado(partido.resultado)}
        </div>
      ` : ''}

      <div class="editor-partido" style="display: none;">
        <div class="fecha-container">
          <label>📅 Fecha:
            <input type="date" class="input-fecha" value="${fechaFormateada}">
          </label>
        </div>
        ${generarSetsHTML(partido, puedeEditar)}
        <button class="btn-guardar" 
                data-jornada="${jornadaId}" 
                data-partido="${partido.id}">
          💾 Guardar Cambios
        </button>
      </div>
    `;

    // Manejar clics
    if (!tieneResultado && puedeEditar) {
      divPartido.querySelector(".btn-mostrar-editor").addEventListener("click", (e) => {
        e.target.style.display = "none";
        divPartido.querySelector(".editor-partido").style.display = "block";
      });
    }

    if (puedeEditar) {
      divPartido.querySelector(".btn-guardar").addEventListener("click", async () => {
        const datos = obtenerDatosFormulario(divPartido);
        await guardarCambios(jornadaId, partido.id, datos);
        location.reload();
      });
    }

  } catch (err) {
    console.error("Error mostrando partido:", err);
    divPartido.innerHTML = `<p class="error">⚠️ Error al cargar el partido</p>`;
  }

  return divPartido;
}

// Funciones auxiliares
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
               value="${set.puntos1}" 
               min="0" 
               placeholder="0">
        <span class="separador">-</span>
        <input type="number"
               class="input-set"
               ${!editable ? 'disabled' : ''}
               value="${set.puntos2}" 
               min="0" 
               placeholder="0">
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

// Actualizar datos en Firestore
async function guardarCambios(jornadaId, partidoId, datos) {
  try {
    await updateDoc(doc(db, `calendario/${jornadaId}/partidos/${partidoId}`), datos);
    
    const partidoSnap = await getDoc(doc(db, `calendario/${jornadaId}/partidos/${partidoId}`));
    const partido = partidoSnap.data();

    // Cálculos de sets y puntos
    const sets = Object.values(partido.resultado);
    let [setsLocal, setsVisitante, puntosLocal, puntosVisitante] = [0, 0, 0, 0];
    
    sets.forEach(set => {
      if (set.puntos1 > set.puntos2) setsLocal++;
      else if (set.puntos2 > set.puntos1) setsVisitante++;
      puntosLocal += set.puntos1;
      puntosVisitante += set.puntos2;
    });

    // Actualizar clasificación
    const batch = writeBatch(db);
    
    // Equipo local
    const localRef = doc(db, "clasificacion", partido.equipoLocal.id);
    const localSnap = await getDoc(localRef);
    const localData = localSnap.exists() ? localSnap.data() : {};
    
    batch.set(localRef, {
      setsGanados: (localData.setsGanados || 0) + setsLocal,
      setsPerdidos: (localData.setsPerdidos || 0) + setsVisitante,
      puntosFavor: (localData.puntosFavor || 0) + puntosLocal,
      puntosContra: (localData.puntosContra || 0) + puntosVisitante,
      diferencia: (localData.diferencia || 0) + (puntosLocal - puntosVisitante)
    }, { merge: true });

    // Equipo visitante
    const visitanteRef = doc(db, "clasificacion", partido.equipoVisitante.id);
    const visitanteSnap = await getDoc(visitanteRef);
    const visitanteData = visitanteSnap.exists() ? visitanteSnap.data() : {};
    
    batch.set(visitanteRef, {
      setsGanados: (visitanteData.setsGanados || 0) + setsVisitante,
      setsPerdidos: (visitanteData.setsPerdidos || 0) + setsLocal,
      puntosFavor: (visitanteData.puntosFavor || 0) + puntosVisitante,
      puntosContra: (visitanteData.puntosContra || 0) + puntosLocal,
      diferencia: (visitanteData.diferencia || 0) + (puntosVisitante - puntosLocal)
    }, { merge: true });

    await batch.commit();
    alert("✅ Clasificación actualizada");

  } catch (err) {
    console.error("❌ Error guardando cambios:", err);
    alert("Error al guardar: " + err.message);
  }
}

// Inicializar
onAuthStateChanged(auth, (user) => {
  if (user) {
    usuarioActual = user;
    cargarCalendario();
  } else {
    window.location.href = "index.html";
  }
});
