import { doc, setDoc } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js";
import { db } from './firebase-config.js';

export async function guardarNombreUsuario(uid, nombreUsuario) {
  const usuarioRef = doc(db, 'usuarios', uid);
  await setDoc(usuarioRef, { nombreUsuario }, { merge: true });
}






import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-auth.js";

const auth = getAuth();

onAuthStateChanged(auth, user => {
  if (!user) {
    // No hay usuario logueado, redirige a login
    window.location.href = "index.html";
  } else {
    // Usuario logueado, puedes obtener user.uid o user.email aquí
    console.log('Usuario:', user.email, user.uid);
    // Carga contenido, o guarda el UID para usarlo
  }
});
