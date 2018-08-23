const maps = require('../lib/maps')
const INPUT = require('../lib/input')
const item = require('../classes/Item')


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
    this._height = this.originalBgMap.length
    this._width = this.originalBgMap[0].length
    // TODO: rename these "map" things "layer"
    this._bgMap = this.originalBgMap
    this._itemMap = [...Array(this.height)].map(columnItem => Array(this.width).fill(null))
    this._unseenMap = [...Array(this.height)].map(columnItem => Array(this.width).fill(this._TILE_TYPE.UNSEEN))
    // TODO: this is not ideal
    this.isTreasurePlaced = false
    this.isTrapsPlaced = false
    this.generateMap()
  }


  // TODO: consider prefixing the local variables with an underscore
  // This is a good idea, implementing
  get width () {
    return this._width
  }

  get height () {
    return this._height
  }

  get bgMap () {
    return this._bgMap
  }

  get movementImpedimentMap () {
    return this._movementImpedimentMap
  }

  get unseenMap () {
    // TODO: sort out how to use getters without creating a setter.
    // the solution seems to only be "name it something different"
    return this._unseenMap
  }

  get itemMap () {
    return this._itemMap
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
      this.isTreasurePlaced = this.spawnItemAtDistance(1, 1, 2, this._TILE_TYPE.TREASURE)
    }
    if (!this.isTrapsPlaced) {
      // printOut.humanReadableMap(MAP)
      this.isTrapsPlaced = this.spawnItemsOnRows(80, 2, this._TILE_TYPE.TRAP)
    }
  }

  addItemAt (x, y, itemType = this._TILE_TYPE.FLOOR) {
    if (this._itemMap[y][x] === null) {
      this._itemMap[y][x] = []
    }
    this._itemMap[y][x].push(new item(itemType))
  }

  // TODO: move onlyFloorPlacement to addItemAt????
  spawnItemAt (x, y, itemType = this._TILE_TYPE.TREASURE, onlyFloorPlacement = true) {
    if (onlyFloorPlacement && this._bgMap[y][x] !== this._TILE_TYPE.FLOOR) {
      return false
    }

    if (x >= this._width || y >= this._height) {
      return false
    }

    // TODO: if placement is not possible, it would be nice for placement to be attempted
    this.addItemAt(x, y, itemType)
    return true
  }

  spawnItemAtDistance (startX, startY, targetDistance, itemType = this._TILE_TYPE.TREASURE) {
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
        if (point.x >= 0 && point.x < this._width && point.y >=0 && point.y < this._height) {
          // Is not a wall or unplaceable?
          // TODO: not hard coded, we need a system of wall (not moveable), floor (moveable), item (moveable)
          if (this._bgMap[point.y][point.x] === this._TILE_TYPE.FLOOR) {
            this.addItemAt(point.x, point.y, itemType)
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

  spawnItemsOnRows (targetPercentageY, targetNumberX, itemType = this._TILE_TYPE.TRAP) {
    let yAttempted = 0
    let ySucceeded = 0
    let xAttempted = 0
    let xSucceeded = 0
    let isYUsed = false
    let spawnItemOnRowResult = false
    this._bgMap.forEach((y, indexY) => {
      yAttempted++
      if (Math.random() * 100 < targetPercentageY) {
        for (let spawnItemAttempt = 0; spawnItemAttempt < targetNumberX; spawnItemAttempt++) {
          xAttempted++
          spawnItemOnRowResult = this.spawnItemOnRow(indexY, itemType)
          if (spawnItemOnRowResult) {
            xSucceeded++
          }
          isYUsed = isYUsed || spawnItemOnRowResult
        }
        if (isYUsed) {
          ySucceeded++
        }
        isYUsed = false
      }
    })
    console.log(`Spawned ${itemType} on ${ySucceeded}/${yAttempted} rows. Target: ${xAttempted} Actual: ${xSucceeded}`)
    return true
  }

  spawnItemOnRow (rowY, itemType = this._TILE_TYPE.TRAP) {
    // Find a point in the row and place if possible
    const startX = Math.floor(Math.random() * this._width)
    let index = startX + 1
    while (index !== startX) {
      if (index > this._width) {
        // wrap
        index = 0
      }

      if (this._bgMap[rowY][index] === this._TILE_TYPE.FLOOR) {
        this.addItemAt(index, rowY, itemType)
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

    // TODO: add the diagonals into lookPaths????

    // let visibleMap = mapRevealer(player.x, player.y, MAP, lookingPaths, viewDistance)
    // apply "sounds" to the map for other players?
    // return visibleMap

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
    let shownBgMap = player.seenMap
    // current tile
    shownBgMap[playerY][playerX] = this._bgMap[playerY][playerX]

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
          shownBgMap[y][x] = this._bgMap[y][x]
        } else {
          shownBgMap[y][x] = this._bgMap[y][x]
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

        if (direction === INPUT.LEFT) {
          // TODO: could we just do x-- here and skip all of these nested if statements?
          //
          shownBgMap[y][x - 1] = this._bgMap[y][x - 1]
          if(this.isMoveable(this._movementImpedimentMap[y][x - 1])) {
            x--
          } else {
            continue
          }
        } else if (direction === INPUT.UP) {
          shownBgMap[y - 1][x] = this._bgMap[y - 1][x]
          if(this.isMoveable(this._movementImpedimentMap[y - 1][x])) {
            y--
          } else {
            continue
          }
        } else if (direction === INPUT.RIGHT) {
          shownBgMap[y][x + 1] = this._bgMap[y][x + 1]
          if (this.isMoveable(this._movementImpedimentMap[y][x + 1])) {
            x++
          } else {
            continue
          }
        } else if (direction === INPUT.DOWN) {
          shownBgMap[y + 1][x] = this._bgMap[y + 1][x]
          if(this.isMoveable(this._movementImpedimentMap[y + 1][x])) {
            y++
          } else {
            continue
          }
        }
      }
    })
    return shownBgMap
  }

  isMoveable (movementTile) {
    return movementTile >= MOVEABLE // currently MOVEABLE is always 1. This will change later when "moves" are implemented
  }
}
