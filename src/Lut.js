const ColorMap = require('./ColorMap');
const WindowLevel = require('./WindowLevel');
const { PhotometricInterpretation } = require('./Constants');

//#region Lut
/* c8 ignore start */
class Lut {
  /**
   * Gets whether the LUT values are valid.
   * @method
   * @returns {boolean} Whether the LUT values are valid.
   */
  isValid() {
    throw new Error('isValid should be implemented');
  }

  /**
   * Gets the minimum output value.
   * @method
   * @returns {number} Minimum output value.
   */
  getMinimumOutputValue() {
    throw new Error('getMinimumOutputValue should be implemented');
  }

  /**
   * Gets the maximum output value.
   * @method
   * @returns {number} Maximum output value.
   */
  getMaximumOutputValue() {
    throw new Error('getMaximumOutputValue should be implemented');
  }

  /**
   * Recalculates the LUT.
   * @method
   */
  recalculate() {
    throw new Error('recalculate should be implemented');
  }

  /**
   * Gets LUT value.
   * @method
   * @param {number} input - Input value.
   * @returns {number} LUT value.
   */
  // eslint-disable-next-line no-unused-vars
  getValue(input) {
    throw new Error('getValue should be implemented');
  }
}
/* c8 ignore stop */
//#endregion

//#region RescaleLut
class RescaleLut extends Lut {
  /**
   * Creates an instance of RescaleLut.
   * @constructor
   * @param {number} minValue - Minimum value.
   * @param {number} maxValue - Maximum value.
   * @param {number} slope - Slope value.
   * @param {number} intercept - Intercept value.
   */
  constructor(minValue, maxValue, slope, intercept) {
    super();

    this.slope = slope;
    this.intercept = intercept;
    this.minValue = this.getValue(minValue);
    this.maxValue = this.getValue(maxValue);
  }

  /**
   * Gets the rescale slope value.
   * @method
   * @returns {number} Rescale slope value.
   */
  getRescaleSlope() {
    return this.slope;
  }

  /**
   * Gets the rescale intercept value.
   * @method
   * @returns {number} Rescale intercept value.
   */
  getRescaleIntercept() {
    return this.intercept;
  }

  /**
   * Gets whether the LUT values are valid.
   * @method
   * @returns {boolean} Whether the LUT values are valid.
   */
  isValid() {
    return true;
  }

  /**
   * Gets the minimum output value.
   * @method
   * @returns {number} Minimum output value.
   */
  getMinimumOutputValue() {
    return this.minValue;
  }

  /**
   * Gets the maximum output value.
   * @method
   * @returns {number} Maximum output value.
   */
  getMaximumOutputValue() {
    return this.maxValue;
  }

  /**
   * Recalculates the LUT.
   * @method
   */
  recalculate() {}

  /**
   * Gets LUT value.
   * @method
   * @param {number} input - Input value.
   * @returns {number} LUT value.
   */
  getValue(input) {
    return Math.trunc(input * this.getRescaleSlope() + this.getRescaleIntercept());
  }
}
//#endregion

//#region VoiLinearLut
class VoiLinearLut extends Lut {
  /**
   * Creates an instance of VoiLinearLut.
   * @constructor
   * @param {WindowLevel} windowLevel - Window/level object.
   */
  constructor(windowLevel) {
    super();

    this.setWindowLevel(windowLevel);
    this.valid = false;
  }

  /**
   * Gets the window/level.
   * @method
   * @returns {WindowLevel} Window/level.
   */
  getWindowLevel() {
    return this.windowLevel;
  }

  /**
   * Sets the window/level.
   * @method
   * @param {WindowLevel} windowLevel - Window/level.
   */
  setWindowLevel(windowLevel) {
    this.windowLevel = windowLevel;
    this.valid = false;
  }

  /**
   * Gets whether the LUT values are valid.
   * @method
   * @returns {boolean} Whether the LUT values are valid.
   */
  isValid() {
    return this.valid;
  }

  /**
   * Gets the minimum output value.
   * @method
   * @returns {number} Minimum output value.
   */
  getMinimumOutputValue() {
    return 0;
  }

  /**
   * Gets the maximum output value.
   * @method
   * @returns {number} Maximum output value.
   */
  getMaximumOutputValue() {
    return 255;
  }

  /**
   * Recalculates the LUT.
   * @method
   */
  recalculate() {
    if (this.isValid()) {
      return;
    }

    const windowLevel = this.getWindowLevel();
    this.windowCenterMin05 = windowLevel.getLevel() - 0.5;
    this.windowWidthMin1 = windowLevel.getWindow() - 1;
    this.windowWidthDiv2 = this.windowWidthMin1 / 2;
    this.windowStart = Math.trunc(this.windowCenterMin05 - this.windowWidthDiv2);
    this.windowEnd = Math.trunc(this.windowCenterMin05 + this.windowWidthDiv2);
    this.valid = true;
  }

  /**
   * Gets LUT value.
   * @method
   * @param {number} input - Input value.
   * @returns {number} LUT value.
   */
  getValue(input) {
    if (input <= this.windowStart) {
      return this.getMinimumOutputValue();
    }
    if (input > this.windowEnd) {
      return this.getMaximumOutputValue();
    }
    const scale = (input - this.windowCenterMin05) / this.windowWidthMin1 + 0.5;
    return Math.trunc(scale * 255.0);
  }
}
//#endregion

//#region InvertLut
class InvertLut extends Lut {
  /**
   * Creates an instance of InvertLut.
   * @constructor
   * @param {number} minValue - Minimum value.
   * @param {number} maxValue - Maximum value.
   */
  constructor(minValue, maxValue) {
    super();

    this.minValue = minValue;
    this.maxValue = maxValue;
  }

  /**
   * Gets whether the LUT values are valid.
   * @method
   * @returns {boolean} Whether the LUT values are valid.
   */
  isValid() {
    return true;
  }

  /**
   * Gets the minimum output value.
   * @method
   * @returns {number} Minimum output value.
   */
  getMinimumOutputValue() {
    return this.minValue;
  }

  /**
   * Gets the maximum output value.
   * @method
   * @returns {number} Maximum output value.
   */
  getMaximumOutputValue() {
    return this.maxValue;
  }

  /**
   * Recalculates the LUT.
   * @method
   */
  recalculate() {}

  /**
   * Gets LUT value.
   * @method
   * @param {number} input - Input value.
   * @returns {number} LUT value.
   */
  getValue(input) {
    return Math.trunc(this.getMaximumOutputValue() - input);
  }
}
//#endregion

//#region PaletteColorLut
class PaletteColorLut extends Lut {
  /**
   * Creates an instance of PaletteColorLut.
   * @constructor
   * @param {number} minValue - Minimum value.
   * @param {Array<number>} colorMap - Array of color map ARGB values.
   */
  constructor(minValue, colorMap) {
    super();

    this.minValue = minValue;
    this.setColorMap(colorMap);
  }

  /**
   * Gets the color map.
   * @method
   * @returns {Array<number>} Array of color map ARGB values.
   */
  getColorMap() {
    return this.colorMap;
  }

  /**
   * Sets the color map.
   * @method
   * @param {Array<number>} colorMap - Array of color map ARGB values.
   */
  setColorMap(colorMap) {
    this.colorMap = colorMap;
  }

  /**
   * Gets whether the LUT values are valid.
   * @method
   * @returns {boolean} Whether the LUT values are valid.
   */
  isValid() {
    return this.colorMap !== undefined;
  }

  /**
   * Gets the minimum output value.
   * @method
   * @returns {number} Minimum output value.
   */
  getMinimumOutputValue() {
    return Number.MIN_SAFE_INTEGER;
  }

  /**
   * Gets the maximum output value.
   * @method
   * @returns {number} Maximum output value.
   */
  getMaximumOutputValue() {
    return Number.MAX_SAFE_INTEGER;
  }

  /**
   * Recalculates the LUT.
   * @method
   */
  recalculate() {}

  /**
   * Gets LUT value.
   * @method
   * @param {number} input - Input value.
   * @returns {number} LUT value.
   */
  getValue(input) {
    return Math.trunc(this.colorMap[input - this.minValue > 0 ? input - this.minValue : 0]);
  }
}
//#endregion

//#region OutputLut
class OutputLut extends Lut {
  /**
   * Creates an instance of OutputLut.
   * @constructor
   * @param {Array<number>} colorMap - Array of color map ARGB values.
   */
  constructor(colorMap) {
    super();

    this.table = undefined;
    this.setColorMap(colorMap);
  }

  /**
   * Gets the color map.
   * @method
   * @returns {Array<number>} Array of color map ARGB values.
   */
  getColorMap() {
    return this.colorMap;
  }

  /**
   * Sets the color map.
   * @method
   * @param {Array<number>} colorMap - Array of color map ARGB values.
   */
  setColorMap(colorMap) {
    if (colorMap === undefined || !Array.isArray(colorMap) || colorMap.length !== 256) {
      throw new Error('Expected 256 entry color map');
    }
    this.colorMap = colorMap;
    this.table = undefined;
  }

  /**
   * Gets whether the LUT values are valid.
   * @method
   * @returns {boolean} Whether the LUT values are valid.
   */
  isValid() {
    return this.table !== undefined;
  }

  /**
   * Gets the minimum output value.
   * @method
   * @returns {number} Minimum output value.
   */
  getMinimumOutputValue() {
    return Number.MIN_SAFE_INTEGER;
  }

  /**
   * Gets the maximum output value.
   * @method
   * @returns {number} Maximum output value.
   */
  getMaximumOutputValue() {
    return Number.MAX_SAFE_INTEGER;
  }

  /**
   * Recalculates the LUT.
   * @method
   */
  recalculate() {
    if (this.isValid()) {
      return;
    }
    this.table = new Array(256);
    for (let i = 0; i < 256; i++) {
      this.table[i] = this.colorMap[i];
    }
  }

  /**
   * Gets LUT value.
   * @method
   * @param {number} input - Input value.
   * @returns {number} LUT value.
   */
  getValue(input) {
    return Math.trunc(this.table[input]);
  }
}
//#endregion

//#region CompositeLut
class CompositeLut extends Lut {
  /**
   * Creates an instance of CompositeLut.
   * @constructor
   */
  constructor() {
    super();

    this.luts = [];
  }

  /**
   * Adds a LUT.
   * @method
   * @param {Lut} lut - LUT.
   */
  addLut(lut) {
    if (!(lut instanceof Lut)) {
      throw new Error(`${lut.toString()} is not a LUT`);
    }
    this.luts.push(lut);
  }

  /**
   * Gets whether the LUT values are valid.
   * @method
   * @returns {boolean} Whether the LUT values are valid.
   */
  isValid() {
    for (let i = 0; i < this.luts.length; i++) {
      const lut = this.luts[i];
      if (!lut.isValid()) {
        return false;
      }
    }
    return true;
  }

  /**
   * Gets the minimum output value.
   * @method
   * @returns {number} Minimum output value.
   */
  getMinimumOutputValue() {
    let lastLut = undefined;
    if (this.luts.length > 0) {
      lastLut = this.luts[this.luts.length - 1];
    }
    if (lastLut !== undefined) {
      return lastLut.getMinimumOutputValue();
    }
    return 0;
  }

  /**
   * Gets the maximum output value.
   * @method
   * @returns {number} Maximum output value.
   */
  getMaximumOutputValue() {
    let lastLut = undefined;
    if (this.luts.length > 0) {
      lastLut = this.luts[this.luts.length - 1];
    }
    if (lastLut !== undefined) {
      return lastLut.getMaximumOutputValue();
    }
    return 255;
  }

  /**
   * Recalculates the LUT.
   * @method
   */
  recalculate() {
    for (let i = 0; i < this.luts.length; i++) {
      const lut = this.luts[i];
      lut.recalculate();
    }
  }

  /**
   * Gets LUT value.
   * @method
   * @param {number} input - Input value.
   * @returns {number} LUT value.
   */
  getValue(input) {
    for (let i = 0; i < this.luts.length; i++) {
      const lut = this.luts[i];
      input = lut.getValue(input);
    }
    return Math.trunc(input);
  }
}
//#endregion

//#region PrecalculatedLut
class PrecalculatedLut extends Lut {
  /**
   * Creates an instance of PrecalculatedLut.
   * @constructor
   * @param {Lut} minValue - LUT to precalculate.
   * @param {number} minValue - Minimum value.
   * @param {number} maxValue - Maximum value.
   */
  constructor(lut, minValue, maxValue) {
    super();

    this.minValue = minValue;
    this.maxValue = maxValue;
    this.offset = -this.minValue;
    this.table = new Array(this.maxValue - this.minValue + 1);
    this.lut = lut;
  }

  /**
   * Gets whether the LUT values are valid.
   * @method
   * @returns {boolean} Whether the LUT values are valid.
   */
  isValid() {
    return this.lut.isValid();
  }

  /**
   * Gets the minimum output value.
   * @method
   * @returns {number} Minimum output value.
   */
  getMinimumOutputValue() {
    return this.lut.getMinimumOutputValue();
  }

  /**
   * Gets the maximum output value.
   * @method
   * @returns {number} Maximum output value.
   */
  getMaximumOutputValue() {
    return this.lut.getMaximumOutputValue();
  }

  /**
   * Recalculates the LUT.
   * @method
   */
  recalculate() {
    if (!this.isValid()) {
      this.lut.recalculate();
    }
    for (let i = this.minValue; i <= this.maxValue; i++) {
      this.table[i + this.offset] = this.lut.getValue(i);
    }
  }

  /**
   * Gets LUT value.
   * @method
   * @param {number} input - Input value.
   * @returns {number} LUT value.
   */
  getValue(input) {
    const p = input + this.offset;
    if (p < 0) {
      return this.table[0];
    }
    if (p >= this.table.length) {
      return this.table[this.table.length - 1];
    }
    return Math.trunc(this.table[p]);
  }
}
//#endregion

//#region LutPipeline
class LutPipeline {
  /**
   * Gets LUT.
   * @method
   * @returns {Lut} LUT.
   */
  getLut() {
    throw new Error('getLut should be implemented');
  }

  /**
   * Creates a LUT object based on image and pixel parameters.
   * @method
   * @static
   * @param {DicomImage} image - DICOM image object.
   * @param {Pixel} pixel - Pixel object.
   * @param {WindowLevel} [windowLevel] - User provided window/level.
   * @returns {Lut} LUT object.
   */
  static create(image, pixel, windowLevel) {
    const photometricInterpretation = pixel.getPhotometricInterpretation();
    if (
      photometricInterpretation === PhotometricInterpretation.Monochrome1 ||
      photometricInterpretation === PhotometricInterpretation.Monochrome2
    ) {
      const pipeline = new GrayscaleLutPipeline(
        pixel.getRescaleSlope(),
        pixel.getRescaleIntercept(),
        pixel.getBitsStored(),
        pixel.isSigned()
      );
      pipeline.setColorMap(
        photometricInterpretation === PhotometricInterpretation.Monochrome1
          ? ColorMap.getColorMapMonochrome1()
          : ColorMap.getColorMapMonochrome2()
      );
      let wl = windowLevel;
      if (!wl) {
        const windowLevels = WindowLevel.fromDicomImage(image);
        if (windowLevels.length > 0) {
          wl = windowLevels[0];
        }
      }
      if (wl) {
        pipeline.setWindowLevel(wl);
      }
      return pipeline;
    } else if (
      photometricInterpretation === PhotometricInterpretation.Rgb ||
      photometricInterpretation === PhotometricInterpretation.YbrFull ||
      photometricInterpretation === PhotometricInterpretation.YbrFull422 ||
      photometricInterpretation === PhotometricInterpretation.YbrPartial422
    ) {
      return new RgbColorLutPipeline();
    } else if (photometricInterpretation === PhotometricInterpretation.PaletteColor) {
      return new PaletteColorLutPipeline(image);
    } else {
      throw new Error(
        `Unsupported LUT pipeline photometric interpretation: ${photometricInterpretation}`
      );
    }
  }
}
//#endregion

//#region GrayscaleLutPipeline
class GrayscaleLutPipeline extends LutPipeline {
  /**
   * Creates an instance of GrayscaleLutPipeline.
   * @constructor
   * @param {number} slope - Slope value.
   * @param {number} intercept - Intercept value.
   * @param {number} bitsStored - Bits stored value.
   * @param {boolean} signed - Signed pixel values flag.
   */
  constructor(slope, intercept, bitsStored, signed) {
    super();

    this.minValue = signed ? -(1 << (bitsStored - 1)) : 0;
    this.maxValue = signed ? (1 << (bitsStored - 1)) - 1 : (1 << bitsStored) - 1;

    this.rescaleLut = new RescaleLut(this.minValue, this.maxValue, slope, intercept);
    this.voiLut = new VoiLinearLut(
      new WindowLevel(this.maxValue - this.minValue, (this.minValue + this.maxValue) / 2)
    );
    this.outputLut = new OutputLut(ColorMap.getColorMapMonochrome2());

    this.invert = false;
    this.lut = undefined;
  }

  /**
   * Gets the window/level.
   * @method
   * @returns {WindowLevel} Window/level.
   */
  getWindowLevel() {
    return this.voiLut.getWindowLevel();
  }

  /**
   * Sets the window/level.
   * @method
   * @param {WindowLevel} windowLevel - Window/level.
   */
  setWindowLevel(windowLevel) {
    this.voiLut.setWindowLevel(windowLevel);
  }

  /**
   * Gets the color map.
   * @method
   * @returns {Array<number>} Array of color map ARGB values.
   */
  getColorMap() {
    return this.outputLut.getColorMap();
  }

  /**
   * Sets the color map.
   * @method
   * @param {Array<number>} colorMap - Array of color map ARGB values.
   */
  setColorMap(colorMap) {
    this.outputLut.setColorMap(colorMap);
  }

  /**
   * Gets whether to invert the LUT.
   * @method
   * @returns {boolean} Whether to invert the LUT.
   */
  getInvert() {
    return this.invert;
  }

  /**
   * Sets whether to invert the LUT.
   * @method
   * @param {boolean} invert - Whether to invert the LUT.
   */
  setInvert(invert) {
    this.invert = invert;
    this.lut = undefined;
  }

  /**
   * Gets LUT.
   * @method
   * @returns {Lut} LUT.
   */
  getLut() {
    if (this.lut === undefined) {
      const composite = new CompositeLut();
      if (this.rescaleLut !== undefined) {
        composite.addLut(this.rescaleLut);
      }
      composite.addLut(this.voiLut);
      composite.addLut(this.outputLut);
      if (this.invert) {
        composite.addLut(
          new InvertLut(
            this.outputLut.getMinimumOutputValue(),
            this.outputLut.getMaximumOutputValue()
          )
        );
      }
      this.lut = composite;
    }
    return new PrecalculatedLut(this.lut, this.minValue, this.maxValue);
  }
}
//#endregion

//#region RgbColorLutPipeline
class RgbColorLutPipeline extends LutPipeline {
  /**
   * Creates an instance of RgbColorLutPipeline.
   * @constructor
   */
  constructor() {
    super();
  }

  /**
   * Gets LUT.
   * @method
   * @returns {Lut} LUT.
   */
  getLut() {
    return undefined;
  }
}
//#endregion

//#region PaletteColorLutPipeline
class PaletteColorLutPipeline extends LutPipeline {
  /**
   * Creates an instance of PaletteColorLutPipeline.
   * @constructor
   */
  constructor(image) {
    super();

    const colorMap = ColorMap.getColorMapPaletteColor(image);
    let first = 0;
    const redDescriptor = image.getElement('RedPaletteColorLookupTableDescriptor');
    if (redDescriptor !== undefined && Array.isArray(redDescriptor) && redDescriptor.length > 0) {
      first = redDescriptor[1];
    }
    this.lut = new PaletteColorLut(first, colorMap);
  }

  /**
   * Gets LUT.
   * @method
   * @returns {Lut} LUT.
   */
  getLut() {
    return this.lut;
  }
}
//#endregion

//#region Exports
module.exports = {
  Lut,
  LutPipeline,
  RescaleLut,
  VoiLinearLut,
  InvertLut,
  PaletteColorLut,
  OutputLut,
  CompositeLut,
  PrecalculatedLut,
  GrayscaleLutPipeline,
  RgbColorLutPipeline,
  PaletteColorLutPipeline,
};
//#endregion
