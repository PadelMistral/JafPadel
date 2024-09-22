document.addEventListener('DOMContentLoaded', () => {
    const messagesContainer = document.getElementById('messages');
    const sendButton = document.getElementById('send');
    const clearButton = document.getElementById('clear');

    // Cargar mensajes al iniciar
    cargarMensajes();

    // Enviar un mensaje
    sendButton.addEventListener('click', () => {
        const nickname = document.getElementById('nickname').value.trim();
        const message = document.getElementById('message').value.trim();

        if (nickname && message) {
            const messageData = { nickname, message };
            guardarMensaje(messageData);
            mostrarMensaje(messageData);
            document.getElementById('message').value = ''; // Limpiar el campo de mensaje
        } else {
            alert('Por favor, introduce un apodo y un mensaje.');
        }
    });

    // Borrar mensajes si se proporciona la clave de administrador
    clearButton.addEventListener('click', () => {
        const adminKey = prompt("Introduce la clave de administrador:");
        if (adminKey === "981") { // Cambia "tu_clave_admin" por la clave real
            localStorage.removeItem('chatMessages');
            messagesContainer.innerHTML = ''; // Limpiar el contenedor de mensajes
        } else {
            alert('Clave de administrador incorrecta.');
        }
    });
});

// Función para guardar el mensaje en localStorage
function guardarMensaje(messageData) {
    const mensajes = JSON.parse(localStorage.getItem('chatMessages')) || [];
    mensajes.push(messageData);
    localStorage.setItem('chatMessages', JSON.stringify(mensajes));
}

// Función para cargar los mensajes desde localStorage
function cargarMensajes() {
    const mensajes = JSON.parse(localStorage.getItem('chatMessages')) || [];
    mensajes.forEach(mensaje => mostrarMensaje(mensaje));
}

// Función para mostrar el mensaje en el contenedor
function mostrarMensaje({ nickname, message }) {
    const messagesContainer = document.getElementById('messages');
    const messageElement = document.createElement('div');
    messageElement.textContent = `${nickname}: ${message}`;
    messagesContainer.appendChild(messageElement);
}
