const {
  OverlayColor,
  PhotometricInterpretation,
  RenderableTransferSyntaxes,
  StandardColorPalette,
  TransferSyntax,
} = require('./Constants');
const { LutPipelineCache, PixelPipelineCache } = require('./Cache');
const {
  GrayscaleLutPipeline,
  LutPipeline,
  PaletteColorLutPipeline,
  RgbColorLutPipeline,
} = require('./Lut');
const { Pixel, PixelPipeline } = require('./Pixel');
const { G60xxOverlay, Overlay } = require('./Overlay');
const WindowLevel = require('./WindowLevel');
const log = require('./log');

const dcmjs = require('dcmjs');
const { DicomMessage, DicomMetaDictionary, ReadBufferStream, Tag, WriteBufferStream } = dcmjs.data;
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
   * @param {Object} [writeOptions] - The write options to pass through to `DicomMessage.write()`.
   * @param {Object} [nameMap] - Additional DICOM tags to recognize when denaturalizing the dataset.
   * @returns {ArrayBuffer} DICOM dataset buffer.
   */
  getDenaturalizedDataset(writeOptions, nameMap) {
    const denaturalizedDataset = nameMap
      ? DicomMetaDictionary.denaturalizeDataset(this.getElements(), {
          ...DicomMetaDictionary.nameMap,
          ...nameMap,
        })
      : DicomMetaDictionary.denaturalizeDataset(this.getElements());

    const stream = new WriteBufferStream();
    DicomMessage.write(denaturalizedDataset, stream, this.transferSyntaxUid, writeOptions);

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
   * Loads a dataset from P10 buffer.
   * @method
   * @private
   * @param {ArrayBuffer} arrayBuffer - DICOM P10 array buffer.
   * @returns {Object} Dataset elements and transfer syntax UID.
   */
  _fromP10Buffer(arrayBuffer) {
    const dicomDict = DicomMessage.readFile(
      this._checkAndPatchP10PreamblePrefixAndMeta(arrayBuffer),
      {
        ignoreErrors: true,
      }
    );
    const meta = DicomMetaDictionary.naturalizeDataset(dicomDict.meta);
    const transferSyntaxUid = meta.TransferSyntaxUID;
    const elements = DicomMetaDictionary.naturalizeDataset(dicomDict.dict);

    return { elements, transferSyntaxUid };
  }

  /**
   * Checks and patches the P10 buffer preamble, prefix and meta file information header.
   * @method
   * @private
   * @param {ArrayBuffer} arrayBuffer - DICOM P10 array buffer.
   * @returns {ArrayBuffer} Patched DICOM P10 array buffer.
   */
  _checkAndPatchP10PreamblePrefixAndMeta(arrayBuffer) {
    if (arrayBuffer.byteLength < 132) {
      throw new Error(
        `Invalid DICOM file - buffer length is less than 132 bytes [length: ${arrayBuffer.byteLength}]`
      );
    }

    const stream = new ReadBufferStream(arrayBuffer, true, {
      noCopy: true,
    });
    stream.reset();
    stream.increment(128);
    if (stream.readAsciiString(4) === 'DICM') {
      return arrayBuffer;
    }

    let bigEndian = false;
    stream.reset();

    // Test for file meta info
    let group = stream.readUint16();
    if (group > 0x00ff) {
      // Big endian -- swap
      group = ((group & 0xff) << 8) | ((group >> 8) & 0xff);
      stream.setEndian(false);
      bigEndian = true;
    }
    if (group > 0x00ff) {
      throw new Error(`Invalid DICOM file - read invalid group [group: ${group}]`);
    }

    const arrayBuffers = [];
    arrayBuffers.push(new ArrayBuffer(128));
    const prefix = Uint8Array.from([
      'D'.charCodeAt(0),
      'I'.charCodeAt(0),
      'C'.charCodeAt(0),
      'M'.charCodeAt(0),
    ]);
    arrayBuffers.push(
      prefix.buffer.slice(prefix.byteOffset, prefix.byteOffset + prefix.byteLength)
    );

    if (group > 0x0002) {
      // No meta file information -- attempt to find the syntax
      const element = stream.readUint16();
      const tag = Tag.fromNumbers(group, element);
      const dictionaryEntry = DicomMessage.lookupTag(tag);
      if (element !== 0x0000 && !dictionaryEntry) {
        throw new Error(
          `Invalid DICOM file - could not find tag in the dictionary [tag: ${tag.toString()}]`
        );
      }

      // Guess encoding
      const vr = stream.readVR();
      const vr0 = vr.charCodeAt(0);
      const vr1 = vr.charCodeAt(1);
      const implicit = vr0 >= 65 && vr0 <= 90 && vr1 >= 65 && vr1 <= 90 ? false : true;
      if (bigEndian && implicit) {
        throw new Error('Invalid DICOM file - implicit VR big endian syntax found');
      }

      // Guess transfer syntax
      const syntax = bigEndian
        ? TransferSyntax.ExplicitVRBigEndian
        : implicit
          ? TransferSyntax.ImplicitVRLittleEndian
          : TransferSyntax.ExplicitVRLittleEndian;

      // Build meta file information including just the guessed transfer syntax
      const metaElementsStream = new WriteBufferStream();
      DicomMessage.write(
        DicomMetaDictionary.denaturalizeDataset({
          TransferSyntaxUID: syntax,
        }),
        metaElementsStream,
        TransferSyntax.ExplicitVRLittleEndian,
        {}
      );

      // Calculate the meta file information length and prepend it
      const metaFileInformationStream = new WriteBufferStream();
      DicomMessage.writeTagObject(
        metaFileInformationStream,
        '00020000',
        'UL',
        metaElementsStream.size,
        TransferSyntax.ExplicitVRLittleEndian,
        {}
      );
      metaFileInformationStream.concat(metaElementsStream);
      arrayBuffers.push(metaFileInformationStream.getBuffer());

      log.warn(
        `DICOM meta file information was not found and was added containing transfer syntax UID ${syntax}`
      );
    }
    arrayBuffers.push(arrayBuffer);

    // Concatenate all buffers
    return arrayBuffers.reduce((pBuf, cBuf, i) => {
      if (i === 0) {
        return pBuf;
      }
      const tmp = new Uint8Array(pBuf.byteLength + cBuf.byteLength);
      tmp.set(new Uint8Array(pBuf), 0);
      tmp.set(new Uint8Array(cBuf), pBuf.byteLength);

      return tmp.buffer;
    }, arrayBuffers[0]);
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
      for (let i = 0; i < overlays.length; i++) {
        const overlay = overlays[i];
        if (overlay instanceof G60xxOverlay) {
          if (
            frame + 1 < overlay.getFrameOrigin() ||
            frame + 1 > overlay.getFrameOrigin() + overlay.getNumberOfFrames() - 1
          ) {
            continue;
          }
        }
        overlay.render(renderedPixels, pixel.getWidth(), pixel.getHeight(), OverlayColor);
      }
    }

    // Packed pixels to RGBA
    const rgbaPixels = new Uint8Array(4 * pixel.getWidth() * pixel.getHeight());
    for (let i = 0, p = 0; i < pixel.getWidth() * pixel.getHeight(); i++) {
      const pixel = renderedPixels[i];
      rgbaPixels[p++] = (pixel >> 0x10) & 0xff;
      rgbaPixels[p++] = (pixel >> 0x08) & 0xff;
      rgbaPixels[p++] = pixel & 0xff;
      rgbaPixels[p++] = 0xff;
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
      rgbaPixels[p++] = 0xff;
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
