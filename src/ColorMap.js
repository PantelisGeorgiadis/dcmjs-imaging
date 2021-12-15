//#region ColorMap
class ColorMap {
  /**
   * Gets the MONOCHROME1 grayscale color map.
   * @method
   * @static
   * @returns {Array<number>} Array of color map ARGB values.
   */
  static getColorMapMonochrome1() {
    return this._getGrayscaleColorMap(true);
  }

  /**
   * Gets the MONOCHROME2 grayscale color map.
   * @method
   * @static
   * @returns {Array<number>} Array of color map ARGB values.
   */
  static getColorMapMonochrome2() {
    return this._getGrayscaleColorMap(false);
  }

  /**
   * Gets the PALETTE COLOR color map.
   * @method
   * @static
   * @param {DicomImage} image - DICOM image object.
   * @returns {Array<number>} Array of color map ARGB values.
   */
  static getColorMapPaletteColor(image) {
    const redDescriptor = image.getElement('RedPaletteColorLookupTableDescriptor');
    if (redDescriptor === undefined) {
      throw new Error('Palette color LUT is missing from image');
    }

    let size = 0;
    let bits = 0;
    if (Array.isArray(redDescriptor) && redDescriptor.length > 0) {
      size = redDescriptor[0];
      bits = redDescriptor[2];
    }
    size = size === 0 ? 65536 : size;

    const r = new Uint8Array(image.getElement('RedPaletteColorLookupTableData').find((o) => o));
    const g = new Uint8Array(image.getElement('GreenPaletteColorLookupTableData').find((o) => o));
    const b = new Uint8Array(image.getElement('BluePaletteColorLookupTableData').find((o) => o));

    const colorMap = new Array(size);
    if (r.length === size) {
      for (let i = 0; i < size; i++) {
        colorMap[i] = (0xff << 0x18) | (r[i] << 0x10) | (g[i] << 0x08) | b[i];
      }
    } else {
      let offset = bits === 16 ? 1 : 0;
      for (let i = 0; i < size; i++, offset += 2) {
        colorMap[i] = (0xff << 0x18) | (r[offset] << 0x10) | (g[offset] << 0x08) | b[offset];
      }
    }

    return colorMap;
  }

  //#region Private Methods
  /**
   * Gets a grayscale color map.
   * @method
   * @static
   * @private
   * @param {boolean} reverse - Flag to indicate whether to reverse the color map.
   * @returns {Array<number>} Array of color map ARGB values.
   */
  static _getGrayscaleColorMap(reverse) {
    const colorMap = new Array(256);
    if (reverse) {
      for (let i = 0, b = 255; i < 256; i++, b--) {
        colorMap[i] = (0xff << 0x18) | (b << 0x10) | (b << 0x08) | b;
      }
    } else {
      for (let i = 0, b = 0; i < 256; i++, b++) {
        colorMap[i] = (0xff << 0x18) | (b << 0x10) | (b << 0x08) | b;
      }
    }

    return colorMap;
  }
  //#endregion
}
//#endregion

//#region Exports
module.exports = ColorMap;
//#endregion
