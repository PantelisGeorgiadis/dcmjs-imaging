const { SingleBitPixelPipeline } = require('./Pixel');
const log = require('./log');

const dcmjs = require('dcmjs');
const { Tag } = dcmjs.data;

//#region Overlay
class Overlay {
  /**
   * Renders the overlay on top of a rendered image.
   * @method
   * @param {Int32Array} renderedPixels - Rendered ABGR image to be updated with the overlay.
   * @param {number} width - Rendered image width.
   * @param {number} height - Rendered image height.
   * @param {number} color - Overlay color packed in an integer.
   */
  // eslint-disable-next-line no-unused-vars
  render(renderedPixels, width, height, color) {
    throw new Error('render should be implemented');
  }

  /**
   * Creates an array of overlay objects based on the image elements.
   * @method
   * @static
   * @param {Object} elements - DICOM image elements.
   * @returns {Array<Overlay>} Array of overlay objects.
   */
  static fromDicomImageElements(elements) {
    const ret = [];

    // G60xx
    const elementKeys = Object.keys(elements);
    for (let i = 0; i < elementKeys.length; i++) {
      const element = elementKeys[i];
      const tag = Tag.fromString(element);
      if (tag.element() === 0x0010) {
        if (tag.group() >= 0x6000 && tag.group() <= 0x60ff && tag.group() % 2 === 0) {
          ret.push(new G60xxOverlay(elements, tag.group()));
        }
      }
    }

    return ret;
  }
}
//#endregion

//#region G60xxOverlay
class G60xxOverlay extends Overlay {
  /**
   * Creates an instance of G60xxOverlay.
   * @constructor
   * @param {Object} elements - DICOM image elements.
   * @param {number} group - Overlay group.
   */
  constructor(elements, group) {
    super();

    this.group = group;

    this.height = this._getElement(elements, Tag.fromNumbers(group, 0x0010).toCleanString()) || 0;
    this.width = this._getElement(elements, Tag.fromNumbers(group, 0x0011).toCleanString()) || 0;
    this.type =
      this._getElement(elements, Tag.fromNumbers(group, 0x0040).toCleanString()) || 'Unknown';
    this.originX = 0;
    this.originY = 0;
    const origin = this._getElement(elements, Tag.fromNumbers(group, 0x0050).toCleanString());
    if (origin !== undefined && Array.isArray(origin) && origin.length === 2) {
      this.originX = origin[0];
      this.originY = origin[1];
    }
    this.bitsAllocated =
      this._getElement(elements, Tag.fromNumbers(group, 0x0100).toCleanString()) || 1;
    this.bitPosition =
      this._getElement(elements, Tag.fromNumbers(group, 0x0102).toCleanString()) || 0;
    this.description =
      this._getElement(elements, Tag.fromNumbers(group, 0x0022).toCleanString()) || '';
    this.subtype = this._getElement(elements, Tag.fromNumbers(group, 0x0045).toCleanString()) || '';
    this.label = this._getElement(elements, Tag.fromNumbers(group, 0x1500).toCleanString()) || '';
    this.frames = this._getElement(elements, Tag.fromNumbers(group, 0x0015).toCleanString()) || 1;
    this.frameOrigin =
      this._getElement(elements, Tag.fromNumbers(group, 0x0051).toCleanString()) || 1;
    this.data = this._getElement(elements, Tag.fromNumbers(group, 0x3000).toCleanString());
  }

  /**
   * Gets the overlay group.
   * @method
   * @returns {number} Group.
   */
  getGroup() {
    return this.group;
  }

  /**
   * Gets the overlay width.
   * @method
   * @returns {number} Width.
   */
  getWidth() {
    return this.width;
  }

  /**
   * Gets the overlay height.
   * @method
   * @returns {number} Height.
   */
  getHeight() {
    return this.height;
  }

  /**
   * Gets the overlay type.
   * @method
   * @returns {string} Type.
   */
  getType() {
    return this.type;
  }

  /**
   * Gets the position of the first column of an overlay.
   * @method
   * @returns {number} Position of the first column of an overlay.
   */
  getOriginX() {
    return this.originX;
  }

  /**
   * Gets the position of the first row  of an overlay.
   * @method
   * @returns {number} Position of the first row  of an overlay.
   */
  getOriginY() {
    return this.originY;
  }

  /**
   * Gets the bits allocated.
   * @method
   * @returns {number} Bits allocated.
   */
  getBitsAllocated() {
    return this.bitsAllocated;
  }

  /**
   * Gets the bit position.
   * @method
   * @returns {number} Bit position.
   */
  getBitPosition() {
    return this.bitPosition;
  }

  /**
   * Gets the overlay description.
   * @method
   * @returns {string} Description.
   */
  getDescription() {
    return this.description;
  }

  /**
   * Gets the overlay subtype.
   * @method
   * @returns {string} subtype.
   */
  getSubtype() {
    return this.subtype;
  }

  /**
   * Gets the overlay label.
   * @method
   * @returns {string} label.
   */
  getLabel() {
    return this.label;
  }

  /**
   * Gets the number of frames.
   * @method
   * @returns {number} Number of frames.
   */
  getNumberOfFrames() {
    return this.frames;
  }

  /**
   * Gets the overlay first frame.
   * @method
   * @returns {number} First frame.
   */
  getFrameOrigin() {
    return this.frameOrigin;
  }

  /**
   * Gets the overlay data.
   * @method
   * @returns {Array<ArrayBuffer>} Overlay data.
   */
  getData() {
    return this.data;
  }

  /**
   * Renders the overlay on top of a rendered image.
   * @method
   * @param {Int32Array} renderedPixels - Rendered ABGR image to be updated with the overlay.
   * @param {number} width - Rendered image width.
   * @param {number} height - Rendered image height.
   * @param {number} color - Overlay color packed in an integer.
   */
  render(renderedPixels, width, height, color) {
    if (!this.getData()) {
      log.warn('G60xx overlay: No data. Skipping...');
      return;
    }
    if (!this.getWidth() || !this.getHeight()) {
      log.warn('G60xx overlay: No width or height. Skipping...');
      return;
    }
    if (!this.getBitsAllocated()) {
      log.warn('G60xx overlay: No bits allocated. Skipping...');
      return;
    }

    const overlayBuffers = this.getData();
    let overlayBuffer = new Uint8Array(
      Array.isArray(overlayBuffers) ? overlayBuffers.find((o) => o) : overlayBuffers
    );

    const singleBitPixelPipeline = new SingleBitPixelPipeline(
      this.getWidth(),
      this.getHeight(),
      overlayBuffer
    );
    const data = singleBitPixelPipeline.render();

    const ox = this.getOriginX() - 1;
    const oy = this.getOriginY() - 1;
    const oh = this.getHeight();
    const ow = this.getWidth();
    for (let y = 0; y < oh; ++y) {
      if (oy + y >= height) {
        return;
      }
      for (let i = ow * y, e = i + ow, p = (oy + y) * width + ox, x = 0; i < e; i++, p++, x++) {
        if (data[i] > 0) {
          if (ox + x >= width) {
            break;
          }
          renderedPixels[p] |= color;
        }
      }
    }
  }

  //#region Private Methods
  /**
   * Gets element value.
   * @method
   * @param {Object} elements - Elements.
   * @param {string} tag - Element tag.
   * @returns {string|undefined} Element value or undefined if element doesn't exist.
   */
  _getElement(elements, tag) {
    return elements[tag];
  }
  //#endregion
}
//#endregion

//#region Exports
module.exports = { G60xxOverlay, Overlay };
//#endregion
