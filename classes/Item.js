module.exports = class Item {
  constructor (type, observable = true, detectable = 100) {
    // item type
    // seen true/false (if seen, skip the observable step and detectable step)
    // observable true/false (if observable, skip the detectable check)
    // detectable percentage chance per look (looks happen on each "move")
    // ??moveable true/false
    // ??movement impediment (TODO: figure out how to implement this. Reduce additional moves?)
  }

  detect () {
    if (this.observable || this.seen || Math.floor(Math.random() * 100) < detectable) {
      this.seen = true
      this.observable = true
    }
  }
}
