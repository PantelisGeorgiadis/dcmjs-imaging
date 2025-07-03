const { Context, NativeCodecs } = require('dcmjs-codecs');
const { PixelRepresentation, PlanarConfiguration } = require('./Constants');

//#region NativePixelDecoder
class NativePixelDecoder {
  /**
   * Initializes native pixel decoder.
   * @method
   * @static
   * @async
   * @param {Object} [opts] - Native pixel decoder options.
   * @param {string} [opts.webAssemblyModulePathOrUrl] - Custom WebAssembly module path or URL.
   * If not provided, the module is trying to be resolved within the same directory.
   * @param {boolean} [opts.logNativeDecodersMessages] - Flag to indicate whether
   * to log native pixel decoder informational messages.
   */
  static async initializeAsync(opts) {
    if (NativeCodecs.isInitialized()) {
      return; // Already initialized
    }

    opts = opts || {};
    // Map old parameter name to new one for backward compatibility
    await NativeCodecs.initializeAsync({
      webAssemblyModulePathOrUrl: opts.webAssemblyModulePathOrUrl,
      logCodecsInfo: opts.logNativeEncodersMessages || false,
      logCodecsTrace: opts.logNativeEncodersMessages || false,
    });
  }

  /**
   * Checks if native codecs module is initialized.
   * @method
   * @static
   * @async
   * @returns {boolean} A flag indicating whether native codecs module is initialized.
   */
  static isInitialized() {
    return NativeCodecs.isInitialized();
  }

  /**
   * Releases native codecs.
   * @method
   * @static
   */
  static release() {
    NativeCodecs.release();
  }

  /**
   * Decodes RLE frame.
   * @method
   * @static
   * @param {Pixel} pixel - Pixel object.
   * @param {Uint8Array} data - Encoded pixels data.
   * @param {Object} [parameters] - Decoder parameters.
   * @returns {Uint8Array} Decoded pixels data.
   * @throws Error if NativePixelDecoder module is not initialized.
   */
  static decodeRle(pixel, data, parameters) {
    const context = this._createDecodingContext(pixel, data);
    const decodedContext = NativeCodecs.decodeRle(context, parameters);

    return decodedContext.getDecodedBuffer();
  }

  /**
   * Decodes JPEG frame (lossless or lossy).
   * @method
   * @static
   * @param {Pixel} pixel - Pixel object.
   * @param {Uint8Array} data - Encoded pixels data.
   * @param {Object} [parameters] - Decoder parameters.
   * @param {boolean} [parameters.convertColorspaceToRgb] - Convert colorspace to RGB.
   * @returns {Uint8Array} Decoded pixels data.
   * @throws Error if NativePixelDecoder module is not initialized.
   */
  static decodeJpeg(pixel, data, parameters) {
    const context = this._createDecodingContext(pixel, data);
    const decodedContext = NativeCodecs.decodeJpeg(context, parameters);

    return decodedContext.getDecodedBuffer();
  }

  /**
   * Decodes JPEG-LS frame.
   * @method
   * @static
   * @param {Pixel} pixel - Pixel object.
   * @param {Uint8Array} data - Encoded pixels data.
   * @param {Object} [parameters] - Decoder parameters.
   * @returns {Uint8Array} Decoded pixels data.
   * @throws Error if NativePixelDecoder module is not initialized.
   */
  static decodeJpegLs(pixel, data, parameters) {
    const context = this._createDecodingContext(pixel, data);
    const decodedContext = NativeCodecs.decodeJpegLs(context, parameters);

    return decodedContext.getDecodedBuffer();
  }

  /**
   * Decodes JPEG2000 frame.
   * @method
   * @static
   * @param {Pixel} pixel - Pixel object.
   * @param {Uint8Array} data - Encoded pixels data.
   * @param {Object} [parameters] - Decoder parameters.
   * @returns {Uint8Array} Decoded pixels data.
   * @throws Error if NativePixelDecoder module is not initialized.
   */
  static decodeJpeg2000(pixel, data, parameters) {
    const context = this._createDecodingContext(pixel, data);
    const decodedContext = NativeCodecs.decodeJpeg2000(context, parameters);

    return decodedContext.getDecodedBuffer();
  }

  //#region Private Methods
  /**
   * Creates a decoding context.
   * @method
   * @static
   * @private
   * @param {Pixel} pixel - Pixel object.
   * @param {Uint8Array} data - Encoded pixels data.
   * @returns {Context} Decoding context.
   */
  static _createDecodingContext(pixel, data) {
    return new Context({
      width: pixel.getWidth(),
      height: pixel.getHeight(),
      bitsAllocated: pixel.getBitsAllocated(),
      bitsStored: pixel.getBitsStored(),
      samplesPerPixel: pixel.getSamplesPerPixel(),
      pixelRepresentation: pixel.getPixelRepresentation()
        ? PixelRepresentation.Signed
        : PixelRepresentation.Unsigned,
      planarConfiguration: pixel.getPlanarConfiguration()
        ? PlanarConfiguration.Interleaved
        : PlanarConfiguration.Planar,
      photometricInterpretation: pixel.getPhotometricInterpretation(),
      encodedBuffer: data,
    });
  }
  //#endregion
}
//#endregion

//#region Exports
module.exports = NativePixelDecoder;
//#endregion
