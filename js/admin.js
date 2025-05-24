// admin.js (completo y actualizado con "Volver", edición y eliminación de partidos pendientes)
import { auth, db } from './firebase-config.js';
import {
  collection,
  collectionGroup,
  getDocs,
  addDoc,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  Timestamp
} from "https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-auth.js";

// Elementos del DOM
const selectJugador1 = document.getElementById("select-jugador1");
const selectJugador2 = document.getElementById("select-jugador2");
const btnCrearEquipo = document.getElementById("btn-crear-equipo");
const listaEquipos = document.getElementById("lista-equipos-admin");
const listaUsuarios = document.getElementById("lista-usuarios");
const btnCrearJornada = document.getElementById("btn-crear-jornada");
const btnAnadirPartido = document.getElementById("btn-anadir-partido");
const btnVolver = document.getElementById("btn-volver");
const partidosJornada = document.getElementById("partidos-jornada");
const nombreJornada = document.getElementById("nombre-jornada");
const partidosJugadosDiv = document.getElementById("partidos-jugados");
const partidosPendientesDiv = document.getElementById("partidos-pendientes") || (() => {
  const div = document.createElement("div");
  div.id = "partidos-pendientes";
  div.className = "lista-partidos-pendientes";
  partidosJugadosDiv.parentElement.appendChild(div);
  return div;
})();

// Variables globales
let usuariosMap = {};
let equiposMap = {};
let partidosPorJornada = [];

// ==================== FUNCIONES PRINCIPALES ====================

// Cargar usuarios en selects
async function cargarUsuarios() {
  const q = query(collection(db, "usuarios"), where("aprobado", "==", true));
  const usuariosSnap = await getDocs(q);

  usuariosMap = {};
  selectJugador1.innerHTML = '<option value="">Seleccionar jugador</option>';
  selectJugador2.innerHTML = '<option value="">Seleccionar jugador</option>';

  usuariosSnap.forEach(docu => {
    const data = docu.data();
    usuariosMap[docu.id] = data.nombreUsuario;

    const option = document.createElement("option");
    option.value = docu.id;
    option.textContent = data.nombreUsuario;

    selectJugador1.appendChild(option.cloneNode(true));
    selectJugador2.appendChild(option.cloneNode(true));
  });
}

// Escuchar cambios en usuarios
function escucharUsuarios() {
  onSnapshot(collection(db, "usuarios"), (snapshot) => {
    listaUsuarios.innerHTML = "";

    snapshot.forEach(docu => {
      const usuario = docu.data();
      const li = document.createElement("li");
      li.innerHTML = `
        <div class="usuario-item">
          <span>${usuario.nombreUsuario} (${usuario.email})</span>
          <input type="text" class="edit-nombre" value="${usuario.nombreUsuario}" style="display: none;">
          <button class="${usuario.aprobado ? 'rechazar' : 'aprobar'}" 
                  data-id="${docu.id}" 
                  data-estado="${usuario.aprobado}">
            ${usuario.aprobado ? 'Rechazar' : 'Aprobar'}
          </button>
          <button class="editar-nombre-btn" data-id="${docu.id}">Editar Nombre</button>
          <button class="guardar-nombre-btn" data-id="${docu.id}" style="display: none;">Guardar</button>
          <button class="eliminar-usuario" data-id="${docu.id}">Eliminar</button>
        </div>
      `;
      listaUsuarios.appendChild(li);
    });

    // Eventos para aprobar/rechazar
    document.querySelectorAll('.aprobar, .rechazar').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const userId = e.target.dataset.id;
        const nuevoEstado = e.target.dataset.estado === "true" ? false : true;
        await updateDoc(doc(db, "usuarios", userId), { aprobado: nuevoEstado });
      });
    });

    // Eventos para editar nombres
    document.querySelectorAll('.editar-nombre-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const container = e.target.closest('.usuario-item');
        container.querySelector('span').style.display = 'none';
        container.querySelector('.edit-nombre').style.display = 'inline-block';
        container.querySelector('.editar-nombre-btn').style.display = 'none';
        container.querySelector('.guardar-nombre-btn').style.display = 'inline-block';
      });
    });

    document.querySelectorAll('.guardar-nombre-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const userId = e.target.dataset.id;
        const container = e.target.closest('.usuario-item');
        const nuevoNombre = container.querySelector('.edit-nombre').value;
        
        await updateDoc(doc(db, "usuarios", userId), { 
          nombreUsuario: nuevoNombre 
        });
        
        container.querySelector('span').textContent = `${nuevoNombre} (${container.querySelector('span').textContent.split('(')[1]}`;
        container.querySelector('span').style.display = 'inline-block';
        container.querySelector('.edit-nombre').style.display = 'none';
        container.querySelector('.editar-nombre-btn').style.display = 'inline-block';
        e.target.style.display = 'none';
      });
    });

    // Eventos para eliminar
    document.querySelectorAll('.eliminar-usuario').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        if (confirm("¿Eliminar este usuario permanentemente?")) {
          await deleteDoc(doc(db, "usuarios", e.target.dataset.id));
        }
      });
    });
  });
}

// Escuchar equipos
function escucharEquipos() {
  onSnapshot(collection(db, "equipos"), (snapshot) => {
    listaEquipos.innerHTML = "";
    equiposMap = {};

    snapshot.forEach(docu => {
      const eq = docu.data();
      equiposMap[docu.id] = eq.nombre;

      const li = document.createElement("li");
      li.innerHTML = `
        <span>${eq.nombre}</span>
        <button class="eliminar-equipo" data-id="${docu.id}">Eliminar</button>
      `;
      listaEquipos.appendChild(li);
    });

    // Eventos para eliminar equipos
    document.querySelectorAll('.eliminar-equipo').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const equipoId = e.target.dataset.id;
        if (confirm("¿Eliminar este equipo y todos sus partidos?")) {
          await deleteDoc(doc(db, "equipos", equipoId));
        }
      });
    });
  });
}

// Crear equipo
btnCrearEquipo.addEventListener("click", async () => {
  const jugador1Id = selectJugador1.value;
  const jugador2Id = selectJugador2.value;

  if (!jugador1Id || !jugador2Id) {
    alert("Selecciona ambos jugadores.");
    return;
  }

  if (jugador1Id === jugador2Id) {
    alert("Selecciona jugadores distintos.");
    return;
  }

  const equiposSnap = await getDocs(collection(db, "equipos"));
  let jugador1EnEquipo = false;
  let jugador2EnEquipo = false;

  equiposSnap.forEach(doc => {
    const jugadores = doc.data().jugadores || [];
    if (jugadores.includes(jugador1Id)) jugador1EnEquipo = true;
    if (jugadores.includes(jugador2Id)) jugador2EnEquipo = true;
  });

  if (jugador1EnEquipo || jugador2EnEquipo) {
    alert("Uno o ambos jugadores ya pertenecen a un equipo.");
    return;
  }

  const nombreEquipo = `${usuariosMap[jugador1Id]} y ${usuariosMap[jugador2Id]}`;
  await addDoc(collection(db, "equipos"), {
    nombre: nombreEquipo,
    jugadores: [jugador1Id, jugador2Id],
    timestamp: serverTimestamp()
  });

  alert("Equipo creado correctamente");
  selectJugador1.value = "";
  selectJugador2.value = "";
});

// Añadir partido a jornada
btnAnadirPartido.addEventListener("click", () => {
  const contenedorPartido = document.createElement("div");
  contenedorPartido.className = "partido";

  const select1 = document.createElement("select");
  const select2 = document.createElement("select");
  const inputFecha = document.createElement("input");
  inputFecha.type = "datetime-local";
  inputFecha.className = "fecha-partido";

  Object.entries(equiposMap).forEach(([id, nombre]) => {
    [select1, select2].forEach(select => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = nombre;
      select.appendChild(option);
    });
  });

  contenedorPartido.appendChild(select1);
  contenedorPartido.appendChild(document.createTextNode(" vs "));
  contenedorPartido.appendChild(select2);
  contenedorPartido.appendChild(document.createTextNode(" - Fecha: "));
  contenedorPartido.appendChild(inputFecha);

  partidosJornada.appendChild(contenedorPartido);
  partidosPorJornada.push(contenedorPartido);
});

// Crear jornada
btnCrearJornada.addEventListener("click", async () => {
  if (partidosPorJornada.length === 0) {
    alert("Añade al menos un partido");
    return;
  }

  const jornadaRef = await addDoc(collection(db, "calendario"), {
    nombre: nombreJornada.value,
    fecha: serverTimestamp(),
    estado: "pendiente"
  });

  const partidosExistentes = new Set();
  const partidosSnap = await getDocs(collectionGroup(db, "partidos"));
  partidosSnap.forEach(doc => {
    const data = doc.data();
    partidosExistentes.add([data.equipoLocal, data.equipoVisitante].sort().join("-"));
  });

  for (const partido of partidosPorJornada) {
    const selects = partido.querySelectorAll("select");
    const equipo1 = selects[0].value;
    const equipo2 = selects[1].value;
    const fechaInput = partido.querySelector("input").value;

    if (!equipo1 || !equipo2 || equipo1 === equipo2) continue;

    const clavePartido = [equipo1, equipo2].sort().join("-");
    if (partidosExistentes.has(clavePartido)) {
      alert(`El partido ${equiposMap[equipo1]} vs ${equiposMap[equipo2]} ya existe`);
      continue;
    }

    await addDoc(collection(db, `calendario/${jornadaRef.id}/partidos`), {
      equipoLocal: equipo1,
      equipoVisitante: equipo2,
      resultado: null,
      fecha: Timestamp.fromDate(new Date(fechaInput)),
      estado: "pendiente"
    });
  }

  alert("Jornada creada con éxito");
  partidosPorJornada = [];
  partidosJornada.innerHTML = "";
  nombreJornada.value = "";
});

// Cargar partidos jugados
function cargarPartidosJugados() {
  onSnapshot(collection(db, "calendario"), async (snapshot) => {
    const jugados = [];
    const pendientes = [];

    for (const jornadaDoc of snapshot.docs) {
      const partidosSnap = await getDocs(collection(db, `calendario/${jornadaDoc.id}/partidos`));
      partidosSnap.forEach(partidoDoc => {
        const partido = {
          id: partidoDoc.id,
          jornadaId: jornadaDoc.id,
          ...partidoDoc.data()
        };
        partido.resultado ? jugados.push(partido) : pendientes.push(partido);
      });
    }

    mostrarPartidosJugados(jugados);
    mostrarPartidosPendientes(pendientes);
  });
}

// Mostrar partidos jugados
async function mostrarPartidosJugados(partidos) {
  partidosJugadosDiv.innerHTML = "";
  const lista = document.createElement("div");
  lista.className = "admin-partidos-lista";

  for (const partido of partidos) {
    const [localSnap, visitanteSnap] = await Promise.all([
      getDoc(doc(db, "equipos", partido.equipoLocal)),
      getDoc(doc(db, "equipos", partido.equipoVisitante))
    ]);

    const local = localSnap.data();
    const visitante = visitanteSnap.data();

    const div = document.createElement("div");
    div.className = "admin-partido-card";
    div.dataset.partidoId = partido.id;
    div.dataset.jornadaId = partido.jornadaId;

    div.innerHTML = `
      <div class="partido-header">
        <h3>${local.nombre} vs ${visitante.nombre}</h3>
        <div class="partido-actions">
          <button class="editar-resultado">✏️ Editar</button>
          <button class="borrar-partido">🗑️ Borrar</button>
        </div>
      </div>
      <div class="resultado-display">${formatearResultado(partido.resultado)}</div>
      <form class="form-editar-resultado" style="display:none;">
        <div class="set-edicion">
          <label>Set 1: 
            <input type="number" name="set1p1" min="0" value="${partido.resultado.set1?.puntos1 || 0}">
            - <input type="number" name="set1p2" min="0" value="${partido.resultado.set1?.puntos2 || 0}">
          </label>
        </div>
        <div class="set-edicion">
          <label>Set 2: 
            <input type="number" name="set2p1" min="0" value="${partido.resultado.set2?.puntos1 || 0}">
            - <input type="number" name="set2p2" min="0" value="${partido.resultado.set2?.puntos2 || 0}">
          </label>
        </div>
        <div class="set-edicion">
          <label>Set 3: 
            <input type="number" name="set3p1" min="0" value="${partido.resultado.set3?.puntos1 || 0}">
            - <input type="number" name="set3p2" min="0" value="${partido.resultado.set3?.puntos2 || 0}">
          </label>
        </div>
        <div class="form-actions">
          <button type="submit">💾 Guardar</button>
          <button type="button" class="cancelar-edicion">❌ Cancelar</button>
        </div>
      </form>
    `;

    lista.appendChild(div);
  }

  partidosJugadosDiv.appendChild(lista);

  // Delegación de eventos
  lista.addEventListener("click", async (e) => {
    const partidoDiv = e.target.closest(".admin-partido-card");
    if (!partidoDiv) return;

    const partidoId = partidoDiv.dataset.partidoId;
    const jornadaId = partidoDiv.dataset.jornadaId;

    if (e.target.classList.contains("editar-resultado")) {
      partidoDiv.querySelector(".resultado-display").style.display = "none";
      partidoDiv.querySelector(".editar-resultado").style.display = "none";
      partidoDiv.querySelector(".form-editar-resultado").style.display = "block";
    }

    if (e.target.classList.contains("cancelar-edicion")) {
      partidoDiv.querySelector(".form-editar-resultado").style.display = "none";
      partidoDiv.querySelector(".resultado-display").style.display = "block";
      partidoDiv.querySelector(".editar-resultado").style.display = "inline-block";
    }

    if (e.target.classList.contains("borrar-partido")) {
      if (confirm("¿Borrar este partido permanentemente?")) {
        await deleteDoc(doc(db, `calendario/${jornadaId}/partidos/${partidoId}`));
        partidoDiv.remove();
      }
    }
  });

  lista.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!e.target.classList.contains("form-editar-resultado")) return;

    const partidoDiv = e.target.closest(".admin-partido-card");
    const partidoId = partidoDiv.dataset.partidoId;
    const jornadaId = partidoDiv.dataset.jornadaId;

    const formData = new FormData(e.target);
    const nuevoResultado = {
      set1: {
        puntos1: parseInt(formData.get("set1p1")),
        puntos2: parseInt(formData.get("set1p2"))
      },
      set2: {
        puntos1: parseInt(formData.get("set2p1")),
        puntos2: parseInt(formData.get("set2p2"))
      },
      set3: {
        puntos1: parseInt(formData.get("set3p1")),
        puntos2: parseInt(formData.get("set3p2"))
      }
    };

    try {
      await updateDoc(doc(db, `calendario/${jornadaId}/partidos/${partidoId}`), {
        resultado: nuevoResultado
      });

      partidoDiv.querySelector(".resultado-display").innerHTML = formatearResultado(nuevoResultado);
      partidoDiv.querySelector(".form-editar-resultado").style.display = "none";
      partidoDiv.querySelector(".resultado-display").style.display = "block";
      partidoDiv.querySelector(".editar-resultado").style.display = "inline-block";
    } catch (error) {
      alert("Error al actualizar: " + error.message);
    }
  });
}

// Mostrar partidos pendientes
async function mostrarPartidosPendientes(partidos) {
  partidosPendientesDiv.innerHTML = "<h3>Partidos Pendientes</h3>";
  const lista = document.createElement("div");
  lista.className = "lista-pendientes";

  for (const partido of partidos) {
    const [localSnap, visitanteSnap] = await Promise.all([
      getDoc(doc(db, "equipos", partido.equipoLocal)),
      getDoc(doc(db, "equipos", partido.equipoVisitante))
    ]);

    const local = localSnap.data();
    const visitante = visitanteSnap.data();
    const fecha = partido.fecha?.toDate()?.toLocaleString("es-ES") || "Sin fecha";

    const div = document.createElement("div");
    div.className = "pendiente-item";
    div.innerHTML = `
      <span>${local.nombre} vs ${visitante.nombre} - ${fecha}</span>
      <div class="pendiente-actions">
        <button class="editar-fecha" data-id="${partido.id}" data-jornada="${partido.jornadaId}">📅 Editar</button>
        <button class="borrar-partido" data-id="${partido.id}" data-jornada="${partido.jornadaId}">🗑️ Borrar</button>
      </div>
    `;

    lista.appendChild(div);
  }

  partidosPendientesDiv.appendChild(lista);

  // Eventos para pendientes
  lista.addEventListener("click", async (e) => {
    if (!e.target.dataset.id) return;

    const partidoId = e.target.dataset.id;
    const jornadaId = e.target.dataset.jornada;

    if (e.target.classList.contains("borrar-partido")) {
      if (confirm("¿Eliminar este partido pendiente?")) {
        await deleteDoc(doc(db, `calendario/${jornadaId}/partidos/${partidoId}`));
        e.target.closest(".pendiente-item").remove();
      }
    }

    if (e.target.classList.contains("editar-fecha")) {
      const nuevaFecha = prompt("Nueva fecha (formato YYYY-MM-DDTHH:MM):");
      if (!nuevaFecha) return;

      try {
        await updateDoc(doc(db, `calendario/${jornadaId}/partidos/${partidoId}`), {
          fecha: Timestamp.fromDate(new Date(nuevaFecha))
        });
        alert("Fecha actualizada");
      } catch (error) {
        alert("Error al actualizar: " + error.message);
      }
    }
  });
}

// Formatear resultado
function formatearResultado(resultado) {
  if (!resultado) return "Sin resultado";
  return `
    <div class="marcador-final">
      ${[1, 2, 3].map(set => 
        `Set ${set}: ${resultado[`set${set}`]?.puntos1 || 0}-${resultado[`set${set}`]?.puntos2 || 0}`
      ).join(" | ")}
    </div>
  `;
}

// Botón volver
btnVolver.addEventListener("click", () => {
  window.location.href = "index.html";
});

// Inicialización
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userDoc = await getDoc(doc(db, "usuarios", user.uid));
    const userData = userDoc.data();

    if (userData?.rol === "Admin") {
      cargarUsuarios();
      escucharEquipos();
      escucharUsuarios();
      cargarPartidosJugados();
    } else {
      alert("Acceso solo para administradores");
      window.location.href = "index.html";
    }
  } else {
    window.location.href = "index.html";
  }
});
