const teams = {
    'Grupo A': {
        'Manu/Jaime': { points: 0, played: 0, wins: 0, losses: 0, setDifference: 0, players: 'Manu, Jaime' },
        'Sergio/David': { points: 0, played: 0, wins: 0, losses: 0, setDifference: 0, players: 'Sergio, David' },
        'Peri/Raico': { points: 0, played: 0, wins: 0, losses: 0, setDifference: 0, players: 'Peri, Raico' },
        'Mario/Carlos': { points: 0, played: 0, wins: 0, losses: 0, setDifference: 0, players: 'Mario, Carlos' }
    },
    'Grupo B': {
        'Angelo/J.Luis': { points: 0, played: 0, wins: 0, losses: 0, setDifference: 0, players: 'Angelo, J.Luis' },
        'Victor/Jaime': { points: 0, played: 0, wins: 0, losses: 0, setDifference: 0, players: 'Victor, Jaime' },
        'Paco/Rafa': { points: 0, played: 0, wins: 0, losses: 0, setDifference: 0, players: 'Paco, Rafa' },
        'David/Luis': { points: 0, played: 0, wins: 0, losses: 0, setDifference: 0, players: 'David, Luis' }
    },
    'Grupo C': {
        'Vissen/Sergio': { points: 0, played: 0, wins: 0, losses: 0, setDifference: 0, players: 'Vissen, Sergio' },
        'Juanan/Victor': { points: 0, played: 0, wins: 0, losses: 0, setDifference: 0, players: 'Juanan, Victor' },
        'Adri/Javi': { points: 0, played: 0, wins: 0, losses: 0, setDifference: 0, players: 'Adri, Javi' }
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
    { match: 'Juanan/Victor vs Vissen/Sergio', group: 'Grupo C' }
];

let currentMatchIndex = 0;

// Populate match selector dropdown
function populateMatchSelector() {
    const matchSelector = document.getElementById('match-selector');
    matches.forEach((match, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = match.match;
        matchSelector.appendChild(option);
    });

    matchSelector.addEventListener('change', (e) => {
        currentMatchIndex = parseInt(e.target.value);
        populateMatchDetails();
    });
}

function populateMatchDetails() {
    const matchInfo = matches[currentMatchIndex];
    if (!matchInfo) return;

    const matchDisplay = document.getElementById('current-match');
    matchDisplay.innerHTML = `
        <h2>Partido Actual</h2>
        <div class="match-details">
            <p>${matchInfo.match}</p>
            <div class="score-controls" style="text-align: center;">
                <label for="team1-set1">Set 1 ${matchInfo.match.split(' vs ')[0]}:</label>
                <input type="number" id="team1-set1" min="0" max="6" value="0">
                <span> - </span>
                <label for="team2-set1">Set 1 ${matchInfo.match.split(' vs ')[1]}:</label>
                <input type="number" id="team2-set1" min="0" max="6" value="0">
                <br>
                <label for="team1-set2">Set 2 ${matchInfo.match.split(' vs ')[0]}:</label>
                <input type="number" id="team1-set2" min="0" max="6" value="0">
                <span> - </span>
                <label for="team2-set2">Set 2 ${matchInfo.match.split(' vs ')[1]}:</label>
                <input type="number" id="team2-set2" min="0" max="6" value="0">
                <br>
                <label for="team1-set3">Set 3 ${matchInfo.match.split(' vs ')[0]}:</label>
                <input type="number" id="team1-set3" min="0" max="6" value="0">
                <span> - </span>
                <label for="team2-set3">Set 3 ${matchInfo.match.split(' vs ')[1]}:</label>
                <input type="number" id="team2-set3" min="0" max="6" value="0">
            </div>
            <button onclick="submitScore()">Registrar Resultado</button>
        </div>
    `;
}

function submitScore() {
    const matchInfo = matches[currentMatchIndex];
    const team1 = matchInfo.match.split(' vs ')[0];
    const team2 = matchInfo.match.split(' vs ')[1];

    const team1Sets = [
        parseInt(document.getElementById('team1-set1').value),
        parseInt(document.getElementById('team1-set2').value),
        parseInt(document.getElementById('team1-set3').value)
    ];
    const team2Sets = [
        parseInt(document.getElementById('team2-set1').value),
        parseInt(document.getElementById('team2-set2').value),
        parseInt(document.getElementById('team2-set3').value)
    ];

    const team1SetWins = team1Sets.filter(set => set > team2Sets[team1Sets.indexOf(set)]).length;
    const team2SetWins = team2Sets.filter(set => set > team1Sets[team2Sets.indexOf(set)]).length;

    updateStandings(team1, team1SetWins, team2SetWins);
    updateStandings(team2, team2SetWins, team1SetWins);
}

function updateStandings(team, wonSets, lostSets) {
    let teamData = findTeamData(team);

    if (teamData) {
        teamData.played += 1;
        teamData.setDifference += (wonSets - lostSets);
        if (wonSets > lostSets) {
            teamData.wins += 1;
            teamData.points += 3;
        } else {
            teamData.losses += 1;
        }
        renderStandings();
    }
}

function findTeamData(teamName) {
    for (let group in teams) {
        if (teams[group][teamName]) {
            return teams[group][teamName];
        }
    }
    return null;
}

function renderStandings() {
    ['group-a-table', 'group-b-table', 'group-c-table'].forEach(tableId => {
        const tableBody = document.getElementById(tableId).querySelector('tbody');
        tableBody.innerHTML = '';
    });

    for (let group in teams) {
        const groupTableBody = document.getElementById(`group-${group.split(' ')[1].toLowerCase()}-table`).querySelector('tbody');
        for (let team in teams[group]) {
            const teamData = teams[group][team];
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${team}</td>
                <td>${teamData.players}</td>
                <td>${teamData.points}</td>
                <td>${teamData.played}</td>
                <td>${teamData.wins}</td>
                <td>${teamData.losses}</td>
                <td>${teamData.setDifference}</td>
            `;
            groupTableBody.appendChild(row);
        }
    }
}

window.onload = function() {
    populateMatchSelector();
    populateMatchDetails();
    renderStandings();
};
