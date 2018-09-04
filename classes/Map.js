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

module.exports = class Map {
  constructor () {
    // TODO: I want this to be readonly static
    // TODO: break this into _TILE_TYPE and _ITEM_TYPE
    this._TILE_TYPE = {
      TRAP: '#',
      EXIT: '>', // (down stairs)
      FLOOR: ' ',
      TREASURE: '^',
      UNSEEN: '0' // unknown/unseen, no fog of war
    }
    // TODO: Need to make this a const. May not be possible in JS...
    this._originalBgMap = maps.trapWorldBg // TODO: pass in? Randomly load different ones?
    this._movementImpedimentMap = maps.trapWorldMovementImpediment
    // TODO: want to generate maps in the future.... maybe
    this._height = this._originalBgMap.length
    this._width = this._originalBgMap[0].length
    // TODO: rename these "map" things "layer"
    this._bgMap = this._originalBgMap
    this._itemMap = [...Array(this.height)].map(columnItem => Array(this.width).fill(null))
    // TODO: in order to get the item map and unseen map working together, probably make empty/unseen into NULL for both. Currently it is null for item and 0 for bg
    this._unseenItemMap = [...Array(this.height)].map(columnItem => Array(this.width).fill(null))
    this._unseenBgMap = [...Array(this.height)].map(columnItem => Array(this.width).fill(this._TILE_TYPE.UNSEEN))
    // TODO: this is not ideal
    this._isTreasurePlaced = false
    this._isTrapsPlaced = false
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

  get unseenItemMap () {
    return this._unseenItemMap
  }

  get unseenBgMap () {
    // TODO: sort out how to use getters without creating a setter.
    // the solution seems to only be "name it something different"
    return this._unseenBgMap
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
      this._isTreasurePlaced = false
      this._isTrapsPlaced = false
    }
    // TODO: should we check that everything has been placed, and if not, run this again?
    if (!this._isTreasurePlaced) {
      // TODO: randomize the spawn distance
      // TODO: put the randomized spawn thing into the lib/random file?
      this._isTreasurePlaced = this.spawnItemAtDistance(1, 1, 2, this._TILE_TYPE.TREASURE)
    }
    if (!this._isTrapsPlaced) {
      // printOut.humanReadableMap(MAP)
      this._isTrapsPlaced = this.spawnItemsOnRows(80, 2, this._TILE_TYPE.TRAP)
    }
  }

  // TODO: once we have bg, item, and movement set up, should they all be wrapped into one function?
  addItemAt (x, y, itemType = this._TILE_TYPE.TRAP) {
    if (this._itemMap[y][x] === null) {
      this._itemMap[y][x] = []
    }
    this._itemMap[y][x].push(new item(itemType))
  }

  // TODO: a system to remove 1, more than 1, or all
  removeItemAt (x, y, itemType = this._TILE_TYPE.TRAP) {
    // removes one instance at that location and assume that it exists
    const foundIndex = this._itemMap[y][x].findIndex(x => {
      return x.type === itemType
    })
    this._itemMap[y][x] = this._itemMap[y][x].splice(1, foundIndex)

    if (this._itemMap[y][x] === []) {
      this._itemMap[y][x] = null
    }
  }

  // TODO: is this pointless?
  getItemsAt (x, y) {
    return this._itemMap[y][x]
  }

  // TODO: possibly implement
  isItemAt (x, y, itemType) {
    // TODO: I just realized that we need to handle empty arrays
    if (this._itemMap[y][x] === null || this._itemMap[y][x] === []) {
      return
    }

    return this._itemMap[y][x].some(item => {
      return item.type === itemType
    })
  }

  // TODO: this has not been tested for stacks, only for single items
  consumeItemAt (x, y, itemType, maxAmount = 1) {
    let consumedItems = []
    for(var i = 0; i < this._itemMap[y][x].length; i++) {
      if(this._itemMap[y][x][i].type === itemType) {
        if (maxAmount > 0) {
          consumedItems.push(this._itemMap[y][x].splice(i, 1)[0])
          maxAmount--
        } else {
          // TODO: we need to make a decision about default values. The defaults for item map are null. Should it be empty arrays?
          this._itemMap[y][x] = null
          break
        }
      }
    }
    return consumedItems
  }

  // TODO: move onlyFloorPlacement to addItemAt????
  spawnItemAt (x, y, itemType = this._TILE_TYPE.TREASURE, onlyFloorPlacement = true) {
    // TODO: better logic for only floor placement
    if (onlyFloorPlacement && this._bgMap[y][x] !== this._TILE_TYPE.FLOOR && !this.isInMap(x, y)) {
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

        if (this.isInMap(point.x, point.y)) {
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

  isInMap (x, y) {
    // includes border walls
    return x >= 0 && x < this._width && y >= 0 && y < this._height
  }

  isWithinMapBounds (x, y) {
    // does not include border walls
    return x > 0 && x < this._width && y > 0 && y < this._height
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
  // TODO: check out this amazing page: http://www.adammil.net/blog/v125_Roguelike_Vision_Algorithms.html#diamondwalls
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

    // returns { shownBgMap, shownItemMap }
    // TODO: where should we add fogOfWar? Here seems right, but this is getting convoluted
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

  dec2bin (dec) {
    return (dec >>> 0).toString(2)
  }

  mapRevealer (player, paths) {
    const playerX = player.x
    const playerY = player.y
    const viewDistance = player.status.viewDistance

    // everything is hidden until a path reveals it
    let shownBgMap = player.seenBgMap
    let shownItemMap = player.seenItemMap
    let fogOfWarMap = [...Array(this.height)].map(columnItem => Array(this.width).fill(true))

    // current tile
    shownBgMap[playerY][playerX] = this._bgMap[playerY][playerX]
    shownItemMap[playerY][playerX] = this._itemMap[playerY][playerX]
    fogOfWarMap[playerY][playerX] = false

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
          // TODO: implement visibility of items here
          shownItemMap[y][x] = this._itemMap[y][x]
        } else {
          shownBgMap[y][x] = this._bgMap[y][x]
          // TODO: implement visibility of items here
          shownItemMap[y][x] = this._itemMap[y][x]
          continue
        }
      }
    }

    paths.forEach(path => {
      let x = playerX
      let y = playerY
      // TODO: oh man, I never program when drunk, but I am drunk now.
      // This is here to hopefully make things more DRY, because I am very unhappy with how this section looks
      // It just looks.... wrong.
      // Also, another TODO: calm down with the comments. You hate comments. However, this project is
      // very unlike any of your other projects: you are coding for fun without a plan and seeing where
      // this ends up.
      // TODO: put this comment into another file. lol
      let lookX = null
      let lookY = null

      // TODO: fog of war need diagonals!

      // TODO: return on a wall
      // change this from forEach so we can break from it when hitting a wall
      for (let index = 0; index < path.length; index++) {
        switch (path[index]) {
          case INPUT.LEFT:
            // TODO: could we just do x-- here and skip all of these nested if statements?
            // (tried it, and was looking through walls :/ I think the continues just prevent any further looking. Maybe revisit this later because this is a bit weird
            lookX = x - 1
            lookY = y
            break
          case INPUT.UP:
            lookX = x
            lookY = y - 1
            break
          case INPUT.RIGHT:
            lookX = x + 1
            lookY = y
            break
          case INPUT.DOWN:
            lookX = x
            lookY = y + 1
            break
        }

        shownBgMap[lookY][lookX] = this._bgMap[lookY][lookX]
        shownItemMap[lookY][lookX] = this._itemMap[lookY][lookX]
        fogOfWarMap[lookY][lookX] = false

        switch (path[index]) {
          case INPUT.LEFT:
            if(this.isMoveable(this._movementImpedimentMap[lookY][lookX])) {
              x--
            } else {
              continue
            }
          break
          case INPUT.UP:
            if(this.isMoveable(this._movementImpedimentMap[lookY][lookX])) {
              y--
            } else {
              continue
            }
          break
          case INPUT.RIGHT:
            if(this.isMoveable(this._movementImpedimentMap[lookY][lookX])) {
              x++
            } else {
              continue
            }
          break
          case INPUT.DOWN:
            if(this.isMoveable(this._movementImpedimentMap[lookY][lookX])) {
              y++
            } else {
              continue
            }
          break
        }
      }
    })

    return { shownBgMap, shownItemMap, fogOfWarMap }
  }

  isMoveable (movementTile) {
    return movementTile >= MOVEABLE // currently MOVEABLE is always 1. This will change later when "moves" are implemented
  }
}
