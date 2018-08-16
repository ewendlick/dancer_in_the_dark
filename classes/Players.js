module.exports = class Players {
  constructor () {
    this.players = [] // TODO: this isn't a const. rename
    this.ALLOWED_PLAYERS = [0, 1] // TODO: change this to an int
    this.turnCounter = 0
  }

  thisPlayersTurn () {
    return this.ALLOWED_PLAYERS[this.turnCounter % this.ALLOWED_PLAYERS.length]
  }

  nextPlayersTurn () {
    return this.ALLOWED_PLAYERS[(this.turnCounter + 1) % this.ALLOWED_PLAYERS.length]
  }

  addPlayer (id, seenMap = null, x = 1, y = 1 ) {
    this.players.push({ id,
                        seenMap,
                        x,
                        y,
                        inventory: {
                          arrows: 2,
                          treasure: 0
                        },
                        status: {
                          stunned: 0 // turns until not stunned
                        }
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
    // Should this return a list of all of the connected players??
    console.log(`${this.thisPlayerIndex(socketId)} and ${this.nextPlayersTurn()}`)
    if (this.thisPlayerIndex(socketId) === this.nextPlayersTurn()) {
      return `Your turn`
    } else {
      return `Player ${this.nextPlayersTurn() + 1}'s turn`
    }
  }

  visiblePlayers (socketId, visibleMap) {
    // If a player is on a square that is not 0, display them
    return this.players.filter(player => {
      return visibleMap[player.y][player.x] !== 0
    })
  }

  // setPosition (socketId, x, y) {
  // }

  updateSeenMap (socketId, visibleMap) {
    // add the visiblemap to the particular player's seenMap
    // fog of war tiles are appended with.... what? '░'?
    // update anything that is not '0' (hidden)
    let seenMap = this.thisPlayer(socketId).seenMap
    // if (seenMap === null) {
    //   // Ahhhhh, need to pass this in on creation
    //   seenMap = [...Array(MAP_HEIGHT())].map(columnItem => Array(MAP_WIDTH()).fill('0'))
    // }
    seenMap = seenMap.map((row, indexY) => {
      return row.map((itemX, indexX) => {
        if (visibleMap[indexY][indexX] !== '0') {
          return visibleMap[indexY][indexX]
        } else {
          return itemX
        }
      })
    })
    // can I do thisPlayer(socketId).seenMap = seenMap ? Try this later
    this.players[this.thisPlayerIndex(socketId)].seenMap = seenMap
    // TODO: Should another function be created to return this?
    // I am unsure about this all and wonder if I should just be returning
    // true/false and then setting up tests
    return seenMap
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

  turnDone () {
    this.turnCounter++
  }

  length () {
    return this.players.length
  }

  isEnoughPlayers () {
    return this.players.length >= this.ALLOWED_PLAYERS.length
  }
}
