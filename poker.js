
// seedrandom('123', { global: true });

var suits = ['H', 'D', 'S', 'C'];
var ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const handTypes = ["Invalid", "High Card", "One Pair", "Two Pair", "Three of a Kind", "Straight", "Flush", "Full House", "Four of a Kind", "Straight Flush"];

function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

function getHandType(score) {
  let firstDigit = Math.floor(score / 0x10000);
  return handTypes[firstDigit];
}

function mergeSidePots(pots) {
  let mergedPotsMap = new Map();

  pots.forEach(pot => {
    let key = pot.eligiblePlayers.map(p => p.name).toString();
    // console.log('key:', key)
    let existingPot = mergedPotsMap.get(key);

    if (existingPot) {
      // If a pot with the same eligible players exists, add the current pot's amount
      existingPot.amount += pot.amount;
    } else {
      // Otherwise, add the current pot to the map
      mergedPotsMap.set(key, { amount: pot.amount, eligiblePlayers: pot.eligiblePlayers.slice() });
    }
  });

  // Convert the Map values back to an array
  return Array.from(mergedPotsMap.values());
}

class Card {
  constructor(suit, rank) {
    this.suit = suit;
    this.rank = rank === 14 ? 0 : rank;
    this.toString = () => `${ranks[this.rank]}${suits[this.suit]}`;
  }
}

class Deck {
  constructor() {
    this.cards = [];
    this.populate();
    this.shuffle();
  }

  populate() {
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 12; j++) {
        let card = new Card(i, j);
        this.cards.push(card);
      }
    }
  }

  shuffle() {
    // Shuffle the deck.
    shuffle(this.cards);
  }

  draw() {
    return this.cards.pop();
  }
}

class Player {
  constructor(name, chips) {
    this.name = name;
    this.chips = chips;
    this.hand = [];
    this.allIn = false;
    this.folded = false;
    this.bet = 0;
    this.actedInBetRound = false;
    this.table = null;
  }
}

class Table {
  constructor(players, smallBlind, bigBlind) {
    this.deck = new Deck();
    this.players = players;
    this.currentPlayerIndex = 0;
    this.smallBlind = smallBlind;
    this.bigBlind = bigBlind;
    this.dealerPosition = null
    this.communityCards = [];
    this.currentBet = 0; // the highest bet on the table which all players must match
    this.lastBet = 0; // the previous bet or raise that any raise must at least match
    this.sidePots = [];
    // assign the table property of each player to this table
    this.players.forEach(player => {
      player.table = this;
    });
    this.gameLog = ''
  }

  log(message) {
    console.log(message)
    this.gameLog += message + '\n'
  }

  getState() {
    return {
      players: this.players.map(p => p.name),
      currentPlayerIndex: this.currentPlayerIndex,
      currentPlayerHand: this.players[this.currentPlayerIndex].hand.map(c => c.toString()),
      dealerPosition: this.dealerPosition,
      communityCards: this.communityCards,
      currentBet: this.currentBet,
      lastBet: this.lastBet,
      sidePots: this.sidePots,
    };
  }

  getStateText() {
    return `
      Current player: ${this.players[this.currentPlayerIndex].name}`
  }

  fold() {
    let player = this.players[this.currentPlayerIndex];

    player.folded = true;
    player.actedInBetRound = true;
    this.log(`Player ${player.name} [${player.chips}] folded, current bet ${player.bet}.`);

    this.nextPlayer();
  }

  placeBet(bet) {
    let player = this.players[this.currentPlayerIndex];

    let betType = null; // raise, call, fold, allIn

    // Ensure player has enough chips.
    if (player.chips < bet || bet < 0 || isNaN(bet)) {
      throw new Error('Invalid bet amount.');
    }

    // If it's a check (bet of 0)
    if (bet === 0) {
      betType = 'check';
      if (this.currentBet && player.bet !== this.currentBet) {
        throw new Error(`Check is not allowed, player must at least match the highest bet (${player.bet} != ${this.currentBet})`);
      }
    } else { // If bet is not zero
      if (bet === player.chips) {
        betType = 'allIn';
      } else if (player.bet + bet === this.currentBet) {
        betType = 'call';
      } else { // we must be trying to raise
        // Raise amount must at least match the previous bet or raise
        if (player.bet + bet < this.currentBet + this.lastBet) {
          throw new Error("Raise amount less than the previous bet or raise");
        }
        betType = 'raise';
      }
    }

    if (player.chips === bet) {
      player.allIn = true;
    }

    player.chips -= bet;
    player.bet += bet;
    this.lastBet = bet;
    player.actedInBetRound = true;

    this.log(`Player ${player.name} [${player.chips}] ${betType} with ${bet} chips, current bet ${player.bet}.`);

    if (player.bet > this.currentBet) {
      this.currentBet = player.bet;
      this.lastRaiser = player;
    }

    this.nextPlayer();
  }

  startRound(dealerPosition = 0) {

    this.dealerPosition = dealerPosition;

    this.log(`starting new round with dealer ${this.players[dealerPosition].name}`)

    // Reset relevant game state for the new round
    this.players.forEach(player => {
      player.hand = [];
      player.bet = 0;
      player.allIn = false;
      player.folded = false;
      player.actedInBetRound = false;
    });
    this.sidePots = [];
    this.currentBet = 0;
    this.lastBet = 0;
    this.lastRaiser = null;
    this.currentPlayerIndex = 0;
    this.deck = new Deck();

    // Deal two cards to each player
    this.players.forEach(player => {
      player.hand.push(this.deck.draw());
      player.hand.push(this.deck.draw());
      this.log(`${player.name} dealt ${player.hand.join(', ')}`)
    });

    // The player to the left of the dealer is the small blind
    this.currentPlayerIndex = dealerPosition;
    this.currentPlayerIndex = this.getNextPlayerIndex(this.currentPlayerIndex);
    let smallBlindPosition = this.currentPlayerIndex;
    let smallBlind = this.players[smallBlindPosition];
    if (smallBlind.chips <= this.smallBlind) {
      smallBlind.allIn = true;
      smallBlind.bet = smallBlind.chips;
      smallBlind.chips = 0;
    } else {
      smallBlind.bet = this.smallBlind;
      smallBlind.chips -= this.smallBlind;
    }
    this.log(`Player ${smallBlind.name} [${smallBlind.chips}] placed a small blind of of ${this.smallBlind} chips.`);

    // The player to the left of the small blind is the big blind
    this.currentPlayerIndex = this.getNextPlayerIndex(this.currentPlayerIndex);
    let bigBlindPosition = this.currentPlayerIndex;
    let bigBlind = this.players[bigBlindPosition];
    if (bigBlind.chips <= this.bigBlind) {
      bigBlind.allIn = true;
      bigBlind.bet = bigBlind.chips;
      bigBlind.chips = 0;
    } else {
      bigBlind.bet = this.bigBlind;
      bigBlind.chips -= this.bigBlind;
    }
    this.log(`Player ${bigBlind.name} [${bigBlind.chips}] placed a big blind of of ${this.bigBlind} chips.`);

    // The last bet is the big blind
    this.currentBet = this.bigBlind;
    this.lastBet = this.bigBlind;
    this.lastRaiser = bigBlind;
    this.currentPlayerIndex = bigBlindPosition;

    // Move to the next player until we find one who is still active.
    this.nextPlayer();
  }

  endBettingRound() {
    this.log(`ending betting round with current high bet ${this.currentBet}`)

    // Sort players by bet amount, from lowest to highest
    let sortedPlayers = [...this.players].sort((a, b) => a.bet - b.bet);

    while (sortedPlayers.length > 0) {
      let player = sortedPlayers.shift(); // Take the player with the lowest bet
      let bet = player.bet; // Get that player's bet amount
      if (bet <= 0) continue; // If bet is zero, skip to the next player

      [player, ...sortedPlayers].forEach(p => {
        p.bet -= bet; // Everyone spends this player's bet amount
      });

      // Create a pot for this bet amount
      let pot = {
        amount: bet * (sortedPlayers.length + 1), // Each player adds this bet amount to the pot
        eligiblePlayers: [player, ...sortedPlayers].filter(p => !p.folded) // Eligible players are the ones who haven't folded
      };

      this.sidePots.push(pot);
    }

    this.sidePots = mergeSidePots(this.sidePots);

    for (let i = 0; i < this.sidePots.length; i++) {
      this.log(`sidepot ${i}: ${this.sidePots[i].amount} ${this.sidePots[i].eligiblePlayers.map(p => p.name).join(', ')}`)
    }

    // Determine how many cards to deal based on community card count
    let cardsToDeal;
    let doShowdown = false;
    if (this.communityCards.length === 0) { // (flop)
      cardsToDeal = 3;
    } else if (this.communityCards.length < 5) { // (turn, river)
      cardsToDeal = 1;
    } else if (this.communityCards.length == 5) {
      doShowdown = true;
    }

    // Deal the community cards
    if (cardsToDeal) {
      for (let i = 0; i < cardsToDeal; i++) {
        this.communityCards.push(this.deck.draw());
      }
    }

    this.log('Community cards:', this.communityCards.map(card => card.toString()).join(', '));

    // Reset state for next betting round
    this.currentBet = 0;
    this.lastRaiser = this.players[this.dealerPosition];
    this.players.forEach(player => {
      player.actedInBetRound = false;
    });

    // If we've dealt all community cards, it's time for the showdown
    if (doShowdown) {
      this.showdown();
    } else {

      // The player next to the dealer is the first to act in the next betting round
      this.currentPlayerIndex = this.dealerPosition;
      this.currentPlayerIndex = this.getNextPlayerIndex(this.currentPlayerIndex);
    }
  }

  getNextPlayerIndex(startIndex) {
    // Check if there is a next player who can act
    if (this.players.filter(p => !(p.folded || p.allIn || (p.actedInBetRound && p.bet == this.currentBet))) <= 1) {
      // If no player can act, return null
      return null;
    }

    let index = startIndex;

    do {
      index = (index + 1) % this.players.length;
    } while (this.players[index].chips <= 0 || this.players[index].folded || this.players[index].allIn);

    return index;
  }

  nextPlayer() {
    this.currentPlayerIndex = this.getNextPlayerIndex(this.currentPlayerIndex);

    if (this.currentPlayerIndex === null) {
      this.endBettingRound();
    }
  }

  showdown() {
    this.log("##SHOWDOWN")

    let pots = mergeSidePots(this.sidePots)

    for (let pot of pots) {
      let highestScore = 0;
      let winners = [];

      // remove folded players from this side pot
      let eligiblePlayers = pot.eligiblePlayers.filter(p => !p.folded);

      for (let player of eligiblePlayers) {
        let scored = scoreHand(player.hand.concat(this.communityCards))
        let score = scored.score;
        let hand = scored.hand.map(card => new Card(card.suit, card.rank))
        this.log(`${player.name}: ${hand} ${getHandType(score)} (0x${score.toString(16)})`);

        if (score > highestScore) {
          highestScore = score;
          winners = [player];
        } else if (score === highestScore) {
          winners.push(player);
        }
      }

      let winnings = pot.amount / winners.length;

      winners.forEach(winner => {
        winner.chips += winnings;
      });

      this.log('winners:', winners.map(p => p.name));
    }

    // Reset pots
    this.sidePots = [];

    this.startRound((this.dealerPosition + 1) % this.players.length);
  }

  gameResult() {
    // Creating a new array of players for the result, with the player data we want to expose
    let playerResults = this.players.map(player => {
      return {
        name: player.name,
        chips: player.chips,
        allIn: player.allIn,
        folded: player.folded
      };
    });

    // Generating a result object
    let result = {
      players: playerResults,
      totalRounds: this.roundNumber,
      pots: this.sidePots.map(pot => {
        return {
          amount: pot.amount,
          players: pot.eligiblePlayers.map(player => player.name) // Exposing only player names, not entire player objects
        };
      }),
    };

    // Returning result as a JSON string
    return JSON.stringify(result, null, 2);
  }

  simulateOdds(numSimulations) {
    // Number of times each player wins
    let wins = new Array(this.players.length).fill(0);

    for (let i = 0; i < numSimulations; i++) {
      let shuffledDeck = shuffle([...this.deck.cards]);  // Copy cards from the deck and shuffle them

      // Draw community cards
      let cardsNeeded = 5 - this.communityCards.length;
      let newCommunityCards = shuffledDeck.splice(-cardsNeeded, cardsNeeded);
      let communityHand = this.communityCards.concat(newCommunityCards);

      // Combine player's cards with community cards
      let hands = this.players.map(player => {
        return player.hand.concat(communityHand);
      });

      // Determine winner
      let scores = hands.map(h => scoreHand(h).score);
      let maxScore = Math.max(...scores);
      let winnersIndices = scores.reduce((indices, score, i) => score === maxScore ? indices.concat(i) : indices, []);

      // Update win count
      winnersIndices.forEach(winnerIndex => {
        wins[winnerIndex]++
      });
    }

    // Convert win counts to probabilities
    let probabilities = wins.map(winCount => winCount / numSimulations);

    return probabilities;
  }
}

function combinations(array, k) {
  let results = [];
  if (k > array.length || k <= 0) {
    return results;
  }
  if (k === array.length) {
    return [array];
  }
  if (k === 1) {
    return array.map(e => [e]);
  }
  array.forEach((e, i) => {
    let rest = array.slice(i + 1);
    let combos = combinations(rest, k - 1);
    let attached = combos.map(c => [e, ...c]);
    results.push(...attached);
  });
  return results;
}

function scoreHand(hand) {

  let combos = combinations(hand, 5)

  let highCombos = combos.map((combo) => {
    return combo.map((card) => {
      return { rank: card.rank === 0 ? 13 : card.rank, suit: card.suit }
    })
  })

  // Try two possibilities for Ace: as 13 (high) and as 0 (low)
  allHands = [...combos, ...highCombos]

  let result = allHands.reduce((highest, hand5) => {

    let score = 0;

    hand5.sort((a, b) => b.rank - a.rank); // Sort cards by rank in descending order

    let ranks = hand5.map(card => card.rank); // Array of card ranks
    let suits = hand5.map(card => card.suit); // Array of card suits

    let uniqueRanks = [...new Set(ranks)]; // Unique ranks
    let counts = uniqueRanks.map(rank => ranks.filter(r => r === rank).length); // Count of each rank

    let hasFlush = suits.every(suit => suit === suits[0]); // All cards have same suit
    let hasStraight = uniqueRanks.length === 5 && uniqueRanks.every((rank, i, arr) => i === 0 || rank === arr[i - 1] - 1); // Five ranks in a row
    let indexOfFour = counts.indexOf(4);
    let indexOfThree = counts.indexOf(3);
    let indexOfPair = counts.indexOf(2);
    let indicesOfPairs = counts.reduce((indices, count, i) => count === 2 ? indices.concat(i) : indices, []);

    if (hasFlush && hasStraight) {  // Straight flush
      score = 0x90000 + ranks[0];
    }
    else if (indexOfFour !== -1) { // Four of a kind
      score = 0x80000 + (uniqueRanks[indexOfFour] * 0x01000) + (ranks.filter(rank => rank !== uniqueRanks[indexOfFour])[0] * 0x00100);
    }
    else if (indexOfThree !== -1 && indexOfPair !== -1) { // Full house
      score = 0x70000 + (uniqueRanks[indexOfThree] * 0x01000) + (uniqueRanks[indexOfPair] * 0x00100);
    }
    else if (hasFlush) { // Flush
      score = 0x60000 + (ranks.reduce((sum, rank) => sum + rank, 0) * 0x01000);
    }
    else if (hasStraight) { // Straight
      score = 0x50000 + (ranks[0] * 0x01000);
    }
    else if (indexOfThree !== -1) { // Three of a kind
      let kickers = ranks.filter(rank => rank !== uniqueRanks[indexOfThree]);
      score = 0x40000 + (uniqueRanks[indexOfThree] * 0x01000) + (kickers[0] * 0x00100) + (kickers[1] * 0x00010);
    }
    else if (indicesOfPairs.length === 2) { // Two pairs
      score = 0x30000 + (uniqueRanks[indicesOfPairs[0]] * 0x01000) + (uniqueRanks[indicesOfPairs[1]] * 0x00100) + (ranks.filter(rank => ![uniqueRanks[indicesOfPairs[0]], uniqueRanks[indicesOfPairs[1]]].includes(rank))[0] * 0x00010);
    }
    else if (indexOfPair !== -1) { // One pair
      let kickers = ranks.filter(rank => rank !== uniqueRanks[indexOfPair]);
      score = 0x20000 + (uniqueRanks[indexOfPair] * 0x01000) + (kickers[0] * 0x00100) + (kickers[1] * 0x00010) + (kickers[2] * 0x00001);
    }
    else { // High card
      score = 0x10000 + ranks[0] * 0x01000 + ranks[1] * 0x00100 + ranks[2] * 0x00010 + ranks[3] * 0x00001;
    }
    if (score > highest.score) {
      return { score, hand: hand5 };
    }
    return highest;

  }, { score: 0, hand: [] });

  return result;
}

module.exports = {Player, Table}