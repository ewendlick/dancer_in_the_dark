const app = require('express')()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const chalk = require('chalk')
const port = process.env.PORT || 3000

// TODO: sort this out with 'app'
const express = require('express')

const map = require('./maps/map')


let PLAYERS = []
let ALLOWED_PLAYERS = [0, 1] // change to a number, ALLOWED_PLAYER_COUNT
let getPlayersTurn = () => { return ALLOWED_PLAYERS[turnCounter % ALLOWED_PLAYERS.length] }
let turnCounter = 0

// TODO: Should this be redone?
const LEFT = 37
const UP = 38
const RIGHT = 39
const DOWN = 40
const ALLOWED_KEY_CODES = [LEFT, UP, RIGHT, DOWN]

const BASIC_MAP = map.basic
const MOVEABLE_SQUARES = map.moveable

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

  // "Constructor"
  io.emit('map', BASIC_MAP) // TODO: remove, only pass visible
  io.emit('players', PLAYERS)
  io.emit('turn', playersTurn())

  visibleMap(socket.id) // TODO: TESTING

  socket.on('client key down', (msg) => {
    if (acceptInput(socket.id)) {
      handleInput(socket.id, msg)
      console.log(chalk.green(`Accepted input from: ${socket.id}`))
      io.emit('players', PLAYERS)
      io.emit('turn', playersTurn())
    } else {
      // Testing purposes
      console.log(chalk.red(`Rejected input from: ${socket.id}`))
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
  console.log('Express is running and listening on *:' + port);
})

function visibleMap (socketId) {
  const viewDistance = 3
  const player = PLAYERS[PLAYERS.findIndex(player => player.id === socketId)]

  // TODO: check if there is a wall directly in front of them in a direction
  const lookingPaths = lookPaths(DOWN, RIGHT, viewDistance).concat(
  lookPaths(RIGHT, UP, viewDistance)).concat(
  lookPaths(UP, LEFT, viewDistance)).concat(
  lookPaths(LEFT, DOWN, viewDistance))

  console.log('PATHS FOR LOOKING')
  console.log(lookingPaths)
  // Change the map to obscure any other vision
  let visibleMap = hider(player.x, player.y, BASIC_MAP, lookingPaths, viewDistance)
  console.log(visibleMap)
  // apply "sounds" to the map for other players?
}

function lookPaths (direction, secondDirection, distance) {
  // All paths to look in one direction (UP, RIGHT, DOWN, LEFT) based on a quadrant (e.g. UP & UPPER-LEFT)
  let resultPaths = []
  if (distance === 1) {
    resultPaths = [direction]
  } else {
    let start = Math.pow(2, distance) - 1
    const requiredLength = dec2bin(start).length
    while (start > 0) {
      let binary = dec2bin(start)
      if (binary[0] !== '0' && binary.length === requiredLength) {
        resultPaths.push(binary.split('').map(val => {
          return val === '1' ? direction : secondDirection
        }))
      }
    start--
    }
  }
  return resultPaths
}

// TODO: move into looker?
function dec2bin (dec) {
  return (dec >>> 0).toString(2)
}

function hider (playerX, playerY, map, paths, viewDistance) {
  // TODO: Move out. Make a const
  const mapHeight = map.length
  const mapWidth = map[0].length

  // TODO: should we get viewDistance from paths?
  // everything is hidden until a path reveals it
  let shownMap = [...Array(mapHeight)].map(columnItem => Array(mapWidth).fill('0'))
  shownMap[playerY][playerX] = BASIC_MAP[playerY][playerX]

  // oh no, we need to explicitly check diagonals or rework the view system
  // TODO: rework the view system to get diagonals in there. Maybe check for wall collisions on evens?
  for (let diagonal = 0; diagonal < 4; diagonal++) {
    let x = playerX
    let y = playerY
    for (let distance = 1; distance <= Math.floor(viewDistance / 2); distance++) {
      // UP + LEFT
      if (diagonal === 0) {
        y--
        x--
      // RIGHT + UP
      } else if (diagonal === 1) {
        y--
        x++
      // DOWN + RIGHT
      } else if (diagonal === 2) {
        y++
        x++
      // LEFT + DOWN
      } else if (diagonal === 3) {
        y++
        x--
      }

      if (MOVEABLE_SQUARES.includes(BASIC_MAP[y][x])) {
        shownMap[y][x] = BASIC_MAP[y][x]
      } else {
        shownMap[y][x] = BASIC_MAP[y][x]
        continue
      }
    }
  }


  paths.forEach(path => {
    let x = playerX
    let y = playerY

    // TODO: return on a wall
    // change this from forEach so we can break from it when hitting a wall
    for (index = 0; index < path.length; index++) {
      let direction = path[index]

      if (direction === LEFT && MOVEABLE_SQUARES.includes(BASIC_MAP[y][x - 1])) {
        shownMap[y][x - 1] = BASIC_MAP[y][x - 1]
        x--
      } else if (direction === UP && MOVEABLE_SQUARES.includes(BASIC_MAP[y - 1][x])) {
        shownMap[y - 1][x] = BASIC_MAP[y - 1][x]
        y--
      } else if (direction === RIGHT && MOVEABLE_SQUARES.includes(BASIC_MAP[y][x + 1])) {
        shownMap[y][x + 1] = BASIC_MAP[y][x + 1]
        x++
      } else if (direction === DOWN && MOVEABLE_SQUARES.includes(BASIC_MAP[y + 1][x])) {
        shownMap[y + 1][x] = BASIC_MAP[y + 1][x]
        y++
      } else if (direction === LEFT) {
        // TODO: clean this up
        shownMap[y][x - 1] = BASIC_MAP[y][x - 1]
        continue
      } else if (direction === UP) {
        shownMap[y - 1][x] = BASIC_MAP[y - 1][x]
        continue
      } else if (direction === RIGHT) {
        shownMap[y][x + 1] = BASIC_MAP[y][x + 1]
        continue
      } else if (direction === DOWN) {
        shownMap[y + 1][x] = BASIC_MAP[y + 1][x]
        continue
      }
    }
  })
  return shownMap
}

// TODO: user names?
// We are checking against socketId when we don't need to.
function playersTurn () {
  return `Player ${getPlayersTurn() + 1}'s turn`

  // TODO: it would be nice if this said "your turn"
  // const currentPlayerIndex = PLAYERS.findIndex(player => {
  //   return player.id === socketId
  // })
  // const turn = getPlayersTurn()
  // console.log('turn ' + turn + ' currentPlayerIndex ' + currentPlayerIndex)
  // if (currentPlayerIndex === turn) {
  //   console.log('a')
  //   return 'Your turn'
  // } else {
  //   console.log('b')
  //   return `Player ${turn + 1}'s turn`
  // }
}

function acceptInput (socketId) {
  // Check if the socket.id is in the list. We only allow two players.
  // TODO: may need to reevaluate this: do we need to check if the socket id matches the first two players
  // if we are checking against players that are allowed to play?
  return PLAYERS[1] !== undefined &&
    (socketId === PLAYERS[0].id || socketId === PLAYERS[1].id) &&
    PLAYERS[getPlayersTurn()].id === socketId
}

function handleInput(socketId, keyCode) {
  if (!ALLOWED_KEY_CODES.includes(keyCode)) {
    console.log('Keycode not allowed')
    return
  }

  // TODO: implement movement impedement
  const player = PLAYERS.find(player => {
    return player.id === socketId
  })

  // TODO: move back out into its own function
  if (keyCode === LEFT && MOVEABLE_SQUARES.includes(BASIC_MAP[player.y][player.x - 1])) {
    console.log('left')
    PLAYERS[PLAYERS.findIndex(player => player.id === socketId)].x--
    turnCounter++
  } else if (keyCode === UP && MOVEABLE_SQUARES.includes(BASIC_MAP[player.y - 1][player.x])) {
    console.log('up')
    PLAYERS[PLAYERS.findIndex(player => player.id === socketId)].y--
    turnCounter++
  } else if (keyCode === RIGHT && MOVEABLE_SQUARES.includes(BASIC_MAP[player.y][player.x + 1])) {
    console.log('right')
    PLAYERS[PLAYERS.findIndex(player => player.id === socketId)].x++
    turnCounter++
  } else if (keyCode === DOWN && MOVEABLE_SQUARES.includes(BASIC_MAP[player.y + 1][player.x])) {
    console.log('down')
    PLAYERS[PLAYERS.findIndex(player => player.id === socketId)].y++
    turnCounter++
  } else {
    // Do nothing. Do not update the turn counter
  }
}
