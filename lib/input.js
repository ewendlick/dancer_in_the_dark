// TODO: refactor? Can we make this tighter?
const LEFT = 37
const UP = 38
const RIGHT = 39
const DOWN = 40
const SPACEBAR = 32
// const L = 76 // TODO: implement (L)isten
const F = 70

module.exports = {
  LEFT: LEFT,
  UP: UP,
  RIGHT: RIGHT,
  DOWN: DOWN,
  SPACEBAR: SPACEBAR,
  // L: L,
  F: F,

  isAllowed: (keyCode) => {
    return [LEFT, UP, RIGHT, DOWN, SPACEBAR, F].includes(keyCode)
  }

  // TODO: read consequtive keypresses??
}
