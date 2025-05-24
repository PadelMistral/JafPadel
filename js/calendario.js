import { auth, db } from './firebase-config.js';
// En calendario.js, línea 2:
import { 
  collection, query, onSnapshot, doc, getDoc, updateDoc, getDocs, 
  Timestamp, deleteDoc, setDoc, writeBatch // 🟢 Añade writeBatch aquí
} from "https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js";;
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-auth.js";

const listaJornadas = document.getElementById("lista-jornadas");
let usuarioActual = null;

function cargarCalendario() {
  onSnapshot(collection(db, "calendario"), async (snapshot) => {
    listaJornadas.innerHTML = "";
    
    try {
      const jornadasPromesas = snapshot.docs.map(async (jornadaDoc) => {
        const partidosRef = collection(db, `calendario/${jornadaDoc.id}/partidos`);
        const partidosSnap = await getDocs(partidosRef);

        // Eliminar jornada vacía
        if (partidosSnap.empty) {
          await deleteDoc(doc(db, "calendario", jornadaDoc.id));
          return null;
        }

        // Procesar partidos
        const partidosRenderizados = await Promise.all(
          partidosSnap.docs.map(async (partidoDoc) => {
            const partido = partidoDoc.data();
            
            // Obtener datos completos de equipos
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
          })
        );

        // Crear elemento de jornada
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
      listaJornadas.innerHTML = "<p>Error al cargar el calendario</p>";
    }
  });
}

async function crearElementoPartido(partido, jornadaId) {
  const divPartido = document.createElement("div");
  divPartido.className = "partido-card";

  try {
    // Verificar permisos de edición
    const puedeEditar = usuarioActual && (
      partido.equipoLocal.jugadores.includes(usuarioActual.uid) || 
      partido.equipoVisitante.jugadores.includes(usuarioActual.uid)
    );
    
    const tieneResultado = !!partido.resultado;

    // Formatear fecha
    const fechaTimestamp = partido.fecha?.toDate?.() || new Date(partido.fecha);
    const fechaFormateada = fechaTimestamp.toISOString().split('T')[0];

    // Generar HTML
    divPartido.innerHTML = `
      <div class="encabezado-partido">
        <h3>${partido.equipoLocal.nombre} <span class="vs">VS</span> ${partido.equipoVisitante.nombre}</h3>
        ${!tieneResultado && puedeEditar ? 
          `<button class="btn-mostrar-editor">Registrar Resultado</button>` : ''}
      </div>

      ${tieneResultado ? `
        <div class="resultado-final">
          ${formatearResultado(partido.resultado)}
        </div>
      ` : ''}

      <div class="editor-partido" style="display: none;">
        <div class="fecha-container">
          <label>Fecha:
            <input type="date" class="input-fecha" value="${fechaFormateada}">
          </label>
        </div>
        ${generarSetsHTML(partido, puedeEditar)}
        <button class="btn-guardar" 
                data-jornada="${jornadaId}" 
                data-partido="${partido.id}">
          Guardar Cambios
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
    divPartido.innerHTML = `<p>Error al cargar el partido</p>`;
  }

  return divPartido;
}

// Funciones auxiliares (mantener igual que en tu código original)
function generarSetsHTML(partido, editable) { /* ... */ }
function formatearResultado(resultado) { /* ... */ }
function obtenerDatosFormulario(divPartido) { /* ... */ }

async function guardarCambios(jornadaId, partidoId, datos) {
  try {
    // Actualizar partido
    await updateDoc(doc(db, `calendario/${jornadaId}/partidos/${partidoId}`), datos);
    
    // Actualizar clasificación
    const partidoSnap = await getDoc(doc(db, `calendario/${jornadaId}/partidos/${partidoId}`));
    const partido = partidoSnap.data();

    // Cálculos de sets/puntos
    const sets = Object.values(partido.resultado);
    let [setsLocal, setsVisitante, puntosLocal, puntosVisitante] = [0, 0, 0, 0];
    
    sets.forEach(set => {
      if (set.puntos1 > set.puntos2) setsLocal++;
      else if (set.puntos2 > set.puntos1) setsVisitante++;
      puntosLocal += set.puntos1;
      puntosVisitante += set.puntos2;
    });

    // Actualizar ambos equipos
    const batch = writeBatch(db);
    
    // Equipo local
    const localRef = doc(db, "clasificacion", partido.equipoLocal);
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
    const visitanteRef = doc(db, "clasificacion", partido.equipoVisitante);
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
