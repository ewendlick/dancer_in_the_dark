const app = require('express')()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const chalk = require('chalk')
const port = process.env.PORT || 3000

const express = require('express')

const map = require('./maps/map')



let PLAYERS = []
let ALLOWED_PLAYERS = [0, 1] // change to a number, ALLOWED_PLAYER_COUNT
let getPlayersTurn = () => { return ALLOWED_PLAYERS[turnCounter % ALLOWED_PLAYERS.length] }
let turnCounter = 0

const GLOBAL_KEY_STATUS = {
  LEFT: false,
  UP: false,
  RIGHT: false,
  DOWN: false
}

const LEFT = 37
const UP = 38
const RIGHT = 39
const DOWN = 40
const ALLOWED_KEY_CODES = [LEFT, UP, RIGHT, DOWN]

const BASIC_MAP = map.basic

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html')
})
app.use(express.static('static'))


io.on('connection', socket => {
  console.log(chalk.blue('〇 A user connected with socket ID' + socket.id))
  socket.on('disconnect', () => {
    console.log(chalk.red('× A user disconnected with socket ID' + socket.id))
  })
})

io.on('connection', (socket) => {
  // Create a user and give them a socket.id
  PLAYERS.push({ id: socket.id,
                 x: 1,
                 y: 1,
                 remainingArrows: 2 })

  io.emit('map', BASIC_MAP) // Fires for each page connection :/
  // TODO: need to look into how to handle this
  io.emit('players', PLAYERS)

  socket.on('keys pressed locally', (msg) => {
    console.log('keypress')
    if (acceptInput(socket.id)) {
      handleInput(socket.id, msg)
      console.log(`Accepted input for: ${socket.id}`)
      io.emit('players', PLAYERS)
    }

  })

  socket.on('disconnect', () => {
    PLAYERS = PLAYERS.filter(player => {
      return player.id !== socket.id
    })
    console.log(chalk.red(PLAYERS.length + ' players'))
  })
})

http.listen(port, () => {
  console.log('listening on *:' + port);
})

// TODO: unused
function onOffHighlight (status, text) {
  return  status ? chalk.green(convertKey(text)) : chalk.red(convertKey(text))
}

function acceptInput (socketId) {
  // Check if the socket.id is in the list. We only allow two players.
  // TODO: may need to reevaluate this: do we need to check if the socket id matches the first two players
  // if we are checking against players that are allowed to play?
  return PLAYERS[1] !== undefined &&
    (socketId === PLAYERS[0].id || socketId === PLAYERS[1].id) &&
    PLAYERS[getPlayersTurn()].id === socketId
}

function handleInput (socketId, keyCode) {
  if (!ALLOWED_KEY_CODES.includes(keyCode)) {
    console.log('Keycode not allowed')
    return
  }

  // DO we really need the isMovementAllowed function? This seems like it wouldn't be required
  if (isMovementAllowed(socketId, keyCode)) {
    if (keyCode === LEFT) {
      PLAYERS[PLAYERS.findIndex(player => player.id === socketId)].x--
    } else if (keyCode === UP) {
      PLAYERS[PLAYERS.findIndex(player => player.id === socketId)].y--
    } else if (keyCode === RIGHT) {
      PLAYERS[PLAYERS.findIndex(player => player.id === socketId)].x++
    } else if (keyCode === DOWN) {
      PLAYERS[PLAYERS.findIndex(player => player.id === socketId)].y++
    }
    PLAYERS.forEach((player, index) => {
      console.log(`${index}:  X: ${chalk.red(player.x)}, Y: ${chalk.red(player.y)}`)
    })
    turnCounter++
  } else {
    // turnCounter is not updated. Next input may come from the same user
    return
  }
}

function isMovementAllowed (socketId, keyCode) {
  // hard-coded map
  // TODO: allow selection of maps
  const player = PLAYERS.find(player => {
    return player.id === socketId
  })

  if (keyCode === LEFT && player.x !== 0) {
    console.log('left')
    return true
  } else if (keyCode === UP && player.y !== 0) {
    console.log('up')
    return true
  // TODO: LOL, so hacky. Jeez. Revist this later. We may want to make a map ringed with "false" and prevent
  // movement into "false" squares
  } else if (keyCode === RIGHT && player.x < BASIC_MAP[0].length) {
    console.log('right')
    return true
  } else if (keyCode === DOWN && player.y < BASIC_MAP.length) {
    console.log('down')
    return true
  } else {
    return false
  }
}
