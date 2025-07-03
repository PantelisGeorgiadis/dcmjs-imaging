const { Context, NativeCodecs } = require('dcmjs-codecs');
const { PixelRepresentation, PlanarConfiguration } = require('./Constants');

//#region NativePixelEncoder
class NativePixelEncoder {
  /**
   * Initializes native pixel encoder.
   * @method
   * @static
   * @async
   * @param {Object} [opts] - Native pixel encoder options.
   * @param {string} [opts.webAssemblyModulePathOrUrl] - Custom WebAssembly module path or URL.
   * If not provided, the module is trying to be resolved within the same directory.
   * @param {boolean} [opts.logNativeEncodersMessages] - Flag to indicate whether
   * to log native pixel encoder informational messages.
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
    return NativeCodecs.release();
  }

  /**
   * Encodes frame using RLE compression.
   * @method
   * @static
   * @param {Pixel} pixel - Pixel object.
   * @param {Uint8Array} data - Uncompressed pixels data.
   * @param {Object} [parameters] - Encoder parameters.
   * @returns {Uint8Array} Encoded pixels data.
   * @throws Error if NativePixelEncoder module is not initialized.
   */
  static encodeRle(pixel, data, parameters) {
    const context = this._createEncodingContext(pixel, data);
    const encodedContext = NativeCodecs.encodeRle(context, parameters);

    return encodedContext.getEncodedBuffer();
  }

  /**
   * Encodes frame using JPEG compression (lossless or lossy).
   * @method
   * @static
   * @param {Pixel} pixel - Pixel object.
   * @param {Uint8Array} data - Uncompressed pixels data.
   * @param {Object} [parameters] - Encoder parameters.
   * @param {number} [parameters.quality] - JPEG quality factor (1-100).
   * @param {boolean} [parameters.lossless] - Use lossless JPEG encoding.
   * @returns {Uint8Array} Encoded pixels data.
   * @throws Error if NativePixelEncoder module is not initialized.
   */
  static encodeJpeg(pixel, data, parameters) {
    const context = this._createEncodingContext(pixel, data);
    const encodedContext = NativeCodecs.encodeJpeg(context, parameters);

    return encodedContext.getEncodedBuffer();
  }

  /**
   * Encodes frame using JPEG-LS compression.
   * @method
   * @static
   * @param {Pixel} pixel - Pixel object.
   * @param {Uint8Array} data - Uncompressed pixels data.
   * @param {Object} [parameters] - Encoder parameters.
   * @param {number} [parameters.nearLossless] - Near-lossless compression parameter (0 for lossless).
   * @returns {Uint8Array} Encoded pixels data.
   * @throws Error if NativePixelEncoder module is not initialized.
   */
  static encodeJpegLs(pixel, data, parameters) {
    const context = this._createEncodingContext(pixel, data);
    const encodedContext = NativeCodecs.encodeJpegLs(context, parameters);

    return encodedContext.getEncodedBuffer();
  }

  /**
   * Encodes frame using JPEG2000 compression.
   * @method
   * @static
   * @param {Pixel} pixel - Pixel object.
   * @param {Uint8Array} data - Uncompressed pixels data.
   * @param {Object} [parameters] - Encoder parameters.
   * @param {number} [parameters.compressionRatio] - Compression ratio for lossy encoding.
   * @param {boolean} [parameters.lossless] - Use lossless JPEG2000 encoding.
   * @returns {Uint8Array} Encoded pixels data.
   * @throws Error if NativePixelEncoder module is not initialized.
   */
  static encodeJpeg2000(pixel, data, parameters) {
    const context = this._createEncodingContext(pixel, data);
    const encodedContext = NativeCodecs.encodeJpeg2000(context, parameters);

    return encodedContext.getEncodedBuffer();
  }

  /**
   * Creates an encoding context.
   * @method
   * @static
   * @private
   * @param {Pixel} pixel - Pixel object.
   * @param {Uint8Array} data - Uncompressed pixels data.
   * @returns {Context} Encoding context.
   */
  static _createEncodingContext(pixel, data) {
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
      decodedBuffer: data, // For encoding, we provide the uncompressed data as decodedBuffer
    });
  }
}
//#endregion

//#region Exports
module.exports = NativePixelEncoder;
//#endregion
