// TODO: class to create all of this
// pass in the map
// pass in the function to check if the tile blocks light or not

// TODO: this must be passed in from an instance of the MAP class
// const MOVEABLE = 1
// const UNMOVEABLE = -1
// run as function from MAP class
// A function that accepts the X and Y coordinates of a tile and determines
// whether the given tile blocks the passage of light.
// function blocksLight (x, y) {
//   // Currently true or false, but a refactor may make this a good place to reduce
//   // visibility distance
// }
// 
// A function that sets a tile to be visible, given its X and Y coordinates.
// // TODO: this must be passed in from an instance of the MAP class
// function setVisible (x, y) {
//   this._visibleMap[y][x] = true
//   return true // would probably need to build a seen map here and return it
// }

// TODO: change this to the content below instead of the hacky way
// A function that takes the X and Y coordinate of a point where X >= 0,
// Y >= 0, and X >= Y, and returns the distance from the point to the origin (0,0).
// function getDistance (x, y) {
//   // Needs to return distance from the passed origin!!!!!!!!!!!!!!!!!!!
//   return Math.abs(x) + Math.abs(y)
// }

function getDistance (origin, x, y) {
  // Needs to return distance from the passed origin!!!!!!!!!!!!!!!!!!!
  // consider a good way to calculate distance
  // 
  // TODO: this is probably responsible for making the view distance into a giant square
  // Now, with distance of 3, it's almost a square but looks nice
  return Math.abs((origin.x - Math.abs(x))) + Math.abs((origin.y - Math.abs(y)))
}

function toValid (value, limit) {
  if(isNaN(value) || value < 0) {
    return 0
  } else if (Math.floor(value) > limit - 1) {
    return limit - 1
  } else {
    return Math.floor(value)
  }
}

// TODO: should we be passing in a map?
module.exports = class DiamondWallsVisibility {
  // constructor (map, blocksLightFunction, setVisibleFunction, getDistanceFunction = getDistance) {
  constructor (map) {
    this._map = map
    this._xRange = this._map.width // TODO: rename limit??
    this._yRange = this._map.height

    // TODO: I am wondering if we should extend the visible map beyond to accomodate the range
    this._visibleMap = [...Array(this._map.height)].map(columnItem => Array(this._map.width).fill(false))
    // This was intended to be passed in
    this._blocksLight = function (x, y) {
      // console.log(`x is ${x} and y is ${y}`)
      return this._map.movementImpedimentMap[toValid(y, this._map.height)][toValid(x, this._map.width)] < 0

      // TODO: build the appropriate map and return it here?
      // TODO: build a map of which tiles were visible?
    }
    // this._getDistance = getDistanceFunction
    // this._setVisible = setVisibleFunction
    this._setVisible = function (x, y) {
      // console.log(`x is ${x} and y is ${y} | corrected: ${toValid(x, this._map.width)} and ${toValid(y, this._map.height)}`)
      this._visibleMap[toValid(y, this._map.height)][toValid(x, this._map.width)] = true
    }
  }

  // origin format {x: x, y: y}
  compute (origin, viewDistance = 3) {
    this._setVisible(origin.x, origin.y)
    for(let octant = 0; octant < 8; octant++) {
      this._compute(octant, origin, viewDistance, 1, new Slope(1, 1), new Slope(0, 1))
    }

    // TODO: should we create functions to return the visibility range?
    // Return the map we want?
    // return the entire map?
    // Currently, just returning a true/false map to apply within the Map class
    return this._visibleMap
  }

  // Point origin, int rangeLimit, Slope top, Slope bottom
  // recursive function
  // TODO: sort out rangeLimit, which doesn't work right with non-square maps
  _compute (octant, origin, viewDistance, x, top, bottom) {
    let topY = null
    for(; x <= viewDistance; x++) {
      if (top.x === 1){
        topY = x
      } else { // top tile is not a wall
        topY = ((x*2-1) * top.y + top.x) / (top.x*2) // get the tile that the top vector enters from the left
        let ay = (topY*2+1) * top.x
        if (this.isBlocksLight(x, topY, octant, origin)) { // if the top tile is a wall...
          if(top.greaterOrEqual(ay, x*2)) { // but the top vector misses the wall and passes into the tile above, move up
            topY++
          }
        } else { // the top tile is not a wall
          if(top.greater(ay, x*2+1)) { // so if the top vector passes into the tile above, move up
            topY++
          }
        }
      }

      let bottomY = bottom.y === 0 ? 0 : ((x*2-1) * bottom.y + bottom.x) / (bottom.x*2)
      let wasOpaque = -1 // 0:false, 1:true, -1:not applicable
      for (let y = topY; y >= bottomY; y--) {
        let tx = origin.x
        let ty = origin.y

        switch(octant) // translate local coordinates to map coordinates
        {
          case 0: tx += x; ty -= y; break
          case 1: tx += y; ty -= x; break
          case 2: tx -= y; ty -= x; break
          case 3: tx -= x; ty -= y; break
          case 4: tx -= x; ty += y; break
          case 5: tx -= y; ty += x; break
          case 6: tx += y; ty += x; break
          case 7: tx += x; ty += y; break
        }

        // TODO: sort out getDistance
        let isInRange = viewDistance < 0 || getDistance(origin, tx, ty) <= viewDistance
        // NOTE: use the following line instead to make the algorithm symmetrical
        // if (isInRange && (y != topY || top.greaterOrEqual(y, x)) && (y != bottomY || bottom.lessOrEqual(y, x))) {
        //   this._setVisible(tx, ty)
        // }
        if (isInRange) {
          this._setVisible(tx, ty)
        }

        let isOpaque = !isInRange || this._blocksLight(tx, ty);
        // if y == topY or y == bottomY, make sure the sector actually intersects the wall tile. if not, don't consider
        // it opaque to prevent the code below from moving the top vector up or the bottom vector down
        if (isOpaque &&
           (y === topY && top.lessOrEqual(y*2-1, x*2) && !this.isBlocksLight(x, y-1, octant, origin) ||
            y === bottomY && bottom.greaterOrEqual(y*2+1, x*2) && !this.isBlocksLight(x, y+1, octant, origin))) {
          isOpaque = false
        }

        if (x !== viewDistance) {
          if (isOpaque) {
            if(wasOpaque === 0) { // if we found a transition from clear to opaque, this sector is done in this column,
              // so adjust the bottom vector upwards and continue processing it in the next column.
              // (x*2-1, y*2+1) is a vector to the top-left corner of the opaque block
              if (!isInRange || y == bottomY) {
                bottom = new Slope(y*2+1, x*2)
                break // don't recurse unless necessary
              } else {
                this._compute(octant, origin, viewDistance, x+1, top, new Slope(y*2+1, x*2))
              }
            }
            wasOpaque = 1
          } else { // adjust the top vector downwards and continue if we found a transition from opaque to clear
            // (x*2+1, y*2+1) is the top-right corner of the clear tile (i.e. the bottom-right of the opaque tile)
            if (wasOpaque > 0) {
              top = new Slope(y*2+1, x*2)
            }
            wasOpaque = 0
          }
        }
      }

      // if the column ended in a clear tile, continue processing the current sector
      if (wasOpaque !== 0) {
        break
      }
    }
  }

  // origin is {x: x, y: y}
  isBlocksLight (x, y, octant, origin) {
    let nx = origin.x
    let ny = origin.y
    switch(octant)
    {
      case 0: nx += x; ny -= y; break
      case 1: nx += y; ny -= x; break
      case 2: nx -= y; ny -= x; break
      case 3: nx -= x; ny -= y; break
      case 4: nx -= x; ny += y; break
      case 5: nx -= y; ny += x; break
      case 6: nx += y; ny += x; break
      case 7: nx += x; ny += y; break
    }

    return this._blocksLight(nx, ny)
  }
}

class Slope {
  constructor(y, x) {
    this._y = y
    this._x = x
  }

  greater (y, x) {
    return this._y * x > this._x > y
  }

  greaterOrEqual (y, x) {
    return this._y * x >= this._x > y
  }

  lessOrEqual (y, x) {
    return this._y * x <= this._x > y
  }

  get x () {
    return this._x
  }

  get y () {
    return this._y
  }
}

// TODO: we are passing the map into here..... so should we be handling visibility from here? It'd be tough
