const { RenderableTransferSyntaxes, TransferSyntax, OverlayColor } = require('./Constants');
const { PixelPipelineCache, LutPipelineCache } = require('./Cache');
const { Pixel } = require('./Pixel');
const { GrayscaleLutPipeline } = require('./Lut');
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
   * @param {string} [transferSyntaxUid] - Dataset transfer syntax.
   * @param {Object} [opts] - Options.
   * @param {number} [opts.pixelPipelineCacheSize] - Pixel pipeline cache size.
   * @param {number} [opts.lutPipelineCacheSize] - LUT pipeline cache size.
   */
  constructor(elementsOrBuffer, transferSyntaxUid, opts) {
    opts = opts || {};

    dcmjsLog.level = 'error';
    this.pixelPipelineCache = new PixelPipelineCache(opts.pixelPipelineCacheSize || 1);
    this.lutPipelineCache = new LutPipelineCache(opts.lutPipelineCacheSize || 1);

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
   * @typedef {Object} RenderingResult
   * @property {number} frame - Rendered frame index.
   * @property {ArrayBuffer} pixels - Rendered pixels RGBA array buffer.
   * This format was chosen because it is suitable for rendering in a canvas object.
   * @property {WindowLevel} windowLevel - Window/level used to render the pixels.
   * @property {Array<Histogram>} histograms - Array of calculated per-channel histograms.
   * Histograms are calculated using the original pixel values.
   */

  /**
   * Renders the image.
   * @method
   * @param {Object} [opts] - Rendering options.
   * @param {number} [opts.frame] - Frame index to render.
   * @param {WindowLevel} [opts.windowLevel] - User provided window/level.
   * @param {boolean} [opts.renderOverlays] - Flag to indicate whether to render overlays.
   * @param {boolean} [opts.calculateHistograms] - Flag to indicate whether to calculate histograms.
   * @param {StandardColorPalette} [opts.colorPalette] - Color palette to use.
   * @returns {RenderingResult} Rendering result object.
   */
  render(opts) {
    opts = opts || {};

    return this._render(opts);
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
   * Rendering implementation.
   * @method
   * @private
   * @param {Object} [opts] - Rendering options.
   * @param {number} [opts.frame] - Frame index to render.
   * @param {WindowLevel} [opts.windowLevel] - User provided window/level.
   * @param {boolean} [opts.renderOverlays] - Flag to indicate whether to render overlays.
   * @param {boolean} [opts.calculateHistograms] - Flag to indicate whether to calculate histograms.
   * @param {StandardColorPalette} [opts.colorPalette] - Color palette to use.
   * @returns {RenderingResult} Rendering result object.
   */
  _render(opts) {
    if (!RenderableTransferSyntaxes.includes(this.getTransferSyntaxUid())) {
      throw new Error(
        `Transfer syntax cannot be currently rendered [${this.getTransferSyntaxUid()}]`
      );
    }
    const frame = opts.frame || 0;
    if (frame < 0 || frame >= this.getNumberOfFrames()) {
      throw new Error(`Requested frame is out of range [${frame}]`);
    }
    if (opts.windowLevel && !(opts.windowLevel instanceof WindowLevel)) {
      throw new Error(`${opts.windowLevel.toString()} is not a WindowLevel`);
    }

    // Returned objects
    let histograms = undefined;
    let windowLevel = undefined;
    let renderingResult = {};

    // Window/level
    let wl = opts.windowLevel;
    if (wl === undefined) {
      const windowLevels = WindowLevel.fromDicomImage(this);
      if (windowLevels.length > 0) {
        wl = windowLevels[0];
      }
    }

    // Pixel object
    const pixel = new Pixel(this);

    // LUT pipeline
    const lutPipeline = this.lutPipelineCache.getOrCreate(pixel, wl, frame, opts.colorPalette);
    const lut = lutPipeline.getLut();
    if (lut && !lut.isValid()) {
      lut.recalculate();
    }
    if (lutPipeline instanceof GrayscaleLutPipeline) {
      windowLevel = lutPipeline.getWindowLevel();
    }

    // Pixel pipeline
    const pixelPipeline = this.pixelPipelineCache.getOrCreate(pixel, frame);
    let renderedPixels = pixelPipeline.render(lut);

    // Histograms
    const calculateHistograms =
      opts.calculateHistograms !== undefined ? opts.calculateHistograms : false;
    if (calculateHistograms) {
      histograms = pixelPipeline.calculateHistograms();
    }

    // Overlays
    const renderOverlays = opts.renderOverlays !== undefined ? opts.renderOverlays : true;
    if (renderOverlays) {
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
          overlay.render(renderedPixels, pixel.getWidth(), pixel.getHeight(), OverlayColor);
        }
      }
    }

    // Packed pixels to RGBA
    const rgbaPixels = new Uint8Array(4 * this.getWidth() * this.getHeight());
    for (let i = 0, p = 0; i < this.getWidth() * this.getHeight(); i++) {
      const pixel = renderedPixels[i];
      rgbaPixels[p++] = (pixel >> 0x10) & 0xff;
      rgbaPixels[p++] = (pixel >> 0x08) & 0xff;
      rgbaPixels[p++] = pixel & 0xff;
      rgbaPixels[p++] = 255;
    }

    // Rendering result
    renderingResult.frame = frame;
    renderingResult.pixels = rgbaPixels.buffer;
    if (windowLevel) {
      renderingResult.windowLevel = windowLevel;
    }
    if (histograms) {
      renderingResult.histograms = histograms;
    }

    return renderingResult;
  }
  //#endregion
}
//#endregion

//#region Exports
module.exports = DicomImage;
//#endregion
