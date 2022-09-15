//#region Histogram
class Histogram {
  /**
   * Creates an instance of Histogram.
   * @constructor
   * @param {string} identifier - Histogram identifier.
   * @param {number} min - Minimum value.
   * @param {number} max - Maximum value.
   */
  constructor(identifier, min, max) {
    this.identifier = identifier;
    this.min = min;
    this.max = max;
    this.offset = -min;

    const range = max - min + 1;
    this.values = new Array(range);
    for (let i = 0; i < range; ++i) {
      this.values[i] = 0;
    }
  }

  /**
   * Gets histogram identifier.
   * @method
   * @returns {string} Histogram identifier.
   */
  getIdentifier() {
    return this.identifier;
  }

  /**
   * Gets minimum value.
   * @method
   * @returns {number} Minimum value.
   */
  getMinimum() {
    return this.min;
  }

  /**
   * Gets maximum value.
   * @method
   * @returns {number} Maximum value.
   */
  getMaximum() {
    return this.max;
  }

  /**
   * Increments histogram at bin position.
   * @method
   * @param {number} bin - Bin position at which histogram should be incremented.
   */
  add(bin) {
    const pos = bin + this.offset;
    if (pos < 0 || pos >= this.values.length) {
      return;
    }

    this.values[pos]++;
  }

  /**
   * Resets histogram at bin position.
   * @method
   * @param {number} bin - Bin position at which histogram should be reset.
   */
  clear(bin) {
    const pos = bin + this.offset;
    if (pos < 0 || pos >= this.values.length) {
      return;
    }

    this.values[pos] = 0;
  }

  /**
   * Gets the value count at histogram bin.
   * @param {number} bin - Bin position at which to get the value count.
   * @method
   * @returns {number|undefined} Value count at bin or undefined if bin does not exist.
   */
  get(bin) {
    const pos = bin + this.offset;
    if (pos < 0 || pos >= this.values.length) {
      return;
    }

    return this.values[pos];
  }

  /**
   * Gets the histogram description.
   * @method
   * @returns {string} Histogram description.
   */
  toString() {
    return `Histogram Identifier: ${this.getIdentifier()}, Minimum: ${this.getMinimum()}, Maximum: ${this.getMaximum()}`;
  }
}
//#endregion

//#region Exports
module.exports = Histogram;
//#endregion
