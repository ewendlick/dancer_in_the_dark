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

module.exports = {
    // TODO: should we even handle the pipes here? Probably easier just to set these to a material
    // and then display it differently
    treasureHunt: to2DArray( [
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
        '└───┴┴───────────────────────────┘',
    ])
    // basic: to2DArray( [
    //     '┌──────┬────┐',
    //     '│      │    │',
    //     '│ .  ──┤    │',
    //     '│           │',
    //     '├──┘        │',
    //     '│           │',
    //     '└───────────┘',
    // ])
}

// Keeps the maps more human-readable here
function to2DArray (map) {
    return map.map(row => {
        return row.split('')
    })
}
