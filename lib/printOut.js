module.exports = {
  // TODO: pass in the item map as optional and make this one function
  // This will print an 'x' if there is a non-floor/item collision
  humanReadableMap: (bgMap, itemMap) => {
    let printRow = []
    for (let yIndex = 0; yIndex < bgMap.length; yIndex++) {
      printRow = []
      for (let xIndex = 0; xIndex < bgMap[yIndex].length; xIndex++) {
        if (bgMap[yIndex][xIndex] !== ' ' && itemMap[yIndex][xIndex] !== null) {
          // collision, should not happen in current code
          printRow.push('x')
        } else if (itemMap[yIndex][xIndex] !== null){
          // only prints the first item on that tile
          // TODO: this was failing here occasionally.... but why?
          if (itemMap[yIndex][xIndex][0]) {
            printRow.push(itemMap[yIndex][xIndex][0].type)
          } else {
            // TODO: weird failure
            printRow.push('?')
          }
        } else {
          printRow.push(bgMap[yIndex][xIndex])
        }
      }
      console.log(printRow.join(''))
    }
  },

  // TODO: one function for these
  humanReadableBgMap: (bgMap) => {
    for (let index = 0; index < bgMap.length; index++) {
      console.log(bgMap[index].join(''))
    }
  },

  // TODO: mix this into the humanReadableMap
  humanReadableItemMap: (itemMap) => {
    let printRow = []
    for (let yIndex = 0; yIndex < itemMap.length; yIndex++) {
      printRow = []
      for (let xIndex = 0; xIndex < itemMap[yIndex].length; xIndex++) {
        if (itemMap[yIndex][xIndex] !== null) {
          // item exists
          printRow.push(itemMap[yIndex][xIndex][0].type)
        } else {
          printRow.push(' ')
        }
      }
      console.log(printRow.join(''))
    }
  },

  // TODO: delete later, this is used for testing
  seenTiles: (map) => {
    const nonZeroTiles = map.reduce((rowAcc, row) => {
      return rowAcc + row.reduce((columnAcc, column) => {
        if (column !== '0') {
          columnAcc += 1
        }
        return columnAcc
      }, 0)
    }, 0)
    console.log(nonZeroTiles)
  },

  floorToWallPercentage: (map) => {
    let floor = 0
    let wall = 0
    map.forEach(row => {
      row.forEach(columnItem => {
        columnItem === ' ' ? floor++ : wall++
      })
    })
    console.log(`FLOOR TILES: ${Math.round((floor / (floor+wall)) * 100)}%, WALL TILES ${Math.round((wall / (floor+wall)) * 100)}%`)
  }
}
