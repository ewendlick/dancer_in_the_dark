const app = require('express')()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const chalk = require('chalk')
const port = process.env.PORT || 3000

// TODO: sort this out with 'app'. This doesn't seem to work from 'app'
const express = require('express')

const map = require('./maps/map')


let PLAYERS = []
let ALLOWED_PLAYERS = [0, 1] // change to a number, ALLOWED_PLAYER_COUNT
const getPlayersTurn = () => { return ALLOWED_PLAYERS[turnCounter % ALLOWED_PLAYERS.length] }
let turnCounter = 0
let isGameRunning = false

// TODO: Should this be redone?
const LEFT = 37
const UP = 38
const RIGHT = 39
const DOWN = 40
const L = 76
const ALLOWED_KEY_CODES = [LEFT, UP, RIGHT, DOWN, L]

let MAP = map.treasureHunt // should this be kept as const? We edit one y,x pair to add treasure
// TODO: caching. We may need to move to Vue, friend
const MAP_HEIGHT = () => { return MAP.length }
const MAP_WIDTH = () => { return MAP[0].length }
const MOVEABLE_SQUARES = map.moveable

floorToWallPercentage()

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
                 remainingArrows: 2,
                 hasTreasure: false })
  isGameRunning = PLAYERS.length >= 2

  if (isGameRunning) {
    // "Constructor"
    // TODO: randomize the spawn distance
    console.log(spawnAtDistance(1, 1, 10, '^'))
    print2DArray(MAP) // To console
    io.to(`${socket.id}`).emit('map', visibleMap(socket.id))
    io.to(`${socket.id}`).emit('players', visiblePlayers(socket.id, visibleMap(socket.id)))
    io.emit('turn', playersTurn())
  } else {
    io.emit('turn', 'Waiting for more players')
  }

  socket.on('client key down', (msg) => {
    if (acceptInput(socket.id)) {
      handleInput(socket.id, msg)
      console.log(chalk.green(`Accepted input from: ${socket.id}`))
      const currentVisibleMap = visibleMap(socket.id)
      // https://socket.io/docs/emit-cheatsheet/
      io.to(`${socket.id}`).emit('map', currentVisibleMap)
      io.to(`${socket.id}`).emit('players', visiblePlayers(socket.id, currentVisibleMap))
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
    // TODO: handle some sort of connection queue
    // TODO: restart the game if one of the original players leaves
    isGameRunning = PLAYERS.length >= 2
    console.log(chalk.red(PLAYERS.length + ' players'))
  })
})

http.listen(port, () => {
  console.log('Express is running and listening on *:' + port);
})

function print2DArray (map) {
  for (let index = 0; index < map.length; index++) {
    console.log(map[index].join(''))
  }
}

function thisPlayer (socketId) {
  return PLAYERS.find(player => player.id === socketId)
}

function thisPlayerIndex (socketId) {
  return PLAYERS.findIndex(player => player.id === socketId)
}

function visibleMap (socketId) {
  const viewDistance = 3
  const player = thisPlayer(socketId)

  // TODO: check if there is a wall directly in front of them in a direction and skip this logic if true
  const lookingPaths = lookPaths(DOWN, RIGHT, viewDistance).concat(
  lookPaths(RIGHT, UP, viewDistance)).concat(
  lookPaths(UP, LEFT, viewDistance)).concat(
  lookPaths(LEFT, DOWN, viewDistance))

  let visibleMap = hider(player.x, player.y, MAP, lookingPaths, viewDistance)
  // apply "sounds" to the map for other players?
  return visibleMap
}

function floorToWallPercentage () {
  let floor = 0
  let wall = 0
  MAP.forEach(row => {
    row.forEach(columnItem => {
      columnItem === ' ' ? floor++ : wall++
    })
  })
  console.log(`FLOOR TILES: ${Math.round((floor / (floor+wall)) * 100)}%, WALL TILES ${Math.round((wall / (floor+wall)) * 100)}%`)
}

function spawnAtDistance (startX, startY, targetDistance, item = '^') {
  // '^' is treasure
  let randomAttempts = 10
  while (randomAttempts > 0) {
    // create a random point that adds up to targetDistance, check the positive and negative x,y combinations and see if it is on the board on any of them
    let x = Math.round((Math.random() * targetDistance))
    let y = targetDistance - x
    let testPoints = [{y: startY - y, x: startX - x}, {y: startY - y, x: startX + x}, {y: startY + y, x: startX - x}, {y: startY + y, x: startX + x}]

    let pointCount = 4
    while (pointCount > 0) {
      let point = testPoints.splice(Math.floor(Math.random() * testPoints.length), 1)[0]

      // is inside of the map's boundaries?
      if (point.x >= 0 && point.x < MAP_WIDTH() && point.y >=0 && point.y < MAP_HEIGHT()) {
        // Is not a wall or unplaceable?
        // TODO: not hard coded, we need a system of wall (not moveable), floor (moveable), item (moveable)
        // console.log(`x: ${point.x} y: ${point.y}`)
        if (MAP[point.y][point.x] === ' ') {
          MAP[point.y][point.x] = item
          return true
        }
        // TODO: move a zigzag outwards looking for an empty spot until past the boundaries of the map
      }
      pointCount--
    }

    randomAttempts--
  }
  return false
}

// easy mode
function spawnAt (x, y, item = '^') {
  // Does minimumDistance exceed map width and height? Just stick the item in the futhest corner, moving inwards diagonally for placement

}

// TODO
// TODO: functions for each of the player's possible actions
function playerListen (socketId) {
  // Skips the player's movement turn, listens for other players.
  // Returns a rough direction
}

// TODO
function seenMap (socketId) {
  // create a binary map of "seen" tiles, OR it against the main map
}

// TODO
// TODO: does whatever is at the tile: teleporter, pick up an item, activate a trap...
function resolveTile (socketId) {

}

function visiblePlayers (socketId, visibleMap) {
  // If a player is on a square that is not 0, display them
  return PLAYERS.filter(player => {
    return visibleMap[player.y][player.x] !== 0
  })
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
  const mapHeight = map.length
  const mapWidth = map[0].length

  // TODO: should we get viewDistance from paths?
  // everything is hidden until a path reveals it
  let shownMap = [...Array(mapHeight)].map(columnItem => Array(mapWidth).fill('0'))
  shownMap[playerY][playerX] = MAP[playerY][playerX]

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

      if (MOVEABLE_SQUARES.includes(MAP[y][x])) {
        shownMap[y][x] = MAP[y][x]
      } else {
        shownMap[y][x] = MAP[y][x]
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

      if (direction === LEFT && MOVEABLE_SQUARES.includes(MAP[y][x - 1])) {
        shownMap[y][x - 1] = MAP[y][x - 1]
        x--
      } else if (direction === UP && MOVEABLE_SQUARES.includes(MAP[y - 1][x])) {
        shownMap[y - 1][x] = MAP[y - 1][x]
        y--
      } else if (direction === RIGHT && MOVEABLE_SQUARES.includes(MAP[y][x + 1])) {
        shownMap[y][x + 1] = MAP[y][x + 1]
        x++
      } else if (direction === DOWN && MOVEABLE_SQUARES.includes(MAP[y + 1][x])) {
        shownMap[y + 1][x] = MAP[y + 1][x]
        y++
      } else if (direction === LEFT) {
        // TODO: clean this up
        shownMap[y][x - 1] = MAP[y][x - 1]
        continue
      } else if (direction === UP) {
        shownMap[y - 1][x] = MAP[y - 1][x]
        continue
      } else if (direction === RIGHT) {
        shownMap[y][x + 1] = MAP[y][x + 1]
        continue
      } else if (direction === DOWN) {
        shownMap[y + 1][x] = MAP[y + 1][x]
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
  const player = thisPlayer(socketId)

  // TODO: move back out into its own function
  if (keyCode === LEFT && MOVEABLE_SQUARES.includes(MAP[player.y][player.x - 1])) {
    console.log('left')
    PLAYERS[PLAYERS.findIndex(player => player.id === socketId)].x--
    turnCounter++
  } else if (keyCode === UP && MOVEABLE_SQUARES.includes(MAP[player.y - 1][player.x])) {
    console.log('up')
    PLAYERS[PLAYERS.findIndex(player => player.id === socketId)].y--
    turnCounter++
  } else if (keyCode === RIGHT && MOVEABLE_SQUARES.includes(MAP[player.y][player.x + 1])) {
    console.log('right')
    PLAYERS[PLAYERS.findIndex(player => player.id === socketId)].x++
    turnCounter++
  } else if (keyCode === DOWN && MOVEABLE_SQUARES.includes(MAP[player.y + 1][player.x])) {
    console.log('down')
    PLAYERS[PLAYERS.findIndex(player => player.id === socketId)].y++
    turnCounter++
  } else {
    // Do nothing. Do not update the turn counter
  }
}
