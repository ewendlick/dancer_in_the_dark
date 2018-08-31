// item map handled in Map class
// user has another attribute similar to seenMap (split that into seenBgMap)
// need to update that user's viewport each move for any newly-placed/newly-removed items

// Fake Static thing to keep track of shown items
// // TODO: check and see if anything can write to this and rename it if possible
let id = 1

module.exports = class Item {
  constructor (type, observable = true, detectable = 100) {
    // item type
    // seen true/false (if seen, skip the observable step and detectable step)
    // observable true/false (if observable, skip the detectable check)
    // detectable percentage chance per look (looks happen on each "move")
    // ??moveable true/false
    // ??movement impediment (TODO: figure out how to implement this. Reduce additional moves?)
    //
    this._type = type
    this._observable = observable
    this._detectable = detectable
    this._id = id
    id += 1
  }

  get type () {
    return this._type
  }

  get id () {
    return this._id
  }

  // TODO: need to hook this up
  detect () {
    if (this.observable || this.seen || Math.floor(Math.random() * 100) < detectable) {
      this.seen = true
      this.observable = true
    }
  }
}
