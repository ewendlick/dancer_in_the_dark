const heroFirst = [
  'Smoke',
  'Blood',
  'Hero'
]

const heroSecond = [
  'fist',
  'strike',
  'hammer'
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

const villainSecond = heroSecond

const villainThird = [
  'the Dishonorable',
  'the Quivering',
  'the Filthy'
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
  }
}
