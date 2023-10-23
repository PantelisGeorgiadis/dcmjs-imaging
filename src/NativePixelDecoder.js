const { PhotometricInterpretation } = require('./Constants');
const log = require('./log');

/**
 * WebAssembly module filename.
 * @constant {string}
 */
const wasmFilename = 'native-pixel-decoder.wasm';
Object.freeze(wasmFilename);

/**
 * WASI error codes.
 * @constant {Object}
 */
const ErrNo = {
  Success: 0,
  BadFileDescriptor: 8,
};
Object.freeze(ErrNo);

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
    opts = opts || {};
    this.logNativeDecodersMessages = opts.logNativeDecodersMessages || false;
    this.webAssemblyModulePathOrUrl = opts.webAssemblyModulePathOrUrl;

    const instance = await this._createWebAssemblyInstance();
    this.wasmApi = {
      wasmInstance: instance,
      wasmMemory: instance.exports.memory,
      wasmEnv: {},

      createDecoderContext: instance.exports.CreateDecoderContext,
      releaseDecoderContext: instance.exports.ReleaseDecoderContext,
      getColumns: instance.exports.GetColumns,
      setColumns: instance.exports.SetColumns,
      getRows: instance.exports.GetRows,
      setRows: instance.exports.SetRows,
      getBitsAllocated: instance.exports.GetBitsAllocated,
      setBitsAllocated: instance.exports.SetBitsAllocated,
      getBitsStored: instance.exports.GetBitsStored,
      setBitsStored: instance.exports.SetBitsStored,
      getSamplesPerPixel: instance.exports.GetSamplesPerPixel,
      setSamplesPerPixel: instance.exports.SetSamplesPerPixel,
      getPixelRepresentation: instance.exports.GetPixelRepresentation,
      setPixelRepresentation: instance.exports.SetPixelRepresentation,
      getPlanarConfiguration: instance.exports.GetPlanarConfiguration,
      setPlanarConfiguration: instance.exports.SetPlanarConfiguration,
      getPhotometricInterpretation: instance.exports.GetPhotometricInterpretation,
      setPhotometricInterpretation: instance.exports.SetPhotometricInterpretation,
      getEncodedBuffer: instance.exports.GetEncodedBuffer,
      getEncodedBufferSize: instance.exports.GetEncodedBufferSize,
      setEncodedBuffer: instance.exports.SetEncodedBuffer,
      setEncodedBufferSize: instance.exports.SetEncodedBufferSize,
      getDecodedBuffer: instance.exports.GetDecodedBuffer,
      getDecodedBufferSize: instance.exports.GetDecodedBufferSize,
      setDecodedBuffer: instance.exports.SetDecodedBuffer,
      setDecodedBufferSize: instance.exports.SetDecodedBufferSize,

      createDecoderParameters: instance.exports.CreateDecoderParameters,
      releaseDecoderParameters: instance.exports.ReleaseDecoderParameters,
      getConvertColorspaceToRgb: instance.exports.GetConvertColorspaceToRgb,
      setConvertColorspaceToRgb: instance.exports.SetConvertColorspaceToRgb,

      decodeRleFn: instance.exports.DecodeRle,
      decodeJpegFn: instance.exports.DecodeJpeg,
      decodeJpegLsFn: instance.exports.DecodeJpegLs,
      decodeJpeg2000Fn: instance.exports.DecodeJpeg2000,
    };
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
    if (!this.wasmApi) {
      throw new Error('NativePixelDecoder module is not initialized');
    }

    const ctx = this._createDecoderContext(pixel, data);
    const params = this._createDecoderParameters(parameters);
    this.wasmApi.decodeRleFn(ctx, params);
    this._releaseDecoderParameters(params);

    return this._releaseDecoderContext(ctx);
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
    if (!this.wasmApi) {
      throw new Error('NativePixelDecoder module is not initialized');
    }

    const ctx = this._createDecoderContext(pixel, data);
    const params = this._createDecoderParameters(parameters);
    this.wasmApi.decodeJpegFn(ctx, params);
    this._releaseDecoderParameters(params);

    return this._releaseDecoderContext(ctx);
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
    if (!this.wasmApi) {
      throw new Error('NativePixelDecoder module is not initialized');
    }

    const ctx = this._createDecoderContext(pixel, data);
    const params = this._createDecoderParameters(parameters);
    this.wasmApi.decodeJpegLsFn(ctx, params);
    this._releaseDecoderParameters(params);

    return this._releaseDecoderContext(ctx);
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
    if (!this.wasmApi) {
      throw new Error('NativePixelDecoder module is not initialized');
    }

    const ctx = this._createDecoderContext(pixel, data);
    const params = this._createDecoderParameters(parameters);
    this.wasmApi.decodeJpeg2000Fn(ctx, params);
    this._releaseDecoderParameters(params);

    return this._releaseDecoderContext(ctx);
  }

  //#region Private Methods
  /**
   * Creates the decoder context.
   * @method
   * @static
   * @private
   * @param {Pixel} pixel - Pixel object.
   * @param {Uint8Array} data - Encoded pixels data.
   * @returns {number} Decoder context pointer.
   * @throws Error if NativePixelDecoder module is not initialized.
   */
  static _createDecoderContext(pixel, data) {
    if (!this.wasmApi) {
      throw new Error('NativePixelDecoder module is not initialized');
    }

    const ctx = this.wasmApi.createDecoderContext();
    this.wasmApi.setColumns(ctx, pixel.getWidth());
    this.wasmApi.setRows(ctx, pixel.getHeight());
    this.wasmApi.setBitsAllocated(ctx, pixel.getBitsAllocated());
    this.wasmApi.setBitsStored(ctx, pixel.getBitsStored());
    this.wasmApi.setSamplesPerPixel(ctx, pixel.getSamplesPerPixel());
    this.wasmApi.setPixelRepresentation(ctx, pixel.getPixelRepresentation());
    this.wasmApi.setPlanarConfiguration(ctx, pixel.getPlanarConfiguration());
    this.wasmApi.setPhotometricInterpretation(
      ctx,
      Object.keys(PhotometricInterpretation).indexOf(pixel.getPhotometricInterpretation())
    );

    this.wasmApi.setEncodedBufferSize(ctx, data.length);
    const encodedDataPointer = this.wasmApi.getEncodedBuffer(ctx);
    const heap8 = new Uint8Array(this.wasmApi.wasmMemory.buffer);
    heap8.set(data, encodedDataPointer);

    return ctx;
  }

  /**
   * Gathers the decoded data and releases the decoder context.
   * @method
   * @static
   * @private
   * @param {number} ctx - Decoder context pointer.
   * @returns {Uint8Array} Decoded pixels data.
   * @throws Error if NativePixelDecoder module is not initialized.
   */
  static _releaseDecoderContext(ctx) {
    if (!this.wasmApi) {
      throw new Error('NativePixelDecoder module is not initialized');
    }

    const decodedDataPointer = this.wasmApi.getDecodedBuffer(ctx);
    const decodedDataSize = this.wasmApi.getDecodedBufferSize(ctx);
    const heap8 = new Uint8Array(this.wasmApi.wasmMemory.buffer);
    const decodedDataView = new Uint8Array(heap8.buffer, decodedDataPointer, decodedDataSize);
    const decodedData = decodedDataView.slice(0);

    this.wasmApi.releaseDecoderContext(ctx);

    return decodedData;
  }

  /**
   * Creates the decoder parameters.
   * @method
   * @static
   * @private
   * @param {Object} [parameters] - Decoder parameters.
   * @param {boolean} [parameters.convertColorspaceToRgb] - Convert colorspace to RGB.
   * @returns {number} Decoder parameters pointer.
   * @throws Error if NativePixelDecoder module is not initialized.
   */
  static _createDecoderParameters(parameters) {
    parameters = parameters || {};
    if (!this.wasmApi) {
      throw new Error('NativePixelDecoder module is not initialized');
    }

    const params = this.wasmApi.createDecoderParameters();
    this.wasmApi.setConvertColorspaceToRgb(params, parameters.convertColorspaceToRgb || false);

    return params;
  }

  /**
   * Releases the decoder parameters.
   * @method
   * @static
   * @private
   * @param {number} params - Decoder parameters pointer.
   * @throws Error if NativePixelDecoder module is not initialized.
   */
  static _releaseDecoderParameters(params) {
    if (!this.wasmApi) {
      throw new Error('NativePixelDecoder module is not initialized');
    }

    this.wasmApi.releaseDecoderParameters(params);
  }

  /**
   * Creates WebAssembly instance.
   * @method
   * @static
   * @private
   * @async
   * @returns {Object} WebAssembly instance.
   */
  static async _createWebAssemblyInstance() {
    /* c8 ignore start */
    const imports = {
      wasi_snapshot_preview1: {
        /**
         * Gets the environment variables.
         * @method
         * @param {number} envOffset - The environment.
         * @param {number} envBufferOffset - The address of the buffer.
         * @returns {number} Error code.
         * @throws Error if NativePixelDecoder module is not initialized.
         */
        environ_get: (envOffset, envBufferOffset) => {
          if (!this.wasmApi) {
            throw new Error('NativePixelDecoder module is not initialized');
          }

          const memoryData = new Uint8Array(this.wasmApi.wasmMemory.buffer);
          const memoryView = new DataView(this.wasmApi.wasmMemory.buffer);

          const env = this.wasmApi.wasmEnv;
          Object.keys(env).forEach((key) => {
            memoryView.setUint32(envOffset, envBufferOffset, true);
            envOffset += 4;

            const data = this._stringToBytes(`${key}=${env[key]}\0`);
            memoryData.set(data, envBufferOffset);
            envBufferOffset += data.length;
          });

          return ErrNo.Success;
        },

        /**
         * Get the size required to store the environment variables.
         * @method
         * @param {number} envCount - The number of environment variables.
         * @param {number} envBufferSize -The size of the environment variables buffer.
         * @returns {number} Error code.
         * @throws Error if NativePixelDecoder module is not initialized.
         */
        environ_sizes_get: (envCount, envBufferSize) => {
          if (!this.wasmApi) {
            throw new Error('NativePixelDecoder module is not initialized');
          }

          const memoryView = new DataView(this.wasmApi.wasmMemory.buffer);

          const env = this.wasmApi.wasmEnv;
          memoryView.setUint32(envCount, Object.keys(env).length, true);
          memoryView.setUint32(
            envBufferSize,
            Object.keys(env).reduce((acc, key) => {
              return acc + this._stringToBytes(`${key}=${env[key]}\0`).length;
            }, 0),
            true
          );

          return ErrNo.Success;
        },

        /**
         * Called on WebAssembly exit.
         * @method
         * @param {number} rval - The return value.
         * @throws Error if WebAssembly module exits.
         */
        proc_exit: (rval) => {
          throw new Error(`WebAssembly module exited with return value ${rval}`);
        },

        /**
         * Writes to file descriptor.
         * @method
         * @param {number} fd - The file descriptor.
         * @param {number} iovsOffset - The address of the scatter vector.
         * @param {number} iovsLength - The length of the scatter vector.
         * @param {number} nWritten - The number of items written.
         * @returns {number} Error code.
         * @throws Error if NativePixelDecoder module is not initialized.
         */
        fd_write: (fd, iovsOffset, iovsLength, nWritten) => {
          if (!this.wasmApi) {
            throw new Error('NativePixelDecoder module is not initialized');
          }

          // Accept only stdout (1) or stderr (2) writes
          if (!(fd === 1 || fd === 2)) {
            return ErrNo.BadFileDescriptor;
          }

          const memoryView = new DataView(this.wasmApi.wasmMemory.buffer);

          let written = 0;
          for (let i = 0; i < iovsLength; i++) {
            const dataOffset = memoryView.getUint32(iovsOffset, true);
            iovsOffset += 4;

            const dataLength = memoryView.getUint32(iovsOffset, true);
            iovsOffset += 4;

            const str = this._wasmToJsString(dataOffset, dataLength);
            log.error(`NativePixelDecoder::fd_write::${str}`);
            written += dataLength;
          }

          memoryView.setUint32(nWritten, written, true);

          return ErrNo.Success;
        },

        /**
         * Seeks the file descriptor.
         * @method
         * @param {number} fd - The file descriptor.
         * @param {number} offset - The offset.
         * @param {number} whence - Whence.
         * @param {number} newOffset - The new offset.
         * @returns {number} Error code.
         */
        // eslint-disable-next-line no-unused-vars
        fd_seek: (fd, offset, whence, newOffset) => {
          return ErrNo.Success;
        },

        /**
         * Closes the file descriptor.
         * @method
         * @param {number} fd - The file descriptor.
         * @returns {number} Error code.
         */
        // eslint-disable-next-line no-unused-vars
        fd_close: (fd) => {
          return ErrNo.Success;
        },
      },
      env: {
        /**
         * Called when memory has grown.
         * @method
         * @param {number} index - Which memory has grown.
         */
        // eslint-disable-next-line no-unused-vars
        emscripten_notify_memory_growth: (index) => {},

        /**
         * Receives a string message from the WebAssembly.
         * @method
         * @param {number} pointer - The string message pointer.
         * @param {number} len - The string message length.
         */
        onNativePixelDecoderMessage: (pointer, len) => {
          if (!this.logNativeDecodersMessages) {
            return;
          }

          const str = this._wasmToJsString(pointer, len);
          log.info(`NativePixelDecoder::onNativePixelDecoderMessage::${str}`);
        },

        /**
         * Receives an exception from the WebAssembly.
         * @method
         * @param {number} pointer - The exception reason string pointer.
         * @param {number} len - The exception reason string length.
         * @throws Error if NativePixelDecoder module exception occurs.
         */
        onNativePixelDecoderException: (pointer, len) => {
          const str = this._wasmToJsString(pointer, len);
          throw new Error(str);
        },
      },
    };
    /* c8 ignore stop */

    const wasmBytes = await this._getWebAssemblyBytes();
    const { instance } = await WebAssembly.instantiate(wasmBytes, imports);

    return instance;
  }

  /**
   * Fetches WebAssembly module bytes as an array buffer.
   * @method
   * @static
   * @private
   * @async
   * @returns {ArrayBuffer} WebAssembly bytes.
   */
  /* c8 ignore start */
  static async _getWebAssemblyBytes() {
    const isNodeJs = !!(
      typeof process !== 'undefined' &&
      process.versions &&
      process.versions.node
    );
    if (!isNodeJs) {
      const response = await eval('fetch(this.webAssemblyModulePathOrUrl || wasmFilename)');

      return await response.arrayBuffer();
    }

    const fs = eval("require('fs')");
    const path = eval("require('path')");
    const buffer = await fs.promises.readFile(
      this.webAssemblyModulePathOrUrl || path.resolve(__dirname, wasmFilename)
    );

    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  }
  /* c8 ignore stop */

  /**
   * Converts an in-WebAssembly-memory string to a js string.
   * @method
   * @static
   * @private
   * @param {number} pointer - String pointer.
   * @param {number} len - String length.
   * @returns {string} The string object.
   * @throws Error if NativePixelDecoder module is not initialized.
   */
  static _wasmToJsString(pointer, len) {
    if (!this.wasmApi) {
      throw new Error('NativePixelDecoder module is not initialized');
    }

    const heap = new Uint8Array(this.wasmApi.wasmMemory.buffer);
    const stringData = new Uint8Array(heap.buffer, pointer, len);
    let str = '';
    for (let i = 0; i < len; i++) {
      str += String.fromCharCode(stringData[i]);
    }

    return str;
  }

  /**
   * Converts a string to a byte array.
   * @method
   * @static
   * @private
   * @param {number} str - String to convert.
   * @returns {Uint8Array} The byte array.
   */
  static _stringToBytes(str) {
    return str.split('').map((x) => x.charCodeAt(0));
  }
  //#endregion
}
//#endregion

//#region Exports
module.exports = NativePixelDecoder;
//#endregion
