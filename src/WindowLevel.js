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
   * @returns {string} Description.
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
   * Creates an array of window/level objects based on the image parameters.
   * @method
   * @static
   * @param {DicomImage} image - DICOM image object.
   * @returns {Array<WindowLevel>} Array of window/level objects.
   */
  static fromDicomImage(image) {
    const ret = [];

    let windowCenters = image.getElement('WindowCenter');
    let windowWidths = image.getElement('WindowWidth');
    let descriptions = image.getElement('WindowCenterWidthExplanation');

    if (windowCenters === undefined || windowWidths === undefined) {
      return ret;
    }

    windowCenters = !Array.isArray(windowCenters) ? [windowCenters] : windowCenters;
    windowWidths = !Array.isArray(windowWidths) ? [windowWidths] : windowWidths;
    descriptions = !Array.isArray(descriptions) ? [descriptions] : descriptions;

    if (windowCenters.length !== windowWidths.length) {
      throw new Error('Window center count does not match window width count');
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
}
//#endregion

//#region Exports
module.exports = WindowLevel;
//#endregion
