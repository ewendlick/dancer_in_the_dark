const heroFirst = [
  'Alga',
  'Algo',
  'Mir',
  'Hel',
  'Riv',
  'Cha',
  'Cra',
  'Crackli',
  'Zzorrxyzzy'
]

const heroSecond = [
  'thor',
  'en',
  'vas',
  'man',
  'o',
  'hep',
  'xas',
  'ror',
  'i',
  'y'
]

const heroThird = [
  'the Brave',
  'the Honorable',
  'the Tall'
]

const villainFirst = [
  'Pus',
  'Fart'
]

const villainSecond = [
  'derp',
  'phart',
  'bucket',
  'basket'
]

const villainThird = [
  'the Dishonorable',
  'the Quivering',
  'the Filthy'
]

const arrowStrikeBodyPart = [
  'shoulder',
  'thigh',
  'torso',
  'butthole',
  'left ear',
  'right ball',
  'both knees'
]

const arrowStrikeReactionVerb = [
  'howl',
  'scream',
  'yell',
  'convulse',
  'queef'
]

const trapStrikeBodyPart = [
  'left foot',
  'right foot',
  'cape',
  'Dorito-dust covered cape'
]

const trapStrikeReactionVerb = [
  'struggle',
  'wiggle',
  'flinch',
  'undulate',
  'pass a little bit of gas'
]

function randomFrom (array) {
 return array[Math.floor(Math.random() * array.length)]
}

function randomInt (max = 100) {
  return Math.floor(Math.random() * 100)
}

module.exports = {
  name: (isHero) => {
    if (isHero) {
      return randomFrom(heroFirst) + randomFrom(heroSecond) + (randomInt() > 50 ? (' ' + randomFrom(heroThird)) : '')
    } else {
      return randomFrom(villainFirst) + randomFrom(villainSecond) + (randomInt() > 50 ? (' ' + randomFrom(villainThird)) : '')
    }
  },
  arrowStrike: (playerName) => {
    // TODO: one function for person struck and the shooter?
    // TODO: do we want this text here? Should we just return an array of randomness?
    return `The arrow flies through the air and finds its mark! It embeds itself in ${playerName}'s ${randomFrom(arrowStrikeBodyPart)}, causing them to ${randomFrom(arrowStrikeReactionVerb)} in agony!`
  },
  trapStrike: () => {
    return `You trigger a trap! It snaps shut on your ${randomFrom(trapStrikeBodyPart)} and you ${randomFrom(trapStrikeReactionVerb)} against it!`
  }
}
