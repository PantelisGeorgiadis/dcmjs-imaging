const { RenderableTransferSyntax, TransferSyntax, OverlayColor } = require('./Constants');
const { Pixel, PixelPipeline } = require('./Pixel');
const { LutPipeline } = require('./Lut');
const WindowLevel = require('./WindowLevel');
const Overlay = require('./Overlay');

const dcmjs = require('dcmjs');
const { DicomMetaDictionary, DicomMessage, ReadBufferStream, WriteBufferStream } = dcmjs.data;
const dcmjsLog = dcmjs.log;

//#region DicomImage
class DicomImage {
  /**
   * Creates an instance of DicomImage.
   * @constructor
   * @param {Object|ArrayBuffer} [elementsOrBuffer] - Dataset elements as object or encoded as a DICOM dataset buffer.
   * @param {string} [transferSyntaxUid] - Dataset transfer syntax
   */
  constructor(elementsOrBuffer, transferSyntaxUid) {
    dcmjsLog.level = 'error';
    this.renderOverlays = true;

    this.transferSyntaxUid = transferSyntaxUid || TransferSyntax.ImplicitVRLittleEndian;
    if (elementsOrBuffer instanceof ArrayBuffer) {
      if (transferSyntaxUid) {
        this.elements = this._fromElementsBuffer(elementsOrBuffer, transferSyntaxUid);
      } else {
        const ret = this._fromP10Buffer(elementsOrBuffer);
        this.elements = ret.elements;
        this.transferSyntaxUid = ret.transferSyntaxUid;
      }
      return;
    }

    this.elements = elementsOrBuffer || {};
  }

  /**
   * Gets element value.
   * @method
   * @param {string} tag - Element tag.
   * @returns {string} Element value.
   */
  getElement(tag) {
    return this.elements[tag];
  }

  /**
   * Sets element value.
   * @method
   * @param {string} tag - Element tag.
   * @param {string} value - Element value.
   */
  setElement(tag, value) {
    this.elements[tag] = value;
  }

  /**
   * Gets all elements.
   * @method
   * @returns {Object} Elements.
   */
  getElements() {
    return this.elements;
  }

  /**
   * Gets DICOM transfer syntax UID.
   * @method
   * @returns {string} Transfer syntax UID.
   */
  getTransferSyntaxUid() {
    return this.transferSyntaxUid;
  }

  /**
   * Sets DICOM transfer syntax UID.
   * @method
   * @param {string} transferSyntaxUid - Transfer Syntax UID.
   */
  setTransferSyntaxUid(transferSyntaxUid) {
    this.transferSyntaxUid = transferSyntaxUid;
  }

  /**
   * Gets elements encoded in a DICOM dataset buffer.
   * @method
   * @returns {ArrayBuffer} DICOM dataset.
   */
  getDenaturalizedDataset() {
    const denaturalizedDataset = DicomMetaDictionary.denaturalizeDataset(this.getElements());
    const stream = new WriteBufferStream();
    DicomMessage.write(denaturalizedDataset, stream, this.transferSyntaxUid, {});

    return stream.getBuffer();
  }

  /**
   * Gets the image width.
   * @method
   * @returns {number} Width.
   */
  getWidth() {
    return this.getElement('Columns');
  }

  /**
   * Gets the image height.
   * @method
   * @returns {number} Height.
   */
  getHeight() {
    return this.getElement('Rows');
  }

  /**
   * Gets the number of frames.
   * @method
   * @returns {number} Number of frames.
   */
  getNumberOfFrames() {
    return this.getElement('NumberOfFrames') || 1;
  }

  /**
   * Gets whether to render overlays.
   * @method
   * @returns {boolean} Flag to indicate whether to render overlays.
   */
  getRenderOverlays() {
    return this.renderOverlays;
  }

  /**
   * Sets whether to render overlays.
   * @method
   * @param {boolean} render - Flag to indicate whether to render overlays.
   */
  setRenderOverlays(render) {
    this.renderOverlays = render;
  }

  /**
   * Renders the image as an RGBA array buffer.
   * This format was chosen because it is suitable for rendering
   * in a canvas object.
   * @method
   * @param {number} [frame] - Frame index.
   * @param {WindowLevel} [windowLevel] - User provided window/level.
   * @returns {ArrayBuffer} Rendered pixels RGBA array buffer.
   */
  render(frame, windowLevel) {
    const frameToRender = frame || 0;
    const renderedPixels = this._render(frameToRender, windowLevel);

    const rgbaPixels = new Uint8Array(4 * this.getWidth() * this.getHeight());
    for (let i = 0, p = 0; i < this.getWidth() * this.getHeight(); i++) {
      const pixel = renderedPixels[i];
      rgbaPixels[p++] = (pixel >> 0x10) & 0xff;
      rgbaPixels[p++] = (pixel >> 0x08) & 0xff;
      rgbaPixels[p++] = pixel & 0xff;
      rgbaPixels[p++] = 255;
    }

    return rgbaPixels.buffer;
  }

  /**
   * Gets the image description.
   * @method
   * @returns {string} DICOM image description.
   */
  toString() {
    const str = [];
    str.push('DICOM image:');
    str.push('===============================================');
    str.push(JSON.stringify(this.getElements()));

    return str.join('\n');
  }

  //#region Private Methods
  /**
   * Loads a dataset from p10 buffer.
   * @method
   * @private
   * @param {ArrayBuffer} arrayBuffer - p10 array buffer.
   * @returns {Object} Dataset elements and transfer syntax UID.
   */
  _fromP10Buffer(arrayBuffer) {
    const dicomDict = DicomMessage.readFile(arrayBuffer, { ignoreErrors: true });
    const meta = DicomMetaDictionary.naturalizeDataset(dicomDict.meta);
    const transferSyntaxUid = meta.TransferSyntaxUID;
    const elements = DicomMetaDictionary.naturalizeDataset(dicomDict.dict);

    return { elements, transferSyntaxUid };
  }

  /**
   * Loads a dataset from elements only buffer.
   * @method
   * @private
   * @param {ArrayBuffer} arrayBuffer - Elements array buffer.
   * @param {string} transferSyntaxUid - Transfer Syntax UID.
   * @returns {Object} Dataset elements.
   */
  _fromElementsBuffer(arrayBuffer, transferSyntaxUid) {
    const stream = new ReadBufferStream(arrayBuffer);
    // Use the proper syntax length (based on transfer syntax UID)
    // since dcmjs doesn't do that internally.
    let syntaxLengthTypeToDecode =
      transferSyntaxUid === TransferSyntax.ImplicitVRLittleEndian
        ? TransferSyntax.ImplicitVRLittleEndian
        : TransferSyntax.ExplicitVRLittleEndian;
    const denaturalizedDataset = DicomMessage.read(stream, syntaxLengthTypeToDecode, true);

    return DicomMetaDictionary.naturalizeDataset(denaturalizedDataset);
  }

  /**
   * Renders the image.
   * @method
   * @private
   * @param {number} [frame] - Frame index.
   * @param {WindowLevel} [windowLevel] - User provided window/level.
   * @returns {Int32Array} Rendered ABGR pixels packed in integers.
   */
  _render(frame, windowLevel) {
    if (!Object.values(RenderableTransferSyntax).includes(this.getTransferSyntaxUid())) {
      throw new Error(
        `Transfer syntax cannot be currently rendered [${this.getTransferSyntaxUid()}]`
      );
    }
    if (frame < 0 || frame >= this.getNumberOfFrames()) {
      throw new Error(`Requested frame is out of range [${frame}]`);
    }
    if (windowLevel && !(windowLevel instanceof WindowLevel)) {
      throw new Error(`${windowLevel.toString()} is not a WindowLevel`);
    }

    const pixel = new Pixel(this);
    const lutPipeline = LutPipeline.create(this, pixel, windowLevel);
    const lut = lutPipeline.getLut();
    if (lut && !lut.isValid()) {
      lut.recalculate();
    }

    const pixelPipeline = PixelPipeline.create(pixel, frame);
    let renderredPixels = pixelPipeline.render(lut);

    if (this.getRenderOverlays()) {
      const overlays = Overlay.fromDicomImage(this);
      if (overlays.length > 0) {
        for (let i = 0; i < overlays.length; i++) {
          const overlay = overlays[i];
          if (
            frame + 1 < overlay.getFrameOrigin() ||
            frame + 1 > overlay.getFrameOrigin() + overlay.getNumberOfFrames() - 1
          ) {
            continue;
          }
          overlay.render(renderredPixels, pixel.getWidth(), pixel.getHeight(), OverlayColor);
        }
      }
    }

    return renderredPixels;
  }
  //#endregion
}
//#endregion

//#region Exports
module.exports = DicomImage;
//#endregion
