const {
  PhotometricInterpretation,
  PlanarConfiguration,
  PixelRepresentation,
  TransferSyntax,
} = require('./Constants');

const RleDecoder = require('./RleDecoder');

//#region Pixel
class Pixel {
  /**
   * Creates an instance of Pixel.
   * @constructor
   * @param {DicomImage} image - DICOM image object.
   */
  constructor(image) {
    this.transferSyntaxUid = image.getTransferSyntaxUid();
    this.frames = image.getNumberOfFrames();
    this.width = image.getWidth();
    this.height = image.getHeight();
    this.bitsStored = image.getElement('BitsStored') || 0;
    this.bitsAllocated = image.getElement('BitsAllocated') || 0;
    this.highBit = image.getElement('HighBit') || this.bitsStored - 1;
    this.samplesPerPixel = image.getElement('SamplesPerPixel') || 1;
    this.pixelRepresentation =
      image.getElement('PixelRepresentation') || PixelRepresentation.Unsigned;
    this.planarConfiguration =
      image.getElement('PlanarConfiguration') || PlanarConfiguration.Interleaved;
    const photometricInterpretation = image.getElement('PhotometricInterpretation');
    this.photometricInterpretation = photometricInterpretation
      ? photometricInterpretation.replace(/[^ -~]+/g, '').trim()
      : '';
    this.rescaleSlope = image.getElement('RescaleSlope') || 1.0;
    this.rescaleIntercept = image.getElement('RescaleIntercept') || 0.0;
    this.pixelData = image.getElement('PixelData');
  }

  /**
   * Gets the transfer syntax UID.
   * @method
   * @returns {string} Transfer syntax UID.
   */
  getTransferSyntaxUid() {
    return this.transferSyntaxUid;
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
   * Gets the image width.
   * @method
   * @returns {number} Width.
   */
  getWidth() {
    return this.width;
  }

  /**
   * Gets the image height.
   * @method
   * @returns {number} Height.
   */
  getHeight() {
    return this.height;
  }

  /**
   * Gets the bits stored.
   * @method
   * @returns {number} Bits stored.
   */
  getBitsStored() {
    return this.bitsStored;
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
   * Gets the bytes allocated.
   * @method
   * @returns {number} Bytes allocated.
   */
  getBytesAllocated() {
    let bytes = this.getBitsAllocated() / 8;
    if (this.getBitsAllocated() % 8 > 0) {
      bytes++;
    }
    return bytes;
  }

  /**
   * Gets the high bits.
   * @method
   * @returns {number} High bit.
   */
  getHighBit() {
    return this.highBit;
  }

  /**
   * Gets the samples per pixel.
   * @method
   * @returns {number} Samples per pixel.
   */
  getSamplesPerPixel() {
    return this.samplesPerPixel;
  }

  /**
   * Gets the pixel representation.
   * @method
   * @returns {PixelRepresentation} Pixel representation.
   */
  getPixelRepresentation() {
    return this.pixelRepresentation;
  }

  /**
   * Checks whether the pixels are comprised of signed values.
   * @method
   * @returns {boolean} Whether the pixels are comprised of signed values.
   */
  isSigned() {
    return this.getPixelRepresentation() !== PixelRepresentation.Unsigned;
  }

  /**
   * Gets the minimum pixel value.
   * @method
   * @returns {number} Minimum pixel value.
   */
  getMinimumPixelValue() {
    return this.isSigned() ? -(1 << (this.getBitsStored() - 1)) : 0;
  }

  /**
   * Gets the maximum pixel value.
   * @method
   * @returns {number} Maximum pixel value.
   */
  getMaximumPixelValue() {
    return this.isSigned()
      ? (1 << (this.getBitsStored() - 1)) - 1
      : (1 << this.getBitsStored()) - 1;
  }

  /**
   * Gets the planar configuration.
   * @method
   * @returns {PlanarConfiguration} Planar configuration.
   */
  getPlanarConfiguration() {
    return this.planarConfiguration;
  }

  /**
   * Checks whether the pixels configuration is planar.
   * @method
   * @returns {boolean} Whether the pixels configuration is planar.
   */
  isPlanar() {
    return this.getPlanarConfiguration() !== 0;
  }

  /**
   * Gets the photometric interpretation.
   * @method
   * @returns {PhotometricInterpretation} Photometric interpretation.
   */
  getPhotometricInterpretation() {
    return this.photometricInterpretation;
  }

  /**
   * Gets the uncompressed frame size.
   * @method
   * @returns {number} Uncompressed frame size.
   */
  getUncompressedFrameSize() {
    if (this.getBitsAllocated() === 1) {
      return (this.getWidth() * this.getHeight() - 1) / 8 + 1;
    }
    if (this.getPhotometricInterpretation() == PhotometricInterpretation.YbrFull422) {
      const syntax = this.getTransferSyntaxUid();
      if (
        syntax === TransferSyntax.ImplicitVRLittleEndian ||
        syntax === TransferSyntax.ExplicitVRLittleEndian ||
        syntax === TransferSyntax.ExplicitVRBigEndian
      ) {
        return this.getBytesAllocated() * 2 * this.getWidth() * this.getHeight();
      }
    }
    return (
      this.getWidth() * this.getHeight() * this.getBytesAllocated() * this.getSamplesPerPixel()
    );
  }

  /**
   * Gets the rescale slope.
   * @method
   * @returns {number} Rescale slope.
   */
  getRescaleSlope() {
    return this.rescaleSlope;
  }

  /**
   * Gets the rescale intercept.
   * @method
   * @returns {number} Rescale intercept.
   */
  getRescaleIntercept() {
    return this.rescaleIntercept;
  }

  /**
   * Gets the pixel data.
   * @method
   * @returns {Array<ArrayBuffer>} Pixel data.
   */
  getPixelData() {
    return this.pixelData;
  }

  /**
   * Gets the pixel data as an array of unsigned byte values.
   * @method
   *  @param {number} frame - Frame index.
   * @returns {Uint8Array} Pixel data as an array of unsigned byte values.
   */
  getFrameDataU8(frame) {
    return this._getFrameBuffer(frame);
  }

  /**
   * Gets the pixel data as an array of unsigned short values.
   * @method
   * @param {number} frame - Frame index.
   * @returns {Uint16Array} Pixel data as an array of unsigned short values.
   */
  getFrameDataU16(frame) {
    const frameBuffer = this._getFrameBuffer(frame);

    return new Uint16Array(
      frameBuffer.buffer,
      frameBuffer.byteOffset,
      frameBuffer.byteLength / Uint16Array.BYTES_PER_ELEMENT
    );
  }

  /**
   * Gets the pixel data as an array of signed short values.
   * @method
   * @param {number} frame - Frame index.
   * @returns {Int16Array} Pixel data as an array of signed short values.
   */
  getFrameDataS16(frame) {
    const sign = 1 << this.getHighBit();
    const mask = sign - 1;
    const count = this.getWidth() * this.getHeight();

    const u16 = this.getFrameDataU16(frame);
    const s16 = new Int16Array(count);

    for (let p = 0; p < count; p++) {
      const d = u16[p];
      s16[p] = (d & sign) !== 0 ? -(d & mask) : d & mask;
    }

    return s16;
  }

  /**
   * Gets the pixel description.
   * @method
   * @returns {string} Pixel description.
   */
  toString() {
    const str = [];
    str.push(`Pixel Data: ${this.getTransferSyntaxUid()}`);
    str.push(`    Photometric Interpretation: ${this.getPhotometricInterpretation()}`);
    str.push(
      `    Bits Allocated: ${this.getBitsAllocated()};  Stored: ${this.getBitsStored()};  High: ${this.getHighBit()};  Signed: ${
        this.isSigned() ? 'True' : 'False'
      }`
    );
    str.push(
      `    Width: ${this.getWidth()};  Height: ${this.getHeight()};  Frames: ${this.getNumberOfFrames()}`
    );
    if (this.getSamplesPerPixel() > 1) {
      str.push(
        `    Samples/Pixel: ${this.getSamplesPerPixel()};  Planar: ${
          this.isPlanar() ? 'True' : 'False'
        }`
      );
    } else {
      str.push(
        `    Rescale Slope: ${this.getRescaleSlope()};  Intercept: ${this.getRescaleIntercept()}`
      );
    }

    return str.join('\n');
  }

  //#region Private Methods
  /**
   * Gets the frame data of the desired frame as an array of unsigned byte values.
   * @method
   * @private
   * @param {number} frame - Frame index.
   * @returns {Uint8Array} Frame data as an array of unsigned byte values.
   */
  _getFrameBuffer(frame) {
    if (frame < 0 || frame >= this.getNumberOfFrames()) {
      throw new Error(`Requested frame is out of range [${frame}]`);
    }
    if (!this.getPixelData()) {
      throw new Error('Could not extract pixel data');
    }
    if (!this.getWidth() || !this.getHeight()) {
      throw new Error(
        `Width/height has an invalid value [w: ${this.getWidth()}, h: ${this.getHeight()}]`
      );
    }
    if (!this.getBitsAllocated() || !this.getBitsStored()) {
      throw new Error(
        `Bits allocated/stored has an invalid value [allocated: ${this.getBitsAllocated()}, stored: ${this.getBitsStored()}]`
      );
    }
    if (!this.getPhotometricInterpretation()) {
      throw new Error(
        `Photometric interpretation has an invalid value [${this.getPhotometricInterpretation()}]`
      );
    }

    const pixelBuffers = this.getPixelData();
    if (
      this.getTransferSyntaxUid() === TransferSyntax.ImplicitVRLittleEndian ||
      this.getTransferSyntaxUid() === TransferSyntax.ExplicitVRLittleEndian ||
      this.getTransferSyntaxUid() === TransferSyntax.ExplicitVRBigEndian
    ) {
      // Take the first buffer from pixel buffers
      let pixelBuffer = new Uint8Array(
        Array.isArray(pixelBuffers) ? pixelBuffers.find((o) => o) : pixelBuffers
      );
      if (
        this.getTransferSyntaxUid() === TransferSyntax.ExplicitVRBigEndian &&
        this.getBitsStored() > 8 &&
        this.getBitsStored() <= 16
      ) {
        for (let i = 0; i < pixelBuffer.length; i += 2) {
          let holder = pixelBuffer[i];
          pixelBuffer[i] = pixelBuffer[i + 1];
          pixelBuffer[i + 1] = holder;
        }
      }

      const frameSize = this.getUncompressedFrameSize();
      const frameOffset = frameSize * frame;

      return pixelBuffer.slice(frameOffset, frameOffset + frameSize);
    } else {
      if (frame >= pixelBuffers.length) {
        throw new Error(
          `Requested frame is larger or equal to the pixel fragments number [frame: (${frame}), fragments: ${pixelBuffers.length}]`
        );
      }
      // Assume that each fragment holds a complete frame
      // which might not always be the case
      if (this.getTransferSyntaxUid() === TransferSyntax.RleLossless) {
        return PixelDecoder.decodeRle(this, new Uint8Array(pixelBuffers[frame]));
      } else {
        throw new Error(
          `Transfer syntax cannot be currently decoded [${this.getTransferSyntaxUid()}]`
        );
      }
    }
  }
  //#endregion
}
//#endregion

//#region PixelPipeline
class PixelPipeline {
  /**
   * Gets the image width.
   * @method
   * @returns {number} Width.
   */
  getWidth() {
    throw new Error('getWidth should be implemented');
  }

  /**
   * Gets the image height.
   * @method
   * @returns {number} Height.
   */
  getHeight() {
    throw new Error('getHeight should be implemented');
  }

  /**
   * Gets the image components.
   * @method
   * @returns {number} Components.
   */
  getComponents() {
    throw new Error('getComponents should be implemented');
  }

  /**
   * Renders the image.
   * @method
   * @param {Lut} [lut] - Lookup table.
   * @returns {Int32Array} Rendered pixels.
   */
  // eslint-disable-next-line no-unused-vars
  render(lut) {
    throw new Error('render should be implemented');
  }

  /**
   * Creates a pixel data object based on the pixel parameters.
   * @method
   * @static
   * @param {Pixel} pixel - Pixel object.
   * @param {number} [frame] - Frame index.
   * @returns {PixelPipeline} Pixel data object.
   */
  static create(pixel, frame) {
    const photometricInterpretation = pixel.getPhotometricInterpretation();
    if (
      photometricInterpretation === PhotometricInterpretation.Monochrome1 ||
      photometricInterpretation === PhotometricInterpretation.Monochrome2 ||
      photometricInterpretation === PhotometricInterpretation.PaletteColor
    ) {
      if (pixel.getBitsStored() <= 8) {
        return new GrayscalePixelPipeline(
          pixel.getWidth(),
          pixel.getHeight(),
          pixel.getFrameDataU8(frame)
        );
      } else if (pixel.getBitsStored() <= 16) {
        return new GrayscalePixelPipeline(
          pixel.getWidth(),
          pixel.getHeight(),
          pixel.isSigned() ? pixel.getFrameDataS16(frame) : pixel.getFrameDataU16(frame)
        );
      } else
        throw new Error(`Unsupported pixel data value for bits stored: ${pixel.getBitsStored()}`);
    } else if (
      photometricInterpretation == PhotometricInterpretation.Rgb ||
      photometricInterpretation == PhotometricInterpretation.YbrFull ||
      photometricInterpretation == PhotometricInterpretation.YbrFull422 ||
      photometricInterpretation == PhotometricInterpretation.YbrPartial422
    ) {
      let pixels = pixel.getFrameDataU8(frame);
      if (pixel.getPlanarConfiguration() === PlanarConfiguration.Planar) {
        pixels = PixelConverter.planarToInterleaved24(pixels);
      }
      if (photometricInterpretation === PhotometricInterpretation.YbrFull) {
        pixels = PixelConverter.ybrFullToRgb(pixels);
      } else if (photometricInterpretation == PhotometricInterpretation.YbrFull422) {
        pixels = PixelConverter.ybrFull422ToRgb(pixels, pixel.getWidth());
      } else if (photometricInterpretation == PhotometricInterpretation.YbrPartial422) {
        pixels = PixelConverter.ybrPartial422ToRgb(pixels, pixel.getWidth());
      }
      return new ColorPixelPipeline(pixel.getWidth(), pixel.getHeight(), pixels);
    } else {
      throw new Error(
        `Unsupported pixel data photometric interpretation: ${photometricInterpretation}`
      );
    }
  }
}
//#endregion

//#region GrayscalePixelPipeline
class GrayscalePixelPipeline extends PixelPipeline {
  /**
   * Creates an instance of GrayscalePixelPipeline.
   * @constructor
   * @param {number} width - Image width.
   * @param {number} height - Image height.
   * @param {Uint8Array|Uint16Array|Int16Array} data - Pixel data.
   */
  constructor(width, height, data) {
    super();
    this.width = width;
    this.height = height;
    this.data = data;
  }

  /**
   * Gets the image width.
   * @method
   * @returns {number} Width.
   */
  getWidth() {
    return this.width;
  }

  /**
   * Gets the image height.
   * @method
   * @returns {number} Height.
   */
  getHeight() {
    return this.height;
  }

  /**
   * Gets the image components.
   * @method
   * @returns {number} Components.
   */
  getComponents() {
    return 1;
  }

  /**
   * Renders the image.
   * @method
   * @param {Lut} [lut] - Lookup table.
   * @returns {Int32Array} Rendered pixels.
   */
  render(lut) {
    const output = new Int32Array(this.getWidth() * this.getHeight());
    if (lut === undefined) {
      for (let y = 0; y < this.getHeight(); ++y) {
        for (let i = this.getWidth() * y, e = i + this.getWidth(); i < e; i++) {
          output[i] = this.data[i];
        }
      }
    } else {
      for (let y = 0; y < this.getHeight(); ++y) {
        for (let i = this.getWidth() * y, e = i + this.getWidth(); i < e; i++) {
          output[i] = lut.getValue(this.data[i]);
        }
      }
    }

    return output;
  }
}
//#endregion

//#region SingleBitPixelPipeline
class SingleBitPixelPipeline extends GrayscalePixelPipeline {
  /**
   * Creates an instance of SingleBitPixelPipeline.
   * @constructor
   * @param {number} width - Image width.
   * @param {number} height - Image height.
   * @param {Uint8Array} data - Pixel data.
   */
  constructor(width, height, data) {
    super(width, height, SingleBitPixelPipeline._expandBits(width, height, data));
  }

  /**
   * Expands image bits to bytes.
   * @method
   * @static
   * @private
   * @param {number} width - Image width.
   * @param {number} height - Image height.
   * @param {Uint8Array} data - Pixel data.
   * @returns {Uint8Array} Expanded pixels.
   */
  static _expandBits(width, height, data) {
    const output = new Uint8Array(width * height);
    for (let i = 0, l = width * height; i < l; i++) {
      const byteIndex = Math.floor(i / 8);
      const bitIndex = i - 8 * byteIndex;
      const byteValue = data[byteIndex];
      if (byteValue < 0 || byteValue > 255) {
        throw new Error('Array item must be in range: 0-255');
      }
      const bitValue = (byteValue >>> bitIndex) & 0x01;
      output[i] = bitValue ? 1 : 0;
    }

    return output;
  }
}

//#region ColorPixelPipeline
class ColorPixelPipeline extends PixelPipeline {
  /**
   * Creates an instance of ColorPixelPipeline.
   * @constructor
   * @param {number} width - Image width.
   * @param {number} height - Image height.
   * @param {Uint8Array} data - Pixel data.
   */
  constructor(width, height, data) {
    super();
    this.width = width;
    this.height = height;
    this.data = data;
  }

  /**
   * Gets the image width.
   * @method
   * @returns {number} Width.
   */
  getWidth() {
    return this.width;
  }

  /**
   * Gets the image height.
   * @method
   * @returns {number} Height.
   */
  getHeight() {
    return this.height;
  }

  /**
   * Gets the image components.
   * @method
   * @returns {number} Components.
   */
  getComponents() {
    return 3;
  }

  /**
   * Renders the image.
   * @method
   * @param {Lut} [lut] - Lookup table.
   * @returns {Int32Array} Rendered pixels.
   */
  render(lut) {
    const output = new Int32Array(this.getWidth() * this.getHeight());
    if (lut === undefined) {
      for (let y = 0; y < this.getHeight(); ++y) {
        for (let i = this.getWidth() * y, e = i + this.getWidth(), p = i * 3; i < e; i++) {
          output[i] = (this.data[p++] << 0x10) | (this.data[p++] << 0x08) | this.data[p++];
        }
      }
    } else {
      for (let y = 0; y < this.getHeight(); ++y) {
        for (let i = this.getWidth() * y, e = i + this.getWidth(), p = i * 3; i < e; i++) {
          output[i] =
            lut.getValue(this.data[p++] << 0x10) |
            lut.getValue(this.data[p++] << 0x08) |
            lut.getValue(this.data[p++]);
        }
      }
    }

    return output;
  }
}
//#endregion

//#region PixelConverter
class PixelConverter {
  /**
   * Converts 24 bits pixels from planar (RRR...GGG...BBB...) to interleaved (RGB).
   * @method
   * @param {Uint8Array} data - Pixels data in planar format (RRR...GGG...BBB...).
   * @returns {Uint8Array} Pixels data in interleaved format (RGB).
   */
  static planarToInterleaved24(data) {
    const output = new Uint8Array(data.length);
    const pixelCount = data.length / 3;
    for (let n = 0; n < data.length / 3; n++) {
      output[n * 3] = data[n];
      output[n * 3 + 1] = data[n + pixelCount * 1];
      output[n * 3 + 2] = data[n + pixelCount * 2];
    }

    return output;
  }

  /**
   * Converts YBR_FULL photometric interpretation pixels to RGB.
   * @method
   * @param {Uint8Array} data - Array of YBR_FULL photometric interpretation pixels.
   * @returns {Uint8Array} Array of pixel data in RGB photometric interpretation.
   */
  static ybrFullToRgb(data) {
    const output = new Uint8Array(data.length);
    for (let n = 0; n < data.length; n += 3) {
      const y = data[n];
      const b = data[n + 1];
      const r = data[n + 2];

      output[n] = Math.min(Math.max(y + 1.402 * (r - 128) + 0.5, 0), 255);
      output[n + 1] = Math.min(Math.max(y - 0.3441 * (b - 128) - 0.7141 * (r - 128) + 0.5, 0), 255);
      output[n + 2] = Math.min(Math.max(y + 1.772 * (b - 128) + 0.5, 0), 255);
    }

    return output;
  }

  /**
   * Converts YBR_FULL_422 photometric interpretation pixels to RGB.
   * @method
   * @param {Uint8Array} data - Array of YBR_FULL_422 photometric interpretation pixels.
   * @param {number} width - Image width.
   * @returns {Uint8Array} Array of pixel data in RGB photometric interpretation.
   */
  /* c8 ignore start */
  static ybrFull422ToRgb(data, width) {
    const output = new Uint8Array((data.length / 4) * 2 * 3);
    for (let n = 0, p = 0, col = 0; n < data.length; ) {
      const y1 = data[n++];
      const y2 = data[n++];
      const cb = data[n++];
      const cr = data[n++];

      output[p++] = Math.min(Math.max(y1 + 1.402 * (cr - 128) + 0.5, 0), 255);
      output[p++] = Math.min(
        Math.max(y1 - 0.3441 * (cb - 128) - 0.7141 * (cr - 128) + 0.5, 0),
        255
      );
      output[p++] = Math.min(Math.max(y1 + 1.772 * (cb - 128) + 0.5, 0), 255);

      if (++col == width) {
        col = 0;
        continue;
      }

      output[p++] = Math.min(Math.max(y2 + 1.402 * (cr - 128) + 0.5, 0), 255);
      output[p++] = Math.min(
        Math.max(y2 - 0.3441 * (cb - 128) - 0.7141 * (cr - 128) + 0.5, 0),
        255
      );
      output[p++] = Math.min(Math.max(y2 + 1.772 * (cb - 128) + 0.5, 0), 255);

      if (++col == width) {
        col = 0;
      }
    }

    return output;
  }
  /* c8 ignore stop */

  /**
   * Converts YBR_PARTIAL_422 photometric interpretation pixels to RGB.
   * @method
   * @param {Uint8Array} data - Array of YBR_PARTIAL_422 photometric interpretation pixels.
   * @param {number} width - Image width.
   * @returns {Uint8Array} Array of pixel data in RGB photometric interpretation.
   */
  /* c8 ignore start */
  static ybrPartial422ToRgb(data, width) {
    const output = new Uint8Array((data.length / 4) * 2 * 3);
    for (let n = 0, p = 0, col = 0; n < data.length; ) {
      const y1 = data[n++];
      const y2 = data[n++];
      const cb = data[n++];
      const cr = data[n++];

      output[p++] = Math.min(Math.max(1.1644 * (y1 - 16) + 1.596 * (cr - 128) + 0.5, 0), 255);
      output[p++] = Math.min(
        Math.max(1.1644 * (y1 - 16) - 0.3917 * (cb - 128) - 0.813 * (cr - 128) + 0.5, 0),
        255
      );
      output[p++] = Math.min(Math.max(1.1644 * (y1 - 16) + 2.0173 * (cb - 128) + 0.5, 0), 255);

      if (++col == width) {
        col = 0;
        continue;
      }

      output[p++] = Math.min(Math.max(1.1644 * (y2 - 16) + 1.596 * (cr - 128) + 0.5, 0), 255);
      output[p++] = Math.min(
        Math.max(1.1644 * (y2 - 16) - 0.3917 * (cb - 128) - 0.813 * (cr - 128) + 0.5, 0),
        255
      );
      output[p++] = Math.min(Math.max(1.1644 * (y2 - 16) + 2.0173 * (cb - 128) + 0.5, 0), 255);

      if (++col == width) {
        col = 0;
      }
    }

    return output;
  }
  /* c8 ignore stop */
}
//#endregion

//#region PixelDecoder
class PixelDecoder {
  /**
   * Decodes an RLE frame.
   * @method
   *  @param {Pixel} pixel - Pixel object.
   * @param {Uint8Array} data - Encoded pixels data.
   * @returns {Uint8Array} Decoded pixels data.
   */
  /* c8 ignore start */
  static decodeRle(pixel, data) {
    let frameSize = pixel.getUncompressedFrameSize();
    if ((frameSize & 1) == 1) {
      ++frameSize;
    }
    const frameData = new Uint8Array(frameSize);
    const pixelCount = pixel.getWidth() * pixel.getHeight();
    const numberOfSegments = pixel.getBytesAllocated() * pixel.getSamplesPerPixel();
    const decoder = new RleDecoder(data);
    if (decoder.getNumberOfSegments() != numberOfSegments) {
      throw new Error('Unexpected number of RLE segments');
    }
    for (let s = 0; s < numberOfSegments; s++) {
      let pos, offset;
      const sample = Math.trunc(s / pixel.getBytesAllocated());
      const sabyte = Math.trunc(s % pixel.getBytesAllocated());
      if (pixel.getPlanarConfiguration() === PlanarConfiguration.Interleaved) {
        pos = sample * pixel.getBytesAllocated();
        offset = pixel.getSamplesPerPixel() * pixel.getBytesAllocated();
      } else {
        pos = sample * pixel.getBytesAllocated() * pixelCount;
        offset = pixel.getBytesAllocated();
      }
      pos += pixel.getBytesAllocated() - sabyte - 1;
      decoder.decodeSegment(s, frameData, pos, offset);
    }

    return frameData;
  }
  /* c8 ignore stop */
}
//#endregion

//#region Exports
module.exports = {
  Pixel,
  PixelPipeline,
  GrayscalePixelPipeline,
  SingleBitPixelPipeline,
  ColorPixelPipeline,
  PixelConverter,
  PixelDecoder,
};
//#endregion
