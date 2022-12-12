const {
  RenderableTransferSyntaxes,
  TransferSyntax,
  OverlayColor,
  PhotometricInterpretation,
  StandardColorPalette,
} = require('./Constants');
const { PixelPipelineCache, LutPipelineCache } = require('./Cache');
const {
  LutPipeline,
  GrayscaleLutPipeline,
  RgbColorLutPipeline,
  PaletteColorLutPipeline,
} = require('./Lut');
const { Pixel, PixelPipeline } = require('./Pixel');
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
   * @param {Object} [opts] - Image options.
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
   * @returns {string|undefined} Element value or undefined if element doesn't exist.
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
   * @property {number} width - Rendered width.
   * @property {number} height - Rendered height.
   * @property {ArrayBuffer} pixels - Rendered pixels RGBA array buffer.
   * This format was chosen because it is suitable for rendering in a canvas object.
   * @property {WindowLevel} [windowLevel] - Window/level used to render the pixels.
   * @property {Array<Histogram>} [histograms] - Array of calculated per-channel histograms.
   * Histograms are calculated using the original pixel values.
   * @property {StandardColorPalette} [colorPalette] - Color palette used to render the pixels.
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
   * Renders the icon image located within an icon image sequence, if exists.
   * @method
   * @returns {RenderingResult} Rendering result object.
   */
  renderIcon() {
    return this._renderIcon();
  }

  /**
   * Gets the image description.
   * @method
   * @returns {string} DICOM image description.
   */
  toString() {
    const str = [];
    str.push('DICOM image:');
    str.push('='.repeat(50));
    str.push(JSON.stringify(this.getElements()));

    return str.join('\n');
  }

  //#region Private Methods
  /**
   * Loads a dataset from p10 buffer.
   * @method
   * @private
   * @param {ArrayBuffer} arrayBuffer - DICOM P10 array buffer.
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
    const denaturalizedDataset = DicomMessage._read(stream, syntaxLengthTypeToDecode, {
      ignoreErrors: true,
    });

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
   * @throws Error if transfer syntax cannot be rendered, requested frame is out of range or
   * optionally provided window level is not of type WindowLevel.
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
    let colorPalette = opts.colorPalette;
    let renderingResult = {};

    // Window/level
    let wl = opts.windowLevel;
    if (wl === undefined) {
      const windowLevels = WindowLevel.fromDicomImageElements(this.getElements());
      if (windowLevels.length > 0) {
        wl = windowLevels[0];
      }
    }

    // Pixel object
    const pixel = new Pixel(this.getElements(), this.getTransferSyntaxUid());

    // LUT pipeline
    const lutPipeline = this.lutPipelineCache.getOrCreate(pixel, wl, frame, colorPalette);
    const lut = lutPipeline.getLut();
    if (lut && !lut.isValid()) {
      lut.recalculate();
    }
    if (lutPipeline instanceof GrayscaleLutPipeline) {
      windowLevel = lutPipeline.getWindowLevel();
      if (colorPalette === undefined) {
        colorPalette = StandardColorPalette.Grayscale;
      }
    }
    if (
      lutPipeline instanceof RgbColorLutPipeline ||
      lutPipeline instanceof PaletteColorLutPipeline
    ) {
      colorPalette = undefined;
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
      const overlays = Overlay.fromDicomImageElements(this.getElements());
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
    const rgbaPixels = new Uint8Array(4 * pixel.getWidth() * pixel.getHeight());
    for (let i = 0, p = 0; i < pixel.getWidth() * pixel.getHeight(); i++) {
      const pixel = renderedPixels[i];
      rgbaPixels[p++] = (pixel >> 0x10) & 0xff;
      rgbaPixels[p++] = (pixel >> 0x08) & 0xff;
      rgbaPixels[p++] = pixel & 0xff;
      rgbaPixels[p++] = 255;
    }

    // Rendering result
    renderingResult.frame = frame;
    renderingResult.width = pixel.getWidth();
    renderingResult.height = pixel.getHeight();
    renderingResult.pixels = rgbaPixels.buffer;
    if (windowLevel) {
      renderingResult.windowLevel = windowLevel;
    }
    if (histograms) {
      renderingResult.histograms = histograms;
    }
    if (colorPalette !== undefined) {
      renderingResult.colorPalette = colorPalette;
    }

    return renderingResult;
  }

  /**
   * Rendering icon implementation.
   * @method
   * @private
   * @returns {RenderingResult} Rendering result object.
   * @throws Error if dataset does not contain an IconImageSequence,
   * photometric interpretation is not valid and transfer syntax cannot be rendered.
   */
  _renderIcon() {
    const iconImageSequence = this.getElement('IconImageSequence');
    if (
      iconImageSequence === undefined ||
      !Array.isArray(iconImageSequence) ||
      iconImageSequence.length === 0
    ) {
      throw new Error('Image does not contain IconImageSequence');
    }

    const iconImageSequenceItemElements = iconImageSequence.find((o) => o);
    const photometricInterpretation = iconImageSequenceItemElements['PhotometricInterpretation'];
    if (
      photometricInterpretation !== PhotometricInterpretation.PaletteColor &&
      photometricInterpretation !== PhotometricInterpretation.Monochrome1 &&
      photometricInterpretation !== PhotometricInterpretation.Monochrome2
    ) {
      throw new Error(
        `Photometric interpretation for IconImageSequence must be MONOCHROME 1, MONOCHROME 2 or PALETTE COLOR [photometric interpretation: ${photometricInterpretation}]`
      );
    }

    let syntax = this.getTransferSyntaxUid();
    if (
      syntax !== TransferSyntax.ImplicitVRLittleEndian &&
      syntax !== TransferSyntax.ExplicitVRLittleEndian &&
      syntax !== TransferSyntax.DeflatedExplicitVRLittleEndian &&
      syntax !== TransferSyntax.ExplicitVRBigEndian
    ) {
      const p = new Pixel(iconImageSequenceItemElements, syntax);
      const pixelData = p.getPixelData();
      let pixelBuffer = new Uint8Array(
        Array.isArray(pixelData) ? pixelData.find((o) => o) : pixelData
      );
      const uncompressedFrameSize = p.getUncompressedFrameSize();
      if (pixelBuffer.length === uncompressedFrameSize) {
        // There's a good chance the icon data to be uncompressed
        syntax = TransferSyntax.ExplicitVRLittleEndian;
      }
    }
    if (!RenderableTransferSyntaxes.includes(syntax)) {
      throw new Error(`Transfer syntax cannot be currently rendered [${syntax}]`);
    }

    // Returned objects
    let windowLevel = undefined;
    let colorPalette = undefined;
    let renderingResult = {};

    // Pixel object
    const pixel = new Pixel(iconImageSequenceItemElements, syntax);

    // LUT pipeline
    const lutPipeline = LutPipeline.create(pixel, undefined, 0, undefined);
    const lut = lutPipeline.getLut();
    if (lut && !lut.isValid()) {
      lut.recalculate();
    }
    if (lutPipeline instanceof GrayscaleLutPipeline) {
      windowLevel = lutPipeline.getWindowLevel();
      colorPalette = StandardColorPalette.Grayscale;
    }

    // Pixel pipeline
    const pixelPipeline = PixelPipeline.create(pixel, 0);
    let renderedPixels = pixelPipeline.render(lut);

    // Packed pixels to RGBA
    const rgbaPixels = new Uint8Array(4 * pixel.getWidth() * pixel.getHeight());
    for (let i = 0, p = 0; i < pixel.getWidth() * pixel.getHeight(); i++) {
      const pixel = renderedPixels[i];
      rgbaPixels[p++] = (pixel >> 0x10) & 0xff;
      rgbaPixels[p++] = (pixel >> 0x08) & 0xff;
      rgbaPixels[p++] = pixel & 0xff;
      rgbaPixels[p++] = 255;
    }

    // Rendering result
    renderingResult.frame = 0;
    renderingResult.width = pixel.getWidth();
    renderingResult.height = pixel.getHeight();
    renderingResult.pixels = rgbaPixels.buffer;
    if (windowLevel) {
      renderingResult.windowLevel = windowLevel;
    }
    if (colorPalette !== undefined) {
      renderingResult.colorPalette = colorPalette;
    }

    return renderingResult;
  }
  //#endregion
}
//#endregion

//#region Exports
module.exports = DicomImage;
//#endregion
