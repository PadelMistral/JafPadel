// Lista de participantes
const participantes = [
    "Partido Aplazado", "Mario / Carlos", "Peri / Raico", "Adri / Javi", "Juanan / Victor", 
    "Angelo / Jose Luis", "David / Luis", "Paco / Rafa", "DavidM / SergioM",
    "Vissen / Sergio", "Jaime / Manu", "Victor / Jaime"  
];

// Horarios de los partidos
const horariosDia1 = ["16:00", "17:15", "18:20", "19:30", "20:40"];
const horariosDia2 = ["9:30", "10:40", "11:50", "13:00", "16:00", "17:15", "18:20", "19:30", "20:40"];
const horariosDia3 = ["9:30", "10:40", "11:50", "13:00", "16:00", "17:15", "18:20", "19:30", "20:40"];

// Función para generar select con participantes
function generarSelect(value) {
    const select = document.createElement('select');
    participantes.forEach(participante => {
        const option = document.createElement('option');
        option.textContent = participante;
        if (participante === value) {
            option.selected = true;
        }
        select.appendChild(option);
    });
    return select;
}

// Función para generar una fila de partido
function generarFila(hora, diaId) {
    const fila = document.createElement('tr');

    const tdHora = document.createElement('td');
    tdHora.className = 'time';
    tdHora.textContent = hora;

    const tdPartido = document.createElement('td');
    const select1 = generarSelect();
    const select2 = generarSelect();
    tdPartido.appendChild(select1);
    tdPartido.appendChild(document.createTextNode(' vs '));
    tdPartido.appendChild(select2);

    const tdAcciones = document.createElement('td');
    const btnFijar = document.createElement('button');
    btnFijar.textContent = 'Confirmar';
    const btnBorrar = document.createElement('button');
    btnBorrar.textContent = 'Borrar';

    btnFijar.onclick = () => fijarPartido(tdPartido, select1, select2, hora, diaId);
    btnBorrar.onclick = () => borrarPartido(tdPartido, hora, diaId);

    tdAcciones.appendChild(btnFijar);
    tdAcciones.appendChild(btnBorrar);

    fila.appendChild(tdHora);
    fila.appendChild(tdPartido);
    fila.appendChild(tdAcciones);

    document.querySelector(`#${diaId} table tbody`).appendChild(fila);

    // Cargar partido desde localStorage si existe
    cargarPartido(tdPartido, hora, diaId);
}

// Función para fijar partido
function fijarPartido(tdPartido, select1, select2, hora, diaId) {
    const jugador1 = select1.value;
    const jugador2 = select2.value;
    tdPartido.innerHTML = `${jugador1} vs ${jugador2}`;

    // Guardar en localStorage
    guardarPartido(hora, diaId, jugador1, jugador2);
}

// Función para borrar partido
function borrarPartido(tdPartido, hora, diaId) {
    tdPartido.innerHTML = `${generarSelect().outerHTML} vs ${generarSelect().outerHTML}`;

    // Borrar de localStorage
    localStorage.removeItem(`${diaId}-${hora}`);
}

// Función para guardar el partido en localStorage
function guardarPartido(hora, diaId, jugador1, jugador2) {
    localStorage.setItem(`${diaId}-${hora}`, JSON.stringify({ jugador1, jugador2 }));
}

// Función para cargar el partido desde localStorage
function cargarPartido(tdPartido, hora, diaId) {
    const partidoGuardado = localStorage.getItem(`${diaId}-${hora}`);
    if (partidoGuardado) {
        const { jugador1, jugador2 } = JSON.parse(partidoGuardado);
        tdPartido.innerHTML = `${jugador1} vs ${jugador2}`;
    }
}

// Generar partidos dinámicamente para Día 1
horariosDia1.forEach(hora => generarFila(hora, 'dia1'));
// Generar partidos dinámicamente para Día 2
horariosDia2.forEach(hora => generarFila(hora, 'dia2'));
// Generar partidos dinámicamente para Día 3
horariosDia3.forEach(hora => generarFila(hora, 'dia3'));
