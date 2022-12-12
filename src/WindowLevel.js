//#region WindowLevel
class WindowLevel {
  /**
   * Creates an instance of WindowLevel.
   * @constructor
   * @param {number} window - Window value.
   * @param {number} level - Level value.
   * @param {string} [description] - Description.
   */
  constructor(window, level, description) {
    this.window = window;
    this.level = level;
    this.description = description;
  }

  /**
   * Gets window value.
   * @method
   * @returns {number} Window value.
   */
  getWindow() {
    return this.window;
  }

  /**
   * Sets window value.
   * @method
   * @param {number} value - Window value.
   */
  setWindow(value) {
    this.window = value;
  }

  /**
   * Gets level value.
   * @method
   * @returns {number} Level value.
   */
  getLevel() {
    return this.level;
  }

  /**
   * Sets level value.
   * @method
   * @param {number} value - Level value.
   */
  setLevel(value) {
    this.level = value;
  }

  /**
   * Gets description.
   * @method
   * @returns {string|undefined} Description or undefined if not provided.
   */
  getDescription() {
    return this.description;
  }

  /**
   * Sets description.
   * @method
   * @param {string} description - Description.
   */
  setDescription(description) {
    this.description = description;
  }

  /**
   * Gets the window/level description.
   * @method
   * @returns {string} Window/level description.
   */
  toString() {
    return `${this.getWindow()}:${this.getLevel()} ${this.getDescription() || '[No description]'}`;
  }

  /**
   * Creates an array of window/level objects based on the image elements.
   * @method
   * @static
   * @param {Object} elements - DICOM image elements.
   * @returns {Array<WindowLevel>} Array of window/level objects.
   */
  static fromDicomImageElements(elements) {
    const ret = [];

    let windowCenters = this._getElement(elements, 'WindowCenter');
    let windowWidths = this._getElement(elements, 'WindowWidth');
    let descriptions = this._getElement(elements, 'WindowCenterWidthExplanation');

    if (windowCenters === undefined || windowWidths === undefined) {
      return ret;
    }

    windowCenters = !Array.isArray(windowCenters) ? [windowCenters] : windowCenters;
    windowWidths = !Array.isArray(windowWidths) ? [windowWidths] : windowWidths;
    descriptions = !Array.isArray(descriptions) ? [descriptions] : descriptions;

    if (windowCenters.length !== windowWidths.length) {
      return ret;
    }

    for (let i = 0; i < windowCenters.length; i++) {
      const window = parseFloat(windowWidths[i]);
      const level = parseFloat(windowCenters[i]);
      if (isNaN(window) || isNaN(level)) {
        continue;
      }

      if (window >= 1) {
        let description = undefined;
        if (descriptions !== undefined && i < descriptions.length) {
          description = descriptions[i];
        }
        ret.push(new WindowLevel(window, level, description));
      }
    }

    return ret;
  }

  //#region Private Methods
  /**
   * Gets element value.
   * @method
   * @static
   * @param {Object} elements - Elements.
   * @param {string} tag - Element tag.
   * @returns {string|undefined} Element value or undefined if element doesn't exist.
   */
  static _getElement(elements, tag) {
    return elements[tag];
  }
  //#endregion
}
//#endregion

//#region Exports
module.exports = WindowLevel;
//#endregion
