const maps = require('../lib/maps')
const INPUT = require('../lib/input')


// TODO: not DRY
const MOVEABLE = 1
const UNMOVEABLE = -1

/* MAP will include maps for
 * bg
 * movement impedement (can generate this now)
 * items
 */

// MAP will not have players



// TODO: check and see if we may name this "Map"
module.exports = class Map {
  constructor () {
    // TODO: I want this to be readonly static
    this._TILE_TYPE = {
      TRAP: '#',
      EXIT: '>', // (down stairs)
      FLOOR: ' ',
      TREASURE: '^',
      UNSEEN: '0' // unknown/unseen, no fog of war
    }
    // TODO: Need to make this a const. May not be possible in JS...
    this.originalBgMap = maps.treasureHuntBg // TODO: pass in? Randomly load different ones?
    this._movementImpedimentMap = maps.treasureHuntMovementImpediment
    // TODO: want to generate maps in the future.... maybe
    this.height = this.originalBgMap.length
    this.width = this.originalBgMap[0].length
    this.currentBgMap = this.originalBgMap // TODO: moving to items, this may be obsolete unless bombs or something can modify this
    this.blankMap = [...Array(this.height)].map(columnItem => Array(this.width).fill(this._TILE_TYPE.UNSEEN))
    // TODO: this is not ideal
    this.isTreasurePlaced = false
    this.isTrapsPlaced = false
    this.generateMap()
  }


  // TODO: consider prefixing the local variables with an underscore
  get mapWidth () {
    return this.width
  }

  get mapHeight () {
    return this.height
  }

  get bgMap () {
    return this.currentBgMap
  }

  get movementImpedimentMap () {
    return this._movementImpedimentMap
  }

  get unseenMap () {
    // TODO: sort out how to use getters without creating a setter.
    // the solution seems to only be "name it something different"
    return this.blankMap
  }

  get TILE_TYPE () {
    return this._TILE_TYPE
  }

  generateMap (regenerate = false) {
    // TODO: figure out where to generate the map and how to prevent it from happening multiple times
    // I don't like how this has turned out
    if (regenerate) {
      this.isTreasurePlaced = false
      this.isTrapsPlaced = false
    }
    // TODO: should we check that everything has been placed, and if not, run this again?
    if (!this.isTreasurePlaced) {
      // TODO: randomize the spawn distance
      // TODO: put the randomized spawn thing into the lib/random file?
      this.isTreasurePlaced = this.spawnAtDistance(1, 1, 2, this._TILE_TYPE.TREASURE)
    }
    if (!this.isTrapsPlaced) {
      // printOut.humanReadableMap(MAP)
      this.isTrapsPlaced = this.spawnOnRows(80, 2, this._TILE_TYPE.TRAP)
    }
  }

  // TODO: remove this and replace with adding instances of the item class to an array at that point
  updateMapAt (x, y, item = this._TILE_TYPE.FLOOR) {
    this.currentBgMap[y][x] = item
  }

  // TODO: remove this and replace with adding instances of the item class to an array at that point
  spawnAt (x, y, item = this._TILE_TYPE.TREASURE, onlyFloorPlacement = true) {
    if (onlyFloorPlacement && this.currentBgMap[y][x] !== this._TILE_TYPE.FLOOR) {
      return false
    }

    if (x >= this.width || y >= this.height) {
      return false
    }

    // TODO: if placement is not possible, it would be nice for placement to be attempted
    this.currentBgMap[y][x] = item
    return true
  }

  // TODO: remove this and replace with adding instances of the item class to an array at that point
  spawnAtDistance (startX, startY, targetDistance, item = this._TILE_TYPE.TREASURE) {
    let randomAttempts = 10
    while (randomAttempts > 0) {
      // create a random point that adds up to targetDistance, check the positive and negative x,y combinations and see if it is on the board on any of them
      let x = Math.round((Math.random() * targetDistance))
      let y = targetDistance - x
      let testPoints = [{y: startY - y, x: startX - x},
                        {y: startY - y, x: startX + x},
                        {y: startY + y, x: startX - x},
                        {y: startY + y, x: startX + x}]

      let pointCount = 4
      while (pointCount > 0) {
        let point = testPoints.splice(Math.floor(Math.random() * testPoints.length), 1)[0]

        // is inside of the map's boundaries?
        if (point.x >= 0 && point.x < this.width && point.y >=0 && point.y < this.height) {
          // Is not a wall or unplaceable?
          // TODO: not hard coded, we need a system of wall (not moveable), floor (moveable), item (moveable)
          if (this.currentBgMap[point.y][point.x] === this._TILE_TYPE.FLOOR) {
            // TODO: change to an item map
            this.currentBgMap[point.y][point.x] = item
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

  // TODO: remove this and replace with adding instances of the item class to an array at that point
  spawnOnRows (targetPercentageY, targetNumberX, item = this._TILE_TYPE.TRAP) {
    let yAttempted = 0
    let ySucceeded = 0
    let xAttempted = 0
    let xSucceeded = 0
    let isYUsed = false
    let spawnOnRowResult = false
    this.currentBgMap.forEach((y, indexY) => {
      yAttempted++
      if (Math.random() * 100 < targetPercentageY) {
        for (let spawnAttempt = 0; spawnAttempt < targetNumberX; spawnAttempt++) {
          xAttempted++
          spawnOnRowResult = this.spawnOnRow(indexY, item)
          if (spawnOnRowResult) {
            xSucceeded++
          }
          isYUsed = isYUsed || spawnOnRowResult
        }
        if (isYUsed) {
          ySucceeded++
        }
        isYUsed = false
      }
    })
    console.log(`Spawned ${item} on ${ySucceeded}/${yAttempted} rows. Target: ${xAttempted} Actual: ${xSucceeded}`)
    return true
  }

  // TODO: remove this and replace with adding instances of the item class to an array at that point
  spawnOnRow (rowY, item = this._TILE_TYPE.TRAP) {
    // Find a point in the row and place if possible
    const startX = Math.floor(Math.random() * this.width)
    let index = startX + 1
    while (index !== startX) {
      if (index > this.width) {
        // wrap
        index = 0
      }

      if (this.currentBgMap[rowY][index] === this._TILE_TYPE.FLOOR) {
        // TODO: change when items are implemented
        this.currentBgMap[rowY][index] = item
        return true
      }
      index++
    }
    return false
  }

  // TODO: update to display items
  visibleMap (player) {
    const viewDistance = player.status.viewDistance
    // TODO: check if there is a wall directly in front of them in a direction and skip this logic if true
    const lookingPaths = this.lookPaths(INPUT.DOWN, INPUT.RIGHT, viewDistance).concat(
    this.lookPaths(INPUT.RIGHT, INPUT.UP, viewDistance)).concat(
    this.lookPaths(INPUT.UP, INPUT.LEFT, viewDistance)).concat(
    this.lookPaths(INPUT.LEFT, INPUT.DOWN, viewDistance))

    // let visibleMap = mapRevealer(player.x, player.y, MAP, lookingPaths, viewDistance)
    // apply "sounds" to the map for other players?
    // return visibleMap

    // TODO: these names suck
    return this.mapRevealer(player, lookingPaths)
  }

  lookPaths (direction, secondDirection, distance) {
    // All paths to look in one direction (UP, RIGHT, DOWN, LEFT) based on a quadrant (e.g. UP & UPPER-LEFT)
    let resultPaths = []
    if (distance === 1) {
      resultPaths = [direction]
    } else {
      let start = Math.pow(2, distance) - 1
      const requiredLength = this.dec2bin(start).length
      while (start > 0) {
        let binary = this.dec2bin(start)
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
  dec2bin (dec) {
    return (dec >>> 0).toString(2)
  }

  mapRevealer (player, paths) {
    const playerX = player.x
    const playerY = player.y
    const viewDistance = player.status.viewDistance
    // everything is hidden until a path reveals it
    // let shownMap = Object.assign(this.unseenMap)
    let shownMap = player.seenMap
    // current tile
    shownMap[playerY][playerX] = this.currentBgMap[playerY][playerX]

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

        if (this.isMoveable(this._movementImpedimentMap[y][x])) {
          shownMap[y][x] = this.currentBgMap[y][x]
        } else {
          shownMap[y][x] = this.currentBgMap[y][x]
          continue
        }
      }
    }

    paths.forEach(path => {
      let x = playerX
      let y = playerY

      // TODO: return on a wall
      // change this from forEach so we can break from it when hitting a wall
      for (let index = 0; index < path.length; index++) {
        let direction = path[index]

        if (direction === INPUT.LEFT && this.isMoveable(this._movementImpedimentMap[y][x - 1])) {
          shownMap[y][x - 1] = this.currentBgMap[y][x - 1]
          x--
        } else if (direction === INPUT.UP && this.isMoveable(this._movementImpedimentMap[y - 1][x])) {
          shownMap[y - 1][x] = this.currentBgMap[y - 1][x]
          y--
        } else if (direction === INPUT.RIGHT && this.isMoveable(this._movementImpedimentMap[y][x + 1])) {
          shownMap[y][x + 1] = this.currentBgMap[y][x + 1]
          x++
        } else if (direction === INPUT.DOWN && this.isMoveable(this._movementImpedimentMap[y + 1][x])) {
          shownMap[y + 1][x] = this.currentBgMap[y + 1][x]
          y++
        } else if (direction === INPUT.LEFT) {
          // TODO: clean this up
          shownMap[y][x - 1] = this.currentBgMap[y][x - 1]
          continue
        } else if (direction === INPUT.UP) {
          shownMap[y - 1][x] = this.currentBgMap[y - 1][x]
          continue
        } else if (direction === INPUT.RIGHT) {
          shownMap[y][x + 1] = this.currentBgMap[y][x + 1]
          continue
        } else if (direction === INPUT.DOWN) {
          shownMap[y + 1][x] = this.currentBgMap[y + 1][x]
          continue
        }
      }
    })
    return shownMap
  }

  isMoveable (movementTile) {
    return movementTile >= MOVEABLE // currently MOVEABLE is always 1
  }
}
