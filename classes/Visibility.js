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
// 
// }

// TODO: change this to the content below instead of the hacky way
// A function that takes the X and Y coordinate of a point where X >= 0,
// Y >= 0, and X >= Y, and returns the distance from the point to the origin (0,0).
function getDistance (x, y) {
  return Math.abs(x) + Math.abs(y)
}

// TODO: should we be passing in a map?
module.exports = class DiamondWallsVisibility {
  // constructor (map, blocksLightFunction, setVisibleFunction, getDistanceFunction = getDistance) {
  constructor (map, setVisibleFunction, getDistanceFunction = getDistance) {
    this._map = map
    // This was intended to be passed in
    this._blocksLight = function (x, y) {
      // TODO: x and y were coming in as NaN and weird floats
      // console.log(`x is ${x} and y is ${y}`)
      return this._map.movementImpedimentMap[y][x] >= 1
      // TODO: build the appropriate map and return it here?
      // TODO: build a map of which tiles were visible?
    }
    this._getDistance = getDistanceFunction
    this._setVisible = setVisibleFunction
  }

  // origin format {x: x, y: y}
  compute (origin, rangeLimit = 3) {
    this._setVisible(origin.X, origin.Y);
    for(let octant = 0; octant < 8; octant++) {
      this._compute(octant, origin, rangeLimit, 1, new Slope(1, 1), new Slope(0, 1))
    }
  }

  // Point origin, int rangeLimit, Slope top, Slope bottom
  // recursive function
  _compute (octant, origin, rangeLimit, x, top, bottom) {
    let topY = null
    for(; x <= rangeLimit; x++) {
      if (top.X === 1){
        topY = x
      } else { // top tile is not a wall
        topY = ((x*2-1) * top.Y + top.X) / (top.X*2) // get the tile that the top vector enters from the left
        let ay = (topY*2+1) * top.X
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

      let bottomY = bottom.Y === 0 ? 0 : ((x*2-1) * bottom.Y + bottom.X) / (bottom.X*2)
      let wasOpaque = -1 // 0:false, 1:true, -1:not applicable
      for (let y = topY; y >= bottomY; y--) {
        let tx = origin.X
        let ty = origin.Y


        // TODO: my hacky fix
        if (isNaN(tx) || isNaN(ty)) {
          continue
        }

        switch(octant) // translate local coordinates to map coordinates
        {
          case 0: tx += x; ty -= y; break; // TODO: check if this syntax is allowed
          case 1: tx += y; ty -= x; break;
          case 2: tx -= y; ty -= x; break;
          case 3: tx -= x; ty -= y; break;
          case 4: tx -= x; ty += y; break;
          case 5: tx -= y; ty += x; break;
          case 6: tx += y; ty += x; break;
          case 7: tx += x; ty += y; break;
        }




        // TODO: my hacky fix
        if (tx < 0 || ty < 0) {
          continue
        }



        let isInRange = rangeLimit < 0 || this._getDistance(tx, ty) <= rangeLimit
        // NOTE: use the following line instead to make the algorithm symmetrical
        // if(isInRange && (y != topY || top.greaterOrEqual(y, x)) && (y != bottomY || bottom.lessOrEqual(y, x))) this._setVisible(tx, ty);
        if (isInRange) {
          this._setVisible(tx, ty)
        }

        let isOpaque = !isInRange || this._blocksLight(tx, ty);
        // if y == topY or y == bottomY, make sure the sector actually intersects the wall tile. if not, don't consider
        // it opaque to prevent the code below from moving the top vector up or the bottom vector down
        if (isOpaque &&
           (y === topY && top.lessOrEqual(y*2-1, x*2) && !this.isBlocksLight(x, y-1, octant, origin) ||
            y === bottomY && bottom.greaterOrEqual(y*2+1, x*2) && !this.isBlocksLight(x, y+1, octant, origin))) {
          isOpaque = false;
        }

        if (x !== rangeLimit) {
          if (isOpaque) {
            if(wasOpaque === 0) { // if we found a transition from clear to opaque, this sector is done in this column,
              // so adjust the bottom vector upwards and continue processing it in the next column.
              // (x*2-1, y*2+1) is a vector to the top-left corner of the opaque block
              if (!isInRange || y == bottomY) {
                bottom = new Slope(y*2+1, x*2)
                break // don't recurse unless necessary
              } else {
                this._compute(octant, origin, rangeLimit, x+1, top, new Slope(y*2+1, x*2))
              }
            }
            wasOpaque = 1
          } else { // adjust the top vector downwards and continue if we found a transition from opaque to clear
            // (x*2+1, y*2+1) is the top-right corner of the clear tile (i.e. the bottom-right of the opaque tile)
            if (wasOpaque > 0) {
              top = new Slope(y*2+1, x*2)
            }
            wasOpaque = 0;
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
      case 0: nx += x; ny -= y; break; // Is this allowed?
      case 1: nx += y; ny -= x; break;
      case 2: nx -= y; ny -= x; break;
      case 3: nx -= x; ny -= y; break;
      case 4: nx -= x; ny += y; break;
      case 5: nx -= y; ny += x; break;
      case 6: nx += y; ny += x; break;
      case 7: nx += x; ny += y; break;
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

  get X () {
    return this._x
  }

  get Y () {
    return this._y
  }


  // TODO: figure out if we want the above to be capital
  get x () {
    return this._x
  }

  get y () {
    return this._y
  }
}

// 
// 
// 
// 
// 
//   visibleMap (player) {
//     const viewDistance = player.status.viewDistance
//     // TODO: check if there is a wall directly in front of them in a direction and skip this logic if true
// 
//     // let visibleMap = mapRevealer(player.x, player.y, MAP, lookingPaths, viewDistance)
//     // apply "sounds" to the map for other players?
//     // return visibleMap
// 
//     // returns { shownBgMap, shownItemMap }
//     // TODO: where should we add fogOfWar? Here seems right, but this is getting convoluted
//     return this.mapRevealer(player, lookingPaths)
//   }
// 
//   mapRevealer (player, paths) {
//     const playerX = player.x
//     const playerY = player.y
//     const viewDistance = player.status.viewDistance
// 
//     // everything is hidden until a path reveals it
//     let shownBgMap = player.seenBgMap
//     let shownItemMap = player.seenItemMap
//     let fogOfWarMap = [...Array(this.height)].map(columnItem => Array(this.width).fill(true))
// 
//     // current tile
//     shownBgMap[playerY][playerX] = this._bgMap[playerY][playerX]
//     shownItemMap[playerY][playerX] = this._itemMap[playerY][playerX]
//     fogOfWarMap[playerY][playerX] = false
// 
//     // oh no, we need to explicitly check diagonals or rework the view system
//     // TODO: rework the view system to get diagonals in there. Maybe check for wall collisions on evens?
// 
// 
// 
// 
//         if (this.isMoveable(this._movementImpedimentMap[y][x])) {
//           shownBgMap[y][x] = this._bgMap[y][x]
//           // TODO: implement visibility of items here
//           shownItemMap[y][x] = this._itemMap[y][x]
//         } else {
//           shownBgMap[y][x] = this._bgMap[y][x]
//           // TODO: implement visibility of items here
//           shownItemMap[y][x] = this._itemMap[y][x]
//           continue
//         }
// 
// 
//       }
//     }
// 
// 
//         shownBgMap[lookY][lookX] = this._bgMap[lookY][lookX]
//         shownItemMap[lookY][lookX] = this._itemMap[lookY][lookX]
//         fogOfWarMap[lookY][lookX] = false
// 
// 
//     return { shownBgMap, shownItemMap, fogOfWarMap }
//   }
// 
//   isMoveable (movementTile) {
//     return movementTile >= MOVEABLE // currently MOVEABLE is always 1. This will change later when "moves" are implemented
//   }
// }
