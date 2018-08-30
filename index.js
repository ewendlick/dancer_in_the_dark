const app = require('express')()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const chalk = require('chalk')
const port = process.env.PORT || 3001

// TODO: sort this out with 'app'. This doesn't seem to work from 'app'
const express = require('express')

const map = require('./classes/Map')
const MAP = new map
const printOut = require('./lib/printOut')
const players = require('./classes/Players')
const PLAYERS = new players
const INPUT = require('./lib/input')
const random = require('./lib/random')
const DEFAULT_TIME_SECONDS = 10

let timerSeconds = 0
const timerTick = () => {
  if (timerSeconds > 0) {
    timerSeconds--
  } else {
    PLAYERS.turnDone()
    resetTimer()
  }
}

function resetTimer(seconds = DEFAULT_TIME_SECONDS) {
  io.emit('movementTimer', seconds)
  timerSeconds = seconds
}

printOut.floorToWallPercentage(MAP.bgMap)

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html')
})
app.use(express.static('static'))


io.on('connection', socket => {
  console.log(chalk.blue('〇 A user connected with socket ID' + socket.id))
  emitMessage('A user connected', 'success', 'all') // TODO: Display the person's "name"
  socket.on('disconnect', () => {
    console.log(chalk.red('× A user disconnected with socket ID' + socket.id))
    emitMessage('A user disconnected', 'failure', 'all') // TODO: Display the person's "name"
  })
})

io.on('connection', (socket) => {
  PLAYERS.addPlayer(socket.id, MAP.unseenBgMap, MAP.unseenItemMap)
  io.emit('playersPublicInfo', PLAYERS.playersPublicInfo())
  io.to(`${socket.id}`).emit('playerId', socket.id)

  // "Constructor"
  if (PLAYERS.isEnoughPlayers) {
    // TODO: figure out this aspect. Should we ask all players when they are ready to start?
    // Having the generateMap() function here isn't the best idea.
    MAP.generateMap()
    // TODO: Need to move the players to the corner (break that out of addPlayer?)

    printOut.humanReadableMap(MAP.bgMap, MAP.itemMap)

    io.to(`${socket.id}`).emit('map', seen(socket.id))

    PLAYERS.playersPublicInfo().forEach(player => {
      io.to(`${socket.id}`).emit('players', visiblePlayersFor(socket.id))
    })

    // TODO: figure out how to display that there are not enough players. Make it another emit??
    io.emit('turn', PLAYERS.nextPlayersTurn(socket.id))

    // TODO: hook this up to give different players more movement time
    io.emit('movementTimer', DEFAULT_TIME_SECONDS)
    setInterval(timerTick, 1000)

    // TODO: set the moves for the right players
    PLAYERS.playersPublicInfo().forEach((player, index) => {
      if (PLAYERS.thisPlayersTurn() === index) {
        PLAYERS.startPlayersTurn(socket.id)
        io.to(`${player.socketId}`).emit('movesRemaining', PLAYERS.playersMovesRemaining(player.socketId))
      } else {
        io.to(`${player.socketId}`).emit('movesRemaining', 0)
      }
    })
  }

  socket.on('client single key', (msg) => {
    if (PLAYERS.acceptInput(socket.id)) {
      handleSingleKey(socket.id, msg)
      console.log(chalk.green(`Accepted input from: ${socket.id}`))
      // TODO: implement io.broadcast.emit to send to everyone else. We want to say "you moved" and "a player moved"
      emitMessage('A player moved', 'general', 'others', socket.id)
      emitMessage('You moved', 'general', 'self', socket.id)
      // https://socket.io/docs/emit-cheatsheet/

      resolveTile(socket.id)

      io.to(`${socket.id}`).emit('map', seen(socket.id))

      PLAYERS.playersPublicInfo().forEach(player => {
        io.to(`${player.socketId}`).emit('players', visiblePlayersFor(socket.id))
      })

      io.emit('turn', PLAYERS.nextPlayersTurn(socket.id))

      // TODO: Do we want to keep this?
      // This sets the timer back to 10 seconds after each move
      io.emit('movementTimer', DEFAULT_TIME_SECONDS)

      // TODO: set the moves for the right players
      PLAYERS.playersPublicInfo().forEach((player, index) => {
        if (PLAYERS.thisPlayersTurn() === index) {
          // TODO: how will we handle a time limit to their turn?
          // emit the remaining time to the index.html and set it here
          // When it ends here, we run the end of the turn
          io.to(`${player.socketId}`).emit('movesRemaining', PLAYERS.playersMovesRemaining(player.socketId))
        } else {
          // TODO: look into this. This won't work for multiple players moving at the same time in situations with more than 2 players
          io.to(`${player.socketId}`).emit('movesRemaining', 0)
        }
      })
    } else {
      // Testing purposes
      console.log(chalk.red(`Rejected input from: ${socket.id} (Not their turn/Insufficient players)`))
    }
  })

  // TODO: work here
  // Because we are passing an array and not a single key, maybe we can combine this 'client combo keys' with 'client single key'
  socket.on('client combo keys', (msg) => {
    // passes in an array
    if (PLAYERS.acceptInput(socket.id)) {
      handleComboKey(socket.id, msg)
      console.log(chalk.green(`Accepted input from: ${socket.id}`))
      // TODO: emit messages to people involved

      //   io.to(`${socket.id}`).emit('map', seen(socket.id))

      //   PLAYERS.playersPublicInfo().forEach(player => {
      //     io.to(`${player.socketId}`).emit('players', visiblePlayersFor(socket.id))
      //   })

      io.emit('turn', PLAYERS.nextPlayersTurn(socket.id))
    }
  })

  socket.on('disconnect', () => {
    PLAYERS.removePlayer(socket.id)
    io.emit('playersPublicInfo', PLAYERS.playersPublicInfo())
    console.log(chalk.red(PLAYERS.length + ' players'))
  })
})

http.listen(port, () => {
  console.log('Express is running and listening on *:' + port);
})

// TODO: list of allowed types and default. Now using general(black), success(green), failure(red), event(yellow)
function emitMessage (payload, type = 'general', target = 'all', socketId = null) {
  const message = { payload: payload, type: type }
  if (target === 'all') {
    io.emit('message', message)
  } else if (target === 'others') {
    // TODO: there is a way to send to all other people using socket.broadcast.emit.... but how to hook that up easily?
    // TODO: give this some thought. Could we pass the socket into here?
    PLAYERS.playersPublicInfo().forEach(player => {
      if (player.socketId !== socketId) {
        io.to(`${player.socketId}`).emit('message', message)
      }
    })
  } else { // self
    io.to(`${socketId}`).emit('message', message)
  }
}

function seen (socketId) {
  const visibleMap = visible(socketId)
  return PLAYERS.updateSeenMap(socketId, visibleMap.shownBgMap, visibleMap.shownItemMap, visibleMap.fogOfWarMap)
}

// TODO: should we move the visiblePlayersFor into here?
// TODO: run this once for their turn?
function visible (socketId) {
  const player = PLAYERS.thisPlayer(socketId)
  return MAP.visibleMap(player)
}

function visiblePlayersFor (socketId) {
  // TODO: Incomplete. Returning all players
  return PLAYERS.visiblePlayers(visible(socketId).shownBgMap)
}

function resolveTile (socketId) {
  const player = PLAYERS.thisPlayer(socketId)

  if (MAP.isItemAt(player.x, player.y, MAP.TILE_TYPE.TREASURE)) {
    console.log(chalk.yellow('Treasure found by: ' + socketId))
    emitMessage('You got the treasure!', 'event', 'self', socketId)
    emitMessage('Someone has found the treasure!', 'event', 'others', socketId)
    PLAYERS.addInventory(socketId, 'treasure', 1)
    // clear the square in the map (we assume that the point is either wall, object, or floor. No combination)
    MAP.consumeItemAt(player.x, player.y, MAP.TILE_TYPE.TREASURE)
    // Create the exit
    // TODO: place the exit at some random location far away
    MAP.spawnItemAt(1, 1, MAP.TILE_TYPE.EXIT)

  } else if (MAP.isItemAt(player.x, player.y, MAP.TILE_TYPE.EXIT)) {
    if (PLAYERS.viewInventory(socketId, 'treasure') > 0) {
      console.log(chalk.yellow('Exit found by: ' + socketId))
      emitMessage('You win!', 'event', 'self', socketId)
      emitMessage('Someone made it to the exit with the treasure!', 'failure', 'others', socketId)
      restartGame()
    }
  }
  // else if teleporter
  // else if trap
}

function restartGame () {
  MAP.generateMap(true)
  PLAYERS.resetPlayers()
  // TODO: emit an event to animate something in index.html, or something like that
}

function handleSingleKey(socketId, keyCode) {
  if (!INPUT.isAllowed(keyCode)) {
    console.log('Keycode not allowed')
    return
  }

  const player = PLAYERS.thisPlayer(socketId)

  // TODO: move back out into its own function
  if (keyCode === INPUT.LEFT && MAP.isMoveable(MAP.movementImpedimentMap[player.y][player.x - 1])) {
    console.log(chalk.green('(LEFT) Pressed'))
    // if can move
    if (PLAYERS.performMove(socketId, 1)) {
      PLAYERS.setRelativePosition(socketId, -1, 0)
    } else {
      emitMessage('Insufficient moves remaining', 'failure', 'self', socketId)
    }

    if (PLAYERS.playersMovesRemaining(socketId) <= 0) {
      // no more moves remaining (check Players class.... this needs to be fixed when multiple moves can be performed at once
      PLAYERS.turnDone()
      resetTimer()
    }
  } else if (keyCode === INPUT.UP && MAP.isMoveable(MAP.movementImpedimentMap[player.y - 1][player.x])) {
    console.log(chalk.green('(UP) Pressed'))
    if (PLAYERS.performMove(socketId, 1)) {
      PLAYERS.setRelativePosition(socketId, 0, -1)
    } else {
      emitMessage('Insufficient moves remaining', 'failure', 'self', socketId)
    }

    if (PLAYERS.playersMovesRemaining(socketId) <= 0) {
      PLAYERS.turnDone()
      resetTimer()
    }
  } else if (keyCode === INPUT.RIGHT && MAP.isMoveable(MAP.movementImpedimentMap[player.y][player.x + 1])) {
    console.log(chalk.green('(RIGHT) Pressed'))
    if (PLAYERS.performMove(socketId, 1)) {
      PLAYERS.setRelativePosition(socketId, 1, 0)
    } else {
      emitMessage('Insufficient moves remaining', 'failure', 'self', socketId)
    }

    // TODO:.... why not put this whole thing into the PLAYERS class?
    // TODO: moveDone
    if (PLAYERS.playersMovesRemaining(socketId) <= 0) {
      PLAYERS.turnDone()
      resetTimer()
    }
  } else if (keyCode === INPUT.DOWN && MAP.isMoveable(MAP.movementImpedimentMap[player.y + 1][player.x])) {
    console.log(chalk.green('(DOWN) Pressed'))
    if (PLAYERS.performMove(socketId, 1)) {
      PLAYERS.setRelativePosition(socketId, 0, 1)
    } else {
      emitMessage('Insufficient moves remaining', 'failure', 'self', socketId)
    }

    if (PLAYERS.playersMovesRemaining(socketId) <= 0) {
      PLAYERS.turnDone()
      resetTimer()
    }
  } else if (keyCode === INPUT.SPACEBAR) {
    console.log('spacebar') // skip their turn
    // TODO: possibly implement a listen system
    PLAYERS.turnDone()
    resetTimer()
  } else {
    // Do nothing. Do not end the player's turn
  }
}

function handleComboKey(socketId, keyCodes) {
  // currently only used for "fire"
  // It is assumed that only two values are in the passed array
  // TODO: check to confirm that the values are in the correct order (e.g. [KEY.F, KEY.DOWN])
  if (!INPUT.isAllowed(keyCodes[0]) || !INPUT.isAllowed(keyCodes[1])) {
    console.log('Keycodes not allowed')
    return
  }

  // TODO: create a file shared between both index.html and index.js for INPUT/KEY information
  if (keyCodes[0] === INPUT.F) {
    if (PLAYERS.performMove(socketId, 1)) {
      fireProjectile(socketId, keyCodes[1])
    } else {
      // insufficient moves
    }

    if (PLAYERS.playersMovesRemaining(socketId) <= 0) {
      PLAYERS.turnDone()
    }
  }
}

function fireProjectile (socketId, keyCode) {
  // instantly move in a single direction
  // TODO: consider movement of tiles per turn

  const player = PLAYERS.thisPlayer(socketId)

  // TODO: refactor. Hitting the conditional on each loop isn't ideal. There has to be a better way
  let x = player.x
  let y = player.y
  let currentTileIs = null
  const UNMOVEABLE = -1
  // while(MAP.isInMap(x, y)) { // immediately looks past the isInMap bounds :/
  // TODO: MAP.isInMapBounds that checks for x > 0 && x < MAP.width && y > 0 && y < MAP.height
  while(x > 0 && x < MAP.width && y > 0 && y < MAP.height) {
    if (keyCode === INPUT.LEFT) {
      x -= 1
    } else if (keyCode === INPUT.UP) {
      y -= 1
    } else if (keyCode === INPUT.RIGHT) {
      x += 1
    } else if (keyCode === INPUT.DOWN) {
      y += 1
    }

    // TODO: wall check is wrong
    // TODO: need a way to make MOVEABLE and UNMOVEABLE more accessible
    // TODO: not DRY
    //
    if (MAP.movementImpedimentMap[y][x] === UNMOVEABLE) {
      // message to the person who fired it
      // TODO: Different messages depending on visibility?
      // TODO: checking against moveability. this message may not be appropriate
      emitMessage('The arrow embeds itself in a wall', 'event', 'self', socketId)
      break
    } else if (MAP.isItemAt(x, y, MAP.TILE_TYPE.TREASURE)) {
      emitMessage('You hear a loud clang', 'event', 'all')
      break
    }

    if (tileHas(x, y) === 'player') {
      const struckPlayer = strikePlayerAt(x, y)
      // TODO: Message to the person struck...edit arrowStrike() for both?
      // emitMessage('', 'event', 'self', socketId)
      // Message to the person who fired
      emitMessage(random.arrowStrike(struckPlayer.name), 'event', 'self', socketId)
      // TODO: Message to all other players?
      break
    }
  }
}

// TODO: update this to return players as well as items as two arrays
// TODO: probably need to create a Player class :/
function tileHas (x, y) {
  // currently, only players may exist on a tile without overwriting the value
  const players = PLAYERS.playersAt(x, y)
  if (players.length > 0) {
    return 'player'
  } else {
    return 'nothing'
  }
}

// TODO: move this to the player class??
function strikePlayerAt (x, y) {
  const players = PLAYERS.playersAt(x, y)
  if (players.length > 0) {
    // TODO: figure out how to handle multiple people on the same tile, because the first person
    // will always be the one hit by an arrow in this case
    //
    // TODO: perform any status changes here. Reduce HP, reduce their speed, stun them, etc
    return players[0]
  }
}
