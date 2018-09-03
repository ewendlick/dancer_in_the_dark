const random = require('../lib/random')

const printOut = require('../lib/printOut') // DELETE, only used for testing a few things now
const chalk = require('chalk')

module.exports = class Players {
  // TODO: consider moving this to a Player class
  constructor () {
    this.players = [] // TODO: this isn't a const. rename
    this.ALLOWED_PLAYERS = [0, 1] // TODO: change this to an int
    this.turnCounter = 0
    this.defaultPlayerStats = {
      name: null,
      seenBgMap: null,
      seenItemMap: null,
      x: 1,
      y: 1,
      movesRemaining: 0,
      inventory: {
        arrows: 2,
        treasure: 0,
        traps: 1
      },
      status: {
        movement: 3,
        viewDistance: 3,
        stunned: 0 // turns until not stunned (unimplemented)
      }
    }
  }

  thisPlayersTurn () {
    return this.ALLOWED_PLAYERS[this.turnCounter % this.ALLOWED_PLAYERS.length]
  }

  nextPlayersTurn () {
    return this.ALLOWED_PLAYERS[(this.turnCounter + 1) % this.ALLOWED_PLAYERS.length]
  }

  addPlayer (socketId, seenBgMap, seenItemMap, x = 1, y = 1 ) {
    let playerStats = this.defaultPlayerStats
    // TODO: is there a better way of doing this?
    playerStats.seenBgMap = seenBgMap
    playerStats.seenItemMap = seenItemMap
    playerStats.name = random.name(true)
    playerStats.x = x
    playerStats.y = y
    this.players.push({ socketId: socketId, ...playerStats })
  }

  resetPlayers (x = 1, y = 1) {
    // TODO: DRY. This is looking a lot like addPlayer
    let playerStats = this.defaultPlayerStats
    // TODO: is there a better way of doing this?
    // playerStats.seenBgMap = seenBgMap
    playerStats.x = x
    playerStats.y = y
    this.players = this.players.map(player => {
      return { socketId: player.socketId, ...playerStats }
    })
  }

  removePlayer (socketId) {
    this.players = this.players.filter(player => {
      return player.socketId !== socketId
    })
  }

  acceptInput (socketId) {
    // Check if the socket.id is in the list. We only allow two players.
    // TODO: may need to reevaluate this: do we need to check if the socket id matches the first two players
    // if we are checking against players that are allowed to play?
    return this.players[1] !== undefined &&
      (socketId === this.players[0].socketId || socketId === this.players[1].socketId) &&
      this.players[this.thisPlayersTurn()].socketId === socketId
  }

  // TODO: would it make sense to store the socket.id of the player whose turn it is in here??
  playersTurn (socketId) {
    return this.thisPlayerIndex(socketId)
  }

  // TODO: allow multiple players to move at the same time
  // rename to startFirstPlayersTurn
  startPlayersTurn (socketId) {
    // Provide moves to a player
    this.players = this.players.map(player => {
      if (player.socketId === socketId) {
        player.movesRemaining = player.status.movement
      }
      return player
    })
  }

  playersMovesRemaining (socketId) {
    console.log(socketId + ' playersMovesRemaining: ' + this.thisPlayer(socketId).movesRemaining)
    return this.thisPlayer(socketId).movesRemaining
  }

  // TODO: how can we know if this succeeded??
  // Return true if move succeeded, false if not (like, they cannot move in a direction, or an action takes
  // too many move points)
  performMove (socketId, usedMovementPoints = 1) {
    // moves need to match up with the current player's turn (how do we handle multiple players going at once?
    // TODO: better variable names
    const currentMovesRemaining = this.playersMovesRemaining(socketId)
    const movesRemaining = currentMovesRemaining - usedMovementPoints

    // Insufficient moves
    if (movesRemaining < 0) {
      // TODO: how do we convey failure to move due to insufficient moves? Create a canMove(socketId, movementPoints) function?
      return false
    } else {

      // TODO: updating players should be a general function. This is so un-DRY
      this.players = this.players.map(player => {
        if (player.socketId === socketId) {
          console.log(socketId + ': movesRemaining=' + chalk.magenta(movesRemaining))
          player.movesRemaining = movesRemaining
        }
        return player
      })
      return true // TODO: ahhhhh, this will be difficult after moves can be more than 1
    }
  }

  // TODO: all players moved

  nextPlayersTurn (socketId) {
    if (this.thisPlayerIndex(socketId) + 1 >= this.playerCount()) {
      return 0
    } else {
      return this.thisPlayerIndex(socketId) + 1
    }
  }

  // TODO: come up with a name when these should be plural. I have "playersTurn" which is a possessive "player's" :/
  playersPublicInfo () {
    return this.players.map(player => {
      return { socketId: player.socketId, name: player.name }
    })
  }

  visiblePlayers (visibleMap) {
    // If a player is on a square that is not 0, display them
    return this.players.filter(player => {
      return visibleMap[player.y][player.x] !== 0
    })
  }

  // playerLocations () {
  //   return this.players.map(player => {
  //     return { x: player.x, y: player.y }
  //   })
  // }

  playersAt (x, y) {
    return this.players.filter(player => {
      // console.log('player: ' + player.x + ' ' + player.y + ' passed: ' + x + ' ' + y)
      return player.x === x && player.y === y
    })
  }

  // TODO: just pass in the map and split it inside of here? (Such a better idea now)
  updateSeenMap (socketId, visibleBgMap, visibleItemMap, fogOfWarMap) {
    // add the visiblemap to the particular player's seenBgMap
    // fog of war tiles are appended with.... what? '░'?
    // update anything that is not '0' (hidden)
    let seenBgMap = this.thisPlayer(socketId).seenBgMap
    let seenItemMap = this.thisPlayer(socketId).seenItemMap
    // console.log(seenBgMap)

    seenBgMap = seenBgMap.map((row, indexY) => {
      return row.map((itemX, indexX) => {
        if (visibleBgMap[indexY][indexX] !== '0') {
          return visibleBgMap[indexY][indexX]
        } else {
          return itemX
        }
      })
    })

    // TODO: combine all of these into the same loops? The map is always the same size
    seenItemMap = seenItemMap.map((row, indexY) => {
      return row.map((itemX, indexX) => {
        if (visibleItemMap[indexY][indexX] !== null) {
          return visibleItemMap[indexY][indexX]
        } else {
          return itemX
        }
      })
    })

    // TODO: can I do thisPlayer(socketId).seenBgMap = seenBgMap ? Try this later
    this.players[this.thisPlayerIndex(socketId)].seenBgMap = seenBgMap
    this.players[this.thisPlayerIndex(socketId)].seenItemMap = seenItemMap
    // TODO: Should another function be created to return this? --- YES
    // I am unsure about this all and wonder if I should just be returning
    // true/false and then setting up tests

    return { seenBgMap, seenItemMap, fogOfWarMap }
  }

  setRelativePosition (socketId, x, y) {
    const player = this.thisPlayer(socketId)
    player.x = player.x + x
    player.y = player.y + y
    this.players[this.thisPlayerIndex(socketId)] = player
  }

  // TODO: change to targetPlayer? playerById? currentPlayer?
  thisPlayer (socketId) {
    return this.players.find(player => {
      return player.socketId === socketId
    })
  }

  thisPlayerIndex (socketId) {
    return this.players.findIndex(player => {
      return player.socketId === socketId
    })
  }

  turnDone () {
    // Set the current player's turns to 0
    const currentTurnIndex = this.thisPlayersTurn()
    if (this.players[currentTurnIndex] === undefined) {
      return // This was called before we had enough players
    }
    this.players[currentTurnIndex].movesRemaining = 0
    this.turnCounter++
    // assign moves to the next player
    // I don't know if this should be broken into its own function or not, but one this is clear:
    // This all needs to have the entire process mapped out and thoroughly considered
    const nextTurnIndex = this.thisPlayersTurn()
    if (this.players[nextTurnIndex] === undefined) {
      return // The timer caused this to be called before we had enough players
    }
    this.players[nextTurnIndex].movesRemaining = this.players[nextTurnIndex].status.movement
  }

  // TODO: more generic function for adding and removing anything??
  addInventory (socketId, key, value) {
    this.players = this.players.map(player => {
      if (player.socketId === socketId) {
        player.inventory[key] += value
      }
      // TODO: is there a better way to do this?
      return player
    })
  }

  // TODO: more generic function for adding and removing anything??
  removeInventory (socketId, key, value) {
    this.players = this.players.map(player => {
      if (player.socketId === socketId) {
        player.inventory[key] -= value
      }
      // TODO: is there a better way to do this?
      return player
    })
  }


  // TODO: this is silly. We already have the thisPlayer function
  // TODO: delete this
  viewInventory (socketId, key) {
    // TODO: handle null, etc
    return this.players.find(player => {
      if (player.socketId === socketId) {
        return player
      }
    }).inventory[key]
  }

  // TODO: make DRY
  // viewStatus (socketId, key) {
  //   // TODO: handle null, etc
  //   return this.players.find(player => {
  //     if (player.socketId === socketId) {
  //       return player
  //     }
  //   }).status[key]
  // }

  // TODO: cannot name this length since it overwrites
  playerCount () {
    return this.players.length
  }

  // TODO: better name
  isEnoughPlayers () {
    return this.players.length >= this.ALLOWED_PLAYERS.length
  }
}
