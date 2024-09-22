document.addEventListener("DOMContentLoaded", function() {
    const currentMatch = document.getElementById('current-match');
    currentMatch.textContent = "Partido actual: Mario / Carlos vs Peri / Raico";

    // Cargar resultados del localStorage
    loadResults();
});

const defaultResults = [
    { player: "Mario / Carlos", points: 0, played: 0, won: 0, lost: 0, setDiff: 0, group: 'A' },
    { player: "Peri / Raico", points: 0, played: 0, won: 0, lost: 0, setDiff: 0, group: 'A' },
    { player: "Jaime / Manu", points: 0, played: 0, won: 0, lost: 0, setDiff: 0, group: 'A' },
    { player: "Sergio / David", points: 0, played: 0, won: 0, lost: 0, setDiff: 0, group: 'A' },
    { player: "Angelo / Jose Luis", points: 0, played: 0, won: 0, lost: 0, setDiff: 0, group: 'B' },
    { player: "David / Luis", points: 0, played: 0, won: 0, lost: 0, setDiff: 0, group: 'B' },
    { player: "Paco / Rafa", points: 0, played: 0, won: 0, lost: 0, setDiff: 0, group: 'B' },
    { player: "Victor / Jaime", points: 0, played: 0, won: 0, lost: 0, setDiff: 0, group: 'B' },
    { player: "Vissen / Sergio", points: 0, played: 0, won: 0, lost: 0, setDiff: 0, group: 'C' },
    { player: "Adri / Javi", points: 0, played: 0, won: 0, lost: 0, setDiff: 0, group: 'C' },
    { player: "Juanan / Victor", points: 0, played: 0, won: 0, lost: 0, setDiff: 0, group: 'C' }
];

document.addEventListener('DOMContentLoaded', () => {
    const groupABody = document.getElementById('group-a-body');
    const groupBBody = document.getElementById('group-b-body');
    const groupCBody = document.getElementById('group-c-body');

    function populateTable(groupBody, groupResults) {
        groupBody.innerHTML = ''; // Limpiar la tabla antes de llenarla
        groupResults.forEach(result => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${result.player}</td>
                <td>${result.points}</td>
                <td>${result.played}</td>
                <td>${result.won}</td>
                <td>${result.lost}</td>
                <td>${result.setDiff}</td>
            `;
            groupBody.appendChild(row);
        });
    }

    function loadResults() {
        const savedResults = JSON.parse(localStorage.getItem('tournamentResults'));
        const results = savedResults || defaultResults;

        // Ordenar los resultados por puntos y juegos jugados
        results.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            return a.setDiff - b.setDiff; // Menos diferencia de sets es mejor
        });

        populateTable(groupABody, results.filter(r => r.group === 'A'));
        populateTable(groupBBody, results.filter(r => r.group === 'B'));
        populateTable(groupCBody, results.filter(r => r.group === 'C'));
    }

    // Actualizar y guardar resultados
    document.getElementById('submit-result').addEventListener('click', () => {
        const player1 = document.getElementById('player1').value;
        const player2 = document.getElementById('player2').value;
        const score1 = parseInt(document.getElementById('score1').value) || 0;
        const score2 = parseInt(document.getElementById('score2').value) || 0;

        const results = JSON.parse(localStorage.getItem('tournamentResults')) || defaultResults;

        const playerData1 = results.find(r => r.player === player1);
        const playerData2 = results.find(r => r.player === player2);

        if (!playerData1 || !playerData2) {
            alert("Ambos jugadores deben ser válidos.");
            return;
        }

        if (playerData1.group !== playerData2.group) {
            alert("Los jugadores deben pertenecer al mismo grupo.");
            return;
        }

        if (player1 && player2) {
            const matchResult = [{ player: player1, score: score1 }, { player: player2, score: score2 }];

            matchResult.forEach(match => {
                const playerData = results.find(r => r.player === match.player);
                if (playerData) {
                    playerData.played++;
                    playerData.setDiff += match.score; // Suponiendo que se acumulan los puntos de sets
                    if (match.score > score2) {
                        playerData.won++;
                        playerData.points += 3; // 3 puntos por victoria
                    } else if (match.score < score1) {
                        playerData.lost++;
                    } else {
                        playerData.points += 1; // 1 punto por empate
                    }
                }
            });

            localStorage.setItem('tournamentResults', JSON.stringify(results));
            loadResults(); // Recargar la tabla con los resultados actualizados
        } else {
            alert("Por favor, ingresa los nombres de ambos jugadores.");
        }
    });

    // Botón para borrar el último resultado
    document.getElementById('clear-results').addEventListener('click', () => {
        const adminKey = prompt("Introduce la clave de administrador:");
        if (adminKey === "981") { // Cambia "981" por la clave real
            const results = JSON.parse(localStorage.getItem('tournamentResults')) || defaultResults;

            if (results.length > 0) {
                results.pop(); // Borra el último resultado
                localStorage.setItem('tournamentResults', JSON.stringify(results));
                loadResults(); // Recargar la tabla con los resultados actualizados
                alert('Último resultado borrado exitosamente.');
            } else {
                alert('No hay resultados para borrar.');
            }
        } else {
            alert('Clave de administrador incorrecta.');
        }
    });
});
