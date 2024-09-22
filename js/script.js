const teams = {
    'Grupo A': {
        'Manu/Jaime': { points: 0, played: 0, wins: 0, losses: 0, setDifference: 0 },
        'Sergio/David': { points: 0, played: 0, wins: 0, losses: 0, setDifference: 0 },
        'Peri/Raico': { points: 0, played: 0, wins: 0, losses: 0, setDifference: 0 },
        'Mario/Carlos': { points: 0, played: 0, wins: 0, losses: 0, setDifference: 0 }
    },
    'Grupo B': {
        'Angelo/J.Luis': { points: 0, played: 0, wins: 0, losses: 0, setDifference: 0 },
        'Victor/Jaime': { points: 0, played: 0, wins: 0, losses: 0, setDifference: 0 },
        'Paco/Rafa': { points: 0, played: 0, wins: 0, losses: 0, setDifference: 0 },
        'David/Luis': { points: 0, played: 0, wins: 0, losses: 0, setDifference: 0 }
    },
    'Grupo C': {
        'Vissen/Sergio': { points: 0, played: 0, wins: 0, losses: 0, setDifference: 0 },
        'Juanan/Victor': { points: 0, played: 0, wins: 0, losses: 0, setDifference: 0 },
        'Adri/Javi': { points: 0, played: 0, wins: 0, losses: 0, setDifference: 0 }
    }
};

const matches = [
    { match: 'Manu/Jaime vs Sergio/David', group: 'Grupo A' },
    { match: 'Juanan/Victor vs Adri/Javi', group: 'Grupo C' },
    { match: 'Peri/Raico vs Mario/Carlos', group: 'Grupo A' },
    { match: 'Angelo/J.Luis vs Victor/Jaime', group: 'Grupo B' },
    { match: 'Paco/Rafa vs Victor/Jaime', group: 'Grupo B' },
    { match: 'Sergio/David vs Peri/Raico', group: 'Grupo A' },
    { match: 'Manu/Jaime vs Mario/Carlos', group: 'Grupo A' },
    { match: 'Angelo/J.Luis vs Paco/Rafa', group: 'Grupo B' },
    { match: 'Adri/Javi vs Vissen/Sergio', group: 'Grupo C' },
    { match: 'David/Luis vs Victor/Jaime', group: 'Grupo B' },
    { match: 'Peri/Raico vs Manu/Jaime', group: 'Grupo A' },
    { match: 'Mario/Carlos vs Sergio/David', group: 'Grupo A' },
    { match: 'Angelo/J.Luis vs David/Luis', group: 'Grupo B' },
    { match: 'Juanan/Victor vs Vissen/Sergio', group: 'Grupo C' },
    { match: '(Partido Aplazado)', group: '' },
    { match: '(Partido Aplazado)', group: '' },
    { match: '(Partido Aplazado)', group: '' },
    { match: '', group: '' }
];

let currentMatchIndex = 0;

function populateMatchDetails() {
    const matchInfo = matches[currentMatchIndex];
    if (!matchInfo) return;

    const matchDisplay = document.getElementById('current-match');
    matchDisplay.innerHTML = `
        <h2>Partido Actual</h2>
        <div class="match-details">
            <p>${matchInfo.match}</p>
            ${matchInfo.match !== '(Partido Aplazado)' ? `
            <div class="score-controls" style="text-align: center;">
                <label for="team1-score">Marcador ${matchInfo.match.split(' vs ')[0]}:</label>
                <select id="team1-score">
                    <option value="0">0</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                </select>
                <span> - </span>
                <label for="team2-score">Marcador ${matchInfo.match.split(' vs ')[1]}:</label>
                <select id="team2-score">
                    <option value="0">0</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                </select>
            </div>` : ''}
            <div class="button-group" style="text-align: center;">
                ${matchInfo.match !== '(Partido Aplazado)' ? `
                <button id="submit-result">Registrar Resultado</button>` : ''}
                <button id="postpone-match" class="postpone-button">Marcar Partido Aplazado</button>
            </div>
        </div>
    `;

    document.getElementById('submit-result')?.addEventListener('click', registerResult);
    document.getElementById('postpone-match').addEventListener('click', markMatchAsPostponed);
}

function registerResult() {
    const matchInfo = matches[currentMatchIndex];
    if (!matchInfo) return;

    const score1 = parseInt(document.getElementById('team1-score')?.value || 0);
    const score2 = parseInt(document.getElementById('team2-score')?.value || 0);

    if (isNaN(score1) || isNaN(score2)) {
        alert('Por favor, ingresa un marcador válido.');
        return;
    }

    const [team1, team2] = matchInfo.match.split(' vs ');
    updateResults(team1, team2, score1, score2);

    currentMatchIndex++;
    if (currentMatchIndex < matches.length) {
        populateMatchDetails();
    } else {
        document.getElementById('current-match').innerHTML = '<p>Todos los partidos han sido registrados.</p>';
    }

    updateTables();
}

function updateResults(team1, team2, score1, score2) {
    const group = findGroupForMatch(`${team1} vs ${team2}`);

    if (!group) return;

    const teamsGroup = teams[group];

    teamsGroup[team1].played++;
    teamsGroup[team2].played++;

    if (score1 > score2) {
        teamsGroup[team1].wins++;
        teamsGroup[team2].losses++;
        teamsGroup[team1].points += 3;
    } else if (score1 < score2) {
        teamsGroup[team2].wins++;
        teamsGroup[team1].losses++;
        teamsGroup[team2].points += 3;
    } else {
        teamsGroup[team1].points += 1;
        teamsGroup[team2].points += 1;
    }

    teamsGroup[team1].setDifference += (score1 - score2);
    teamsGroup[team2].setDifference += (score2 - score1);
}

function findGroupForMatch(match) {
    const matchInfo = matches.find(m => m.match === match);
    return matchInfo ? matchInfo.group : null;
}

function updateTables() {
    const groupTables = {
        'Grupo A': document.getElementById('group-a-table'),
        'Grupo B': document.getElementById('group-b-table'),
        'Grupo C': document.getElementById('group-c-table')
    };

    Object.keys(groupTables).forEach(group => {
        const table = groupTables[group];
        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';

        const sortedTeams = Object.keys(teams[group]).sort((a, b) => {
            const teamA = teams[group][a];
            const teamB = teams[group][b];
            if (teamA.points !== teamB.points) return teamB.points - teamA.points;
            return teamB.setDifference - teamA.setDifference;
        });

        sortedTeams.forEach(teamName => {
            const team = teams[group][teamName];
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${teamName}</td>
                <td>${team.points}</td>
                <td>${team.played}</td>
                <td>${team.wins}</td>
                <td>${team.losses}</td>
                <td>${team.setDifference}</td>
            `;

            tbody.appendChild(row);
        });
    });
}

function markMatchAsPostponed() {
    const matchInfo = matches[currentMatchIndex];
    if (!matchInfo) return;

    matchInfo.match = '(Partido Aplazado)';
    currentMatchIndex++;

    if (currentMatchIndex < matches.length) {
        populateMatchDetails();
    } else {
        document.getElementById('current-match').innerHTML = '<p>Todos los partidos han sido registrados.</p>';
    }
}

document.getElementById('reset-classification').addEventListener('click', () => {
    Object.keys(teams).forEach(group => {
        Object.keys(teams[group]).forEach(team => {
            teams[group][team] = { points: 0, played: 0, wins: 0, losses: 0, setDifference: 0 };
        });
    });

    currentMatchIndex = 0;
    populateMatchDetails();
    updateTables();
});

// Inicializar
populateMatchDetails();
updateTables();

function openModal(player) {
    var modal = document.getElementById('modal-' + player);
    var playerPhoto = document.querySelector('img[alt="' + player + '"]');
    
    // Calculamos la posición del modal basado en la foto del jugador
    var rect = playerPhoto.getBoundingClientRect();
    modal.style.left = (rect.right + window.scrollX) + 'px';
    modal.style.top = (rect.top + window.scrollY) + 'px';
    modal.style.display = 'block';
}

function closeModal(player) {
    var modal = document.getElementById('modal-' + player);
    modal.style.display = 'none';
}

// Cierra el modal cuando se hace clic fuera de él
window.onclick = function(event) {
    var modals = document.querySelectorAll('.modal');
    modals.forEach(function(modal) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    });
};
