// misPartidos.js
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js";
import { db } from './firebase-config.js';

let userEquipoId = null;
let userId = null;

function obtenerEquipoUsuario() {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(getAuth(), async (user) => {
      if (user) {
        userId = user.uid;
        try {
          const docRef = doc(db, "usuarios", user.uid);
          const userDoc = await getDoc(docRef);
          if (userDoc.exists()) {
            userEquipoId = userDoc.data().equipoId;
            console.log("✅ Usuario autenticado como:", user.email, "Equipo:", userEquipoId);
            resolve(userEquipoId);
          } else {
            console.warn("⚠️ El usuario no tiene equipo asignado.");
            resolve(null);
          }
        } catch (error) {
          console.error("❌ Error al obtener el equipo del usuario:", error);
          reject(error);
        }
      } else {
        console.warn("⚠️ No hay usuario autenticado.");
        resolve(null);
      }
    });
  });
}

// Función pública para usar en calendario.js
function puedeEditarPartido(partido) {
  if (!userEquipoId || !partido) return false;
  return partido.equipoLocal === userEquipoId || partido.equipoVisitante === userEquipoId;
}

export {
  obtenerEquipoUsuario,
  puedeEditarPartido,
  userEquipoId,
  userId
};
