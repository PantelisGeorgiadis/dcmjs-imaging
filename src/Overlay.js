const { SingleBitPixelPipeline } = require('./Pixel');

const dcmjs = require('dcmjs');
const { Tag } = dcmjs.data;

//#region Overlay
class Overlay {
  /**
   * Creates an instance of Overlay.
   * @constructor
   * @param {DicomImage} image - DICOM image object.
   * @param {number} group - Overlay group.
   */
  constructor(image, group) {
    this.group = group;

    this.height = image.getElement(Tag.fromNumbers(group, 0x0010).toCleanString()) || 0;
    this.width = image.getElement(Tag.fromNumbers(group, 0x0011).toCleanString()) || 0;
    this.type = image.getElement(Tag.fromNumbers(group, 0x0040).toCleanString()) || 'Unknown';
    this.originX = 0;
    this.originY = 0;
    const origin = image.getElement(Tag.fromNumbers(group, 0x0050).toCleanString());
    if (origin !== undefined && Array.isArray(origin) && origin.length === 2) {
      this.originX = origin[0];
      this.originY = origin[1];
    }
    this.bitsAllocated = image.getElement(Tag.fromNumbers(group, 0x0100).toCleanString()) || 1;
    this.bitPosition = image.getElement(Tag.fromNumbers(group, 0x0102).toCleanString()) || 0;
    this.description = image.getElement(Tag.fromNumbers(group, 0x0022).toCleanString()) || '';
    this.subtype = image.getElement(Tag.fromNumbers(group, 0x0045).toCleanString()) || '';
    this.label = image.getElement(Tag.fromNumbers(group, 0x1500).toCleanString()) || '';
    this.frames = image.getElement(Tag.fromNumbers(group, 0x0015).toCleanString()) || 1;
    this.frameOrigin = image.getElement(Tag.fromNumbers(group, 0x0051).toCleanString()) || 1;
    this.data = image.getElement(Tag.fromNumbers(group, 0x3000).toCleanString());
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
      return;
    }
    if (!this.getWidth() || !this.getHeight()) {
      return;
    }
    if (!this.getBitsAllocated()) {
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

  /**
   * Creates an array of overlay objects based on the image parameters.
   * @method
   * @static
   * @param {DicomImage} image - DICOM image object.
   * @returns {Array<Overlay>} Array of overlay objects.
   */
  static fromDicomImage(image) {
    const ret = [];
    const elements = image.getElements();

    const elementKeys = Object.keys(elements);
    for (let i = 0; i < elementKeys.length; i++) {
      const element = elementKeys[i];
      const tag = Tag.fromString(element);
      if (tag.element() === 0x0010) {
        if (tag.group() >= 0x6000 && tag.group() <= 0x60ff && tag.group() % 2 === 0) {
          ret.push(new Overlay(image, tag.group()));
        }
      }
    }

    return ret;
  }
}
//#endregion

//#region Exports
module.exports = Overlay;
//#endregion
