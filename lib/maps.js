// COPY-PASTE CHARACTER ZONE
/*
│ alt+179
┤ alt+180
┐ alt+191
└ alt+192
┴ alt+193
┬ alt+194
├ alt+195
─ alt+196
┼ alt+197
┘ alt+217
┌ alt+218
*/

// This is the bg map, and is only for displaying
// currently, movement impediment is generated from this
const treasureHunt = [
  '┌──────┬─────────────────────────┐',
  '│      │       ┌┐                │',
  '│ .  ──┤       └┘           ┌┐   │',
  '│                   ┌┐      └┘ ──┤',
  '├──┘                └┘           │',
  '│         ┌┐                     │',
  '│    ┌┐   └┘      ┌┐             │',
  '│    └┘       │   └┘         ┌┐  │',
  '│            ─┼──            └┘  │',
  '│             │                  │',
  '│                                │',
  '│   ┌┐                           │',
  '└───┴┴───────────────────────────┘'
]
const trapWorld = [
  '┌──────┬┬────┬┬──────────────────┐',
  '│      └┘    └┘                  │',
  '│                    .           │',
  '│   ┌┐    ┌┐    ┌┐      .        │',
  '├   └┘    └┘    └┘   .           │',
  '│                       .        │',
  '│                    .           │',
  '│   ┌┐    ┌┐    ┌┐      .        │',
  '│   └┘    └┘    └┘   .           │',
  '│                       .        │',
  '│      ┌┐    ┌┐                  │',
  '└──────┴┴────┴┴──────────────────┘'
]
const basic = [
     '┌──────┬────┐',
     '│      │    │',
     '│ .  ──┤    │',
     '│           │',
     '├──┘        │',
     '│           │',
     '└───────────┘'
]
module.exports = {
    // TODO: should we even handle the pipes here? Probably easier just to set these to a material
    // and then display it differently
    treasureHuntBg: to2DArray(treasureHunt),
    treasureHuntMovementImpediment: generateMovementImpediment(treasureHunt),
    trapWorldBg: to2DArray(trapWorld),
    trapWorldMovementImpediment: generateMovementImpediment(trapWorld),
    basicBg: to2DArray(basic),
    basicMovementImpediment: generateMovementImpediment(basic)
}

// Keeps the maps more human-readable and easy to edit within this file
function to2DArray (map) {
    return map.map(row => {
        return row.split('')
    })
}

// TODO: visionImpairment for windows/glass? Impair? Impede? Ah jeez, these should be different, huh?

function generateMovementImpediment (map) {
  const UNMOVEABLE = -1 // anything not a floor
  // TODO: different levels of impediment later
  const MOVEABLE = 1 // floor - impediment for movement in "moves"
  // const floorRegex = /[ ]/g
  // const wallRegex = new RegExp(`[^ |${MOVEABLE}]`, 'g')
  let builtRow = null
  return map.map(row => {
    // TODO: This feels wrong. Ask someone about chainging these. Should this just be a while loop with conditionals inside?
    // return row.replace(floorRegex, MOVEABLE).replace(wallRegex, UNMOVEABLE)
    builtRow = row.split('')
    return builtRow.map(columnItem => {
      return columnItem === ' ' ? MOVEABLE : UNMOVEABLE
    })
  })
}
