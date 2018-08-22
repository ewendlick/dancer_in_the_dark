module.exports = {
  humanReadableMap: (map) => {
    for (let index = 0; index < map.length; index++) {
      console.log(map[index].join(''))
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
