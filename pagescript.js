function renderPlayer(player) {
  let cards = player.hand.map(card => card.toString()).join(', ');
  return `
        <h2>${player.name}</h2>
        <p>Chips: ${player.chips}</p>
        <p>Current Bet: ${player.bet}</p>
        <p>Hand: ${cards}</p>
        <p>Status: ${player.folded ? "Folded" : "Active"}</p>
        <p>Odds: ${Math.round(player.odds * 100)}%
    `;
}

function renderGame(table) {
  let communityCards = table.communityCards.map(card => card.toString()).join(', ');
  document.getElementById('communityCards').innerText = `Community Cards: ${communityCards}`;

  let odds = table.simulateOdds(1000);

  for (let i = 0; i < table.players.length; i++) {
    table.players[i].odds = odds[i];
    let playerDiv = document.getElementById(`player${i+1}`);
    playerDiv.innerHTML = renderPlayer(table.players[i]);

    // Highlight the active player
    if (i === table.currentPlayerIndex) {
      playerDiv.classList.add('active-player');
    } else {
      playerDiv.classList.remove('active-player');
    }
  }

  let currentPlayer = table.players[table.currentPlayerIndex].name;
  document.getElementById('currentPlayer').innerText = `${currentPlayer}'s turn`;

  logElement = document.getElementById('log');
  logElement.value = table.gameLog;
  logElement.scrollTop = logElement.scrollHeight;
}

// Set up the game
let players =
  [
    new Player('Alice', 1000),
    new Player('Bob', 1000),
    new Player('Carol', 1000),
    new Player('Dave', 1000),
    new Player('Eve', 1000)
  ]
let table = new Table(players, 5, 10);

table.startRound();
renderGame(table);

// Handle bet button
document.getElementById('betButton').addEventListener('click', () => {
  let amount = parseInt(document.getElementById('betAmount').value);
  try {
    table.placeBet(amount);
    document.getElementById('errorMessage').innerText = '';
  } catch (error) {
    document.getElementById('errorMessage').innerText = error.message;
  }
  document.getElementById('betAmount').value = '';
  renderGame(table);
});

// Handle fold button
document.getElementById('foldButton').addEventListener('click', () => {
  table.fold();
  document.getElementById('betAmount').value = ''; // Clear the betAmount input
  renderGame(table);
});

// Handle Enter key in betAmount input
document.getElementById('betAmount').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault(); // Prevent the default form submission behavior
    document.getElementById('betButton').click(); // Trigger the bet button click event
  }
});