const { SingleBitPixelPipeline } = require('./Pixel');
const Shape = require('./Shape');
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

    // GSPS
    const graphicAnnotationSequence = elements['GraphicAnnotationSequence'];
    if (
      graphicAnnotationSequence !== undefined &&
      Array.isArray(graphicAnnotationSequence) &&
      graphicAnnotationSequence.length > 0
    ) {
      graphicAnnotationSequence.forEach((graphicAnnotationSequenceItem) => {
        // Graphic
        const graphicObjectSequence = graphicAnnotationSequenceItem['GraphicObjectSequence'];
        if (
          graphicObjectSequence !== undefined &&
          Array.isArray(graphicObjectSequence) &&
          graphicObjectSequence.length > 0
        ) {
          graphicObjectSequence.forEach((graphicObjectSequenceItem) => {
            ret.push(new GspsGraphicOverlay(graphicObjectSequenceItem));
          });
        }
      });
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
   * @private
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

//#region GspsGraphicOverlay
class GspsGraphicOverlay extends Overlay {
  /**
   * Creates an instance of GspsGraphicOverlay.
   * @constructor
   * @param {Object} elements - DICOM image elements.
   */
  constructor(elements) {
    super();

    this.graphicAnnotationUnits = elements['GraphicAnnotationUnits'];
    this.graphicDimensions = elements['GraphicDimensions'];
    this.numberOfGraphicPoints = elements['NumberOfGraphicPoints'];
    this.graphicData = elements['GraphicData'];
    this.graphicType = elements['GraphicType'];
    this.graphicFilled = elements['GraphicFilled'];
  }

  /**
   * Gets the graphic annotation units.
   * @method
   * @returns {string} Graphic annotation units.
   */
  getGraphicAnnotationUnits() {
    return this.graphicAnnotationUnits;
  }

  /**
   * Gets the graphic dimensions.
   * @method
   * @returns {number} Graphic dimensions.
   */
  getGraphicDimensions() {
    return this.graphicDimensions;
  }

  /**
   * Gets the number of graphic points.
   * @method
   * @returns {number} Number of graphic points.
   */
  getNumberOfGraphicPoints() {
    return this.numberOfGraphicPoints;
  }

  /**
   * Gets the graphic data.
   * @method
   * @returns {Array<number>} Graphic data.
   */
  getGraphicData() {
    return this.graphicData;
  }

  /**
   * Gets the graphic type.
   * @method
   * @returns {string} Graphic type.
   */
  getGraphicType() {
    return this.graphicType;
  }

  /**
   * Gets the graphic filled.
   * @method
   * @returns {string} Graphic filled.
   */
  getGraphicFilled() {
    return this.graphicFilled;
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
    const graphicData = this.getGraphicData();
    if (!graphicData || !Array.isArray(graphicData)) {
      log.warn('GSPS graphic overlay: No graphic data. Skipping...');
      return;
    }
    if (!this.getGraphicType()) {
      log.warn('GSPS graphic overlay: No graphic type. Skipping...');
      return;
    }
    if (
      this.getGraphicAnnotationUnits() !== 'PIXEL' &&
      this.getGraphicAnnotationUnits() !== 'DISPLAY'
    ) {
      log.warn(
        `GSPS graphic overlay: ${this.getGraphicAnnotationUnits()} graphic annotation units is not supported. Skipping...`
      );
      return;
    }
    const graphicFilled = this.getGraphicFilled();
    if (graphicFilled && graphicFilled === 'Y') {
      log.warn(
        'GSPS graphic overlay: Filled graphics are not supported. Will render just the basic shape...'
      );
    }

    const isDisplay = this.getGraphicAnnotationUnits() === 'DISPLAY';
    switch (this.getGraphicType()) {
      case 'POINT':
        {
          if (graphicData.length !== 2) {
            log.warn(
              `GSPS graphic overlay: POINT graphic type should contain 2 graphic data values [Got: ${graphicData.length}]. Skipping...`
            );
            return;
          }
          // Double the points to use polyline
          const points = [
            isDisplay ? graphicData[0] * width : graphicData[0],
            isDisplay ? graphicData[1] * height : graphicData[1],
            isDisplay ? graphicData[0] * width : graphicData[0],
            isDisplay ? graphicData[1] * height : graphicData[1],
          ];
          Shape.drawPolyline(renderedPixels, width, height, points, color);
        }
        break;
      case 'POLYLINE':
        {
          const points = [];
          for (let i = 0; i < graphicData.length / 2; i++) {
            points.push(
              isDisplay ? graphicData[i * 2] * width : graphicData[i * 2],
              isDisplay ? graphicData[i * 2 + 1] * height : graphicData[i * 2 + 1]
            );
          }
          Shape.drawPolyline(renderedPixels, width, height, points, color);
        }
        break;
      default:
        log.warn(
          `GSPS graphic overlay: ${this.getGraphicType()} graphic type is not supported yet. Skipping...`
        );
        break;
    }
  }
}
//#endregion

//#region Exports
module.exports = { G60xxOverlay, GspsGraphicOverlay, Overlay };
//#endregion
