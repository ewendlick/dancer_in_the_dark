const app = require('express')()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const chalk = require('chalk')
const port = process.env.PORT || 3000

let PLAYERS = []
let ALLOWED_PLAYERS = [0, 1]
let getPlayersTurn = () => { return ALLOWED_PLAYERS[turnCounter % ALLOWED_PLAYERS.length] }
let turnCounter = 0

const GLOBAL_KEY_STATUS = {
  LEFT: false,
  UP: false,
  RIGHT: false,
  DOWN: false
}

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html')
})

io.on('connection', socket => {
  console.log(chalk.blue('〇 A user connected with socket ID' + socket.id))
  socket.on('disconnect', () => {
    console.log(chalk.red('× A user disconnected with socket ID' + socket.id))
  })
})

io.on('connection', (socket) => {
  // Create a user and give them a socket.id
  PLAYERS.push({ id: socket.id,
                 x: 0,
                 y: 0,
                 remainingArrows: 2,
                 keyStatus: { left: false,
                              up: false,
                              right: false,
                              down: false }})

  socket.on('keys pressed locally', (msg) => {
    if (acceptInput(socket.id)) {
      // console.log('p' + convertKey(msg))
      // applyGlobalKeyStatus (msg, true)
      // printGlobalKeyStatuses()
      console.log('accepted input!')
    }

    io.emit('keys changed remotely', msg)
  })

  // socket.on('keys unpressed locally', (msg) => {
  //   if (acceptInput(socket.id)) {
  //     // console.log('u' + convertKey(msg))
  //     // applyGlobalKeyStatus (msg, false)
  //     // printGlobalKeyStatuses()
  //   }

  //   io.emit('keys changed remotely', msg)
  // })

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

// TODO: keyCode mapping in this file
function convertKey (key) {
  if (key === 37) {
    // left
    return '⟵'
  } else if (key === 38) {
    // up
    return '↑'
  } else if (key === 39) {
    // right
    return '⟶'
  } else if (key === 40) {
    // down
    return '↓'
  }
}

// function applyGlobalKeyStatus (keyCode, status) {
//   if (keyCode === 37) {
//     GLOBAL_KEY_STATUS.LEFT = status
//   } else if (keyCode === 38) {
//     GLOBAL_KEY_STATUS.UP = status
//   } else if (keyCode === 39) {
//     GLOBAL_KEY_STATUS.RIGHT = status
//   } else if (keyCode === 40) {
//     GLOBAL_KEY_STATUS.DOWN = status
//   }
// }

// function printGlobalKeyStatuses () {
//   // TODO: stop with the magic numbers
//   console.log(onOffHighlight(GLOBAL_KEY_STATUS.LEFT, 37) +
//               onOffHighlight(GLOBAL_KEY_STATUS.UP, 38) +
//               onOffHighlight(GLOBAL_KEY_STATUS.RIGHT, 39) +
//               onOffHighlight(GLOBAL_KEY_STATUS.DOWN, 40))
// }

function onOffHighlight (status, text) {
  return  status ? chalk.green(convertKey(text)) : chalk.red(convertKey(text))
}

function acceptInput (socketId) {
  // Check if the socket.id is in the list. We only allow two players.
  // TODO: may need to reevaluate this: do we need to check if the socket id matches the first two players
  // if we are checking against players that are allowed to play?
  const canInput = PLAYERS[1] !== undefined &&
    (socketId === PLAYERS[0].id || socketId === PLAYERS[1].id) &&
    PLAYERS[getPlayersTurn()].id === socketId

  if (canInput) {
    turnCounter++
  }
  return canInput
}
