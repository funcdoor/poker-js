const {Table, Player} = require('./poker.js')

// create some players
let players = [
  new Player('Alice', 2000),
  new Player('Bob', 2000),
  new Player('Charlie', 2000),
  new Player('Dave', 2000),
  new Player('Eve', 2000)
]

let t = new Table(players, 5, 10);

t.startRound(0);

// Small blind and big blind automatic


/*

t.placeBet(10)
t.placeBet(10)
t.placeBet(10)
t.placeBet(5)
t.placeBet(0)
console.log("##FLOP")
t.placeBet(0)
t.placeBet(0)
t.placeBet(20)
t.placeBet(200)
t.placeBet(200)
t.placeBet(200)
t.placeBet(200)
t.placeBet(180)
console.log("##TURN")
t.placeBet(0)
t.placeBet(1790)
t.fold(0)
t.fold(0)
t.placeBet(1790)
t.placeBet(500)
t.placeBet(500)
t.placeBet(500)
t.placeBet(500)
t.placeBet(500)

*/