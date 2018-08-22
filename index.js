const app = require('express')()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const chalk = require('chalk')
const port = process.env.PORT || 3000

// TODO: sort this out with 'app'. This doesn't seem to work from 'app'
const express = require('express')

const map = require('./classes/Map')
const MAP = new map
const printOut = require('./lib/printOut')
const players = require('./classes/Players')
const PLAYERS = new players
const INPUT = require('./lib/input')

printOut.floorToWallPercentage(MAP.fullMap)

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html')
})
app.use(express.static('static'))


io.on('connection', socket => {
  console.log(chalk.blue('〇 A user connected with socket ID' + socket.id))
  emitMessage ('A user connected', 'success', 'all') // TODO: Display the person's "name"
  socket.on('disconnect', () => {
    console.log(chalk.red('× A user disconnected with socket ID' + socket.id))
    emitMessage ('A user disconnected', 'failure', 'all') // TODO: Display the person's "name"
  })
})

io.on('connection', (socket) => {
  PLAYERS.addPlayer(socket.id, MAP.unseenMap)
  io.emit('playersPublicInfo', PLAYERS.playersPublicInfo())
  io.to(`${socket.id}`).emit('playerId', socket.id)

  // "Constructor"
  if (PLAYERS.isEnoughPlayers) {
    // TODO: figure out this aspect. Should we ask all players when they are ready to start?
    // Having the generateMap() function here isn't the best idea.
    MAP.generateMap()
    // TODO: Need to move the players to the corner (break that out of addPlayer?)

    printOut.humanReadableMap(MAP.fullMap)

    io.to(`${socket.id}`).emit('map', seen(socket.id))

    PLAYERS.playersPublicInfo().forEach(player => {
      io.to(`${socket.id}`).emit('players', visiblePlayersFor(socket.id))
    })

    // TODO: figure out how to display that there are not enough players. Make it another emit??
    io.emit('turn', PLAYERS.nextPlayersTurn(socket.id))
  }

  socket.on('client key down', (msg) => {
    if (PLAYERS.acceptInput(socket.id)) {
      handleInput(socket.id, msg)
      console.log(chalk.green(`Accepted input from: ${socket.id}`))
      // TODO: implement io.broadcast.emit to send to everyone else. We want to say "you moved" and "a player moved"
      emitMessage ('A player moved', 'general', 'others', socket.id)
      emitMessage ('You moved', 'general', 'self', socket.id)
      // https://socket.io/docs/emit-cheatsheet/

      resolveTile(socket.id)

      io.to(`${socket.id}`).emit('map', seen(socket.id))

      // TODO: using visible() and seen(), implement fog of war

      PLAYERS.playersPublicInfo().forEach(player => {
        io.to(`${player.id}`).emit('players', visiblePlayersFor(socket.id))
      })
      io.emit('turn', PLAYERS.nextPlayersTurn(socket.id))
    } else {
      // Testing purposes
      console.log(chalk.red(`Rejected input from: ${socket.id} (Not their turn/Insufficient players)`))
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
// TODO: refactor this. This is not clean
function emitMessage (message, type = 'general', target = 'all', socketId = null) {
  message = `<span class="${type}">${message}</span>`
  if (target === 'all') {
    io.emit('message', message)
  } else if (target === 'others') {
    // TODO: there is a way to send to all other people using socket.broadcast.emit.... but how to hook that up easily?
    // TODO: give this some thought. Could we pass the socket into here?
    PLAYERS.playersPublicInfo().forEach(player => {
      if (player.id !== socketId) {
        io.to(`${player.id}`).emit('message', message)
      }
    })
  } else { // self
    io.to(`${socketId}`).emit('message', message)
  }
}

function seen (socketId) {
  console.log('seen: ' + socketId)
  return PLAYERS.updateSeenMap(socketId, visible(socketId))
}

function visible (socketId) {
  const player = PLAYERS.thisPlayer(socketId)
  return MAP.visibleMap(player)
}

function visiblePlayersFor (socketId) {
  // TODO: Incomplete. Returning all players
  return PLAYERS.visiblePlayers(visible(socketId))
}


// TODO
// TODO: functions for each of the player's possible actions
// function playerListen (socketId) {
//   // Skips the player's movement turn, listens for other players.
//   // Returns a rough direction
// }

// TODO
// TODO: does whatever is at the tile: teleporter, pick up an item, activate a trap...
// TODO: map class? It would need to update the player content
function resolveTile (socketId) {
  // get the location of the player, check the tile if there is anything besides floor
  const player = PLAYERS.thisPlayer(socketId)

  if (MAP.fullMap[player.y][player.x] == ' ') {
    return
  }

  // TODO: constants?
  // treasure
  if (MAP.fullMap[player.y][player.x] == '^') {
    console.log(chalk.yellow('Treasure found by: ' + socketId))
    emitMessage('You got the treasure!', 'event', 'self', socketId)
    emitMessage('Someone has found the treasure!', 'event', 'others', socketId)
    PLAYERS.addInventory(socketId, 'treasure', 1)
    // clear the square in the map (we assume that the point is either wall, object, or floor. No combination)
    MAP.updateMapAt(player.x, player.y, ' ')
    // Create the exit
    // TODO: draw the exit at some random location far away
    MAP.spawnAt(1, 1, item = '>')
  } else if (MAP.fullMap[player.y][player.x] == '>') {
    // TODO: check and see if they have the treasure?
    if (PLAYERS.viewInventory(socketId, 'treasure') > 0) {
      console.log(chalk.yellow('Exit found by: ' + socketId))
      emitMessage('You win!', 'event', 'self', socketId)
      emitMessage('Someone made it to the exit with the treasure!', 'failure', 'others', socketId)
      restartGame()
    }
  }
}

function restartGame () {
  MAP.generateMap(true)
  PLAYERS.resetPlayers()
  // TODO: emit an event to animate something in index.html, or something like that
}

function handleInput(socketId, keyCode) {
  if (!INPUT.isAllowed(keyCode)) {
    console.log('Keycode not allowed')
    return
  }

  // TODO: implement movement impedement
  const player = PLAYERS.thisPlayer(socketId)

  // TODO: move back out into its own function
  if (keyCode === INPUT.LEFT && MAP.isMoveable(MAP.fullMap[player.y][player.x - 1])) {
    console.log(chalk.green('(LEFT) Pressed'))
    PLAYERS.setRelativePosition(socketId, -1, 0)
    // PLAYERS.move(socketId)
    PLAYERS.turnDone()
  } else if (keyCode === INPUT.UP && MAP.isMoveable(MAP.fullMap[player.y - 1][player.x])) {
    console.log(chalk.green('(UP) Pressed'))
    PLAYERS.setRelativePosition(socketId, 0, -1)
    // PLAYERS.move()
    PLAYERS.turnDone()
  } else if (keyCode === INPUT.RIGHT && MAP.isMoveable(MAP.fullMap[player.y][player.x + 1])) {
    console.log(chalk.green('(RIGHT) Pressed'))
    PLAYERS.setRelativePosition(socketId, 1, 0)
    // PLAYERS.move()
    PLAYERS.turnDone()
  } else if (keyCode === INPUT.DOWN && MAP.isMoveable(MAP.fullMap[player.y + 1][player.x])) {
    console.log(chalk.green('(DOWN) Pressed'))
    PLAYERS.setRelativePosition(socketId, 0, 1)
    // PLAYERS.move()
    PLAYERS.turnDone()
  } else if (keyCode === INPUT.SPACEBAR) {
    console.log('spacebar') // skip their turn
    PLAYERS.turnDone()
  } else {
    // Do nothing. Do not end the player's turn
  }
}
