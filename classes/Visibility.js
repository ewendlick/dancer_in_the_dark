// TODO: not DRY
// This is passed in as the function
const MOVEABLE = 1
const UNMOVEABLE = -1

// TODO: class to create all of this
// pass in the map
// pass in the function to check if the tile blocks light or not

/// <param name="blocksLight">A function that accepts the X and Y coordinates of a tile and determines
/// whether the given tile blocks the passage of light.
/// </param>
/// <param name="setVisible">A function that sets a tile to be visible, given its X and Y coordinates.</param>
/// <param name="getDistance">A function that takes the X and Y coordinate of a point where X >= 0,
/// Y >= 0, and X >= Y, and returns the distance from the point to the origin (0,0).
/// </param>
public DiamondWallsVisibility(Func<int,int,bool> blocksLight, Action<int,int> setVisible,
                              Func<int,int,int> getDistance)
{
  _blocksLight = blocksLight;
  GetDistance  = getDistance;
  SetVisible   = setVisible;
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

  getter X () {
    return this._x
  }

  getter Y () {
    return this._y
  }
}

// Point origin, int rangeLimit, Slope top, Slope bottom
function compute (octant, origin, rangeLimit, x, top, bottom) {
  let topY = null
  for(; x <= rangeLimit; x++) {
    if (top.X === 1){
      topY = x
    } else { // top tile is not a wall
      topY = ((x*2-1) * top.Y + top.X) / (top.X*2) // get the tile that the top vector enters from the left
      let ay = (topY*2+1) * top.X
      if (isblocksLight(x, topY, octant, origin)) { // if the top tile is a wall...
        if(top.GreaterOrEqual(ay, x*2)) { // but the top vector misses the wall and passes into the tile above, move up
          topY++
        }
      } else { // the top tile is not a wall
        if(top.Greater(ay, x*2+1)) { // so if the top vector passes into the tile above, move up
          topY++
        }
      }
    }

    let bottomY = bottom.Y === 0 ? 0 : ((x*2-1) * bottom.Y + bottom.X) / (bottom.X*2)
    let wasOpaque = -1 // 0:false, 1:true, -1:not applicable
    for(y = topY; y >= bottomY; y--) {
      let tx = origin.X
      let ty = origin.Y
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

      isInRange = rangeLimit < 0 || GetDistance(tx, ty) <= rangeLimit
      // NOTE: use the following line instead to make the algorithm symmetrical
      // if(isInRange && (y != topY || top.GreaterOrEqual(y, x)) && (y != bottomY || bottom.LessOrEqual(y, x))) SetVisible(tx, ty);
      if (isInRange) {
        SetVisible(tx, ty)
      }

      isOpaque = !isInRange || _blocksLight(tx, ty);
      // if y == topY or y == bottomY, make sure the sector actually intersects the wall tile. if not, don't consider
      // it opaque to prevent the code below from moving the top vector up or the bottom vector down
      if (isOpaque &&
         (y === topY && top.LessOrEqual(y*2-1, x*2) && !isBlocksLight(x, y-1, octant, origin) ||
          y === bottomY && bottom.GreaterOrEqual(y*2+1, x*2) && !isBlocksLight(x, y+1, octant, origin))) {
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
              compute(octant, origin, rangeLimit, x+1, top, new Slope(y*2+1, x*2))
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

    if (wasOpaque != 0) {
      break // if the column ended in a clear tile, continue processing the current sector
    }
  }
}

// origin is {x: x, y: y}
isBlocksLight(x, y, octant, origin) {
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
  return _blocksLight(nx, ny) // TODO: this is a function that is passed in that checks the coordinates to see if light can be shown
}








module.exports = class Map {
  constructor () {
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
