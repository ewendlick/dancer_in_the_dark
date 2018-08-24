const random = require('../lib/random')

const printOut = require('../lib/printOut') // DELETE, only used for testing a few things now

module.exports = class Players {
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
        arrows: 2, // (umimplemented)
        treasure: 0 // (unimplemented)
      },
      status: {
        movement: 3, // unimplemented
        viewDistance: 3, // unimplemented
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

  addPlayer (id, seenBgMap, seenItemMap, x = 1, y = 1 ) {
    // console.log('--addPlayer')
    // console.log(seenBgMap)
    // TODO: possibly rename "id" to "socketId"
    let playerStats = this.defaultPlayerStats
    // TODO: is there a better way of doing this?
    playerStats.seenBgMap = seenBgMap
    playerStats.seenItemMap = seenItemMap
    playerStats.name = random.name(true)
    playerStats.x = x
    playerStats.y = y
    this.players.push({ id, ...playerStats })
  }

  resetPlayers (x = 1, y = 1) {
    // TODO: DRY. This is looking a lot like addPlayer
    let playerStats = this.defaultPlayerStats
    // TODO: is there a better way of doing this?
    // playerStats.seenBgMap = seenBgMap
    playerStats.x = x
    playerStats.y = y
    this.players = this.players.map(player => {
      return { id: player.id, ...playerStats }
    })
  }

  removePlayer (socketId) {
    this.players = this.players.filter(player => {
      return player.id !== socketId
    })
  }

  acceptInput (socketId) {
    // Check if the socket.id is in the list. We only allow two players.
    // TODO: may need to reevaluate this: do we need to check if the socket id matches the first two players
    // if we are checking against players that are allowed to play?
    return this.players[1] !== undefined &&
      (socketId === this.players[0].id || socketId === this.players[1].id) &&
      this.players[this.thisPlayersTurn()].id === socketId
  }

  // TODO: would it make sense to store the socket.id of the player whose turn it is in here??
  playersTurn (socketId) {
    return this.thisPlayerIndex(socketId)
  }

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
      return { id: player.id, name: player.name }
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
      console.log('player: ' + player.x + ' ' + player.y + ' passed: ' + x + ' ' + y)
      return player.x === x && player.y === y
    })
  }

  // setPosition (socketId, x, y) {
  // }

  // TODO: just pass in the map and split it inside of here?
  updateSeenMap (socketId, visibleBgMap, visibleItemMap) {
    // add the visiblemap to the particular player's seenBgMap
    // fog of war tiles are appended with.... what? '░'?
    // update anything that is not '0' (hidden)
    // console.log('----')
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

    return { seenBgMap, seenItemMap }
  }

  setRelativePosition (socketId, x, y) {
    const player = this.thisPlayer(socketId)
    player.x = player.x + x
    player.y = player.y + y
    this.players[this.thisPlayerIndex(socketId)] = player
  }

  // TODO: change to targetPlayer? playerById? currentPlayer?
  thisPlayer (socketId) {
    return this.players.find(player => player.id === socketId)
  }

  thisPlayerIndex (socketId) {
    return this.players.findIndex(player => player.id === socketId)
  }

  // // TODO
  // // TODO: functions for each of the player's possible actions
  // function playerListen (socketId) {
  //   // Skips the player's movement turn, listens for other players.
  //   // Returns a rough direction
  // }

  // A little pointless to have this as a function at the moment
  // generateRandomName (isHero = true) {
  //   return random.name(isHero)
  // }

  // Assign the number of moves remaining based on "speed" attribute
  // turnStart (socketId) {
  //   players = players.map(player => {
  //     if (player.id === socketId) {
  //       player.movesRemaining = player.status.speed
  //     }
  //     // TODO: is there a better way to do this?
  //     return player
  //   })
  // }

  // TODO: seperate actions? Have actions subtract different amounts? Rename this to "action"?
  // move (socketId) {
  //   const movesRemaining = players.find(player => {
  //     return player.id = socketId
  //   }).movesRemaining

  //   if (movesRemaining > 0) {
  //     players = players.map(player => {
  //       if (player.id === socketId) {
  //         player.movesRemaining = player.movesRemaining - 1
  //       }
  //       // TODO: is there a better way to do this?
  //       return player
  //     })
  //   }

  //   return movesRemaining > 0
  // }

  turnDone () {
    this.turnCounter++
  }

  // TODO: more generic function for adding and removing anything??
  addInventory (socketId, key, value) {
    this.players = this.players.map(player => {
      if (player.id === socketId) {
        player.inventory[key] += value
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
      if (player.id === socketId) {
        return player
      }
    }).inventory[key]
  }

  // TODO: make DRY
  // viewStatus (socketId, key) {
  //   // TODO: handle null, etc
  //   return this.players.find(player => {
  //     if (player.id === socketId) {
  //       return player
  //     }
  //   }).status[key]
  // }

  // TODO: cannot name this length since it overwrites
  playerCount () {
    return this.players.length
  }

  isEnoughPlayers () {
    return this.players.length >= this.ALLOWED_PLAYERS.length
  }
}
