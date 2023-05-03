const {
  PhotometricInterpretation,
  PixelRepresentation,
  PlanarConfiguration,
  TransferSyntax,
} = require('./Constants');
const Histogram = require('./Histogram');
const NativePixelDecoder = require('./NativePixelDecoder');

//#region Pixel
class Pixel {
  /**
   * Creates an instance of Pixel.
   * @constructor
   * @param {Object} elements - DICOM image elements.
   * @param {string} transferSyntaxUid - Transfer Syntax UID.
   */
  constructor(elements, transferSyntaxUid) {
    this.transferSyntaxUid = transferSyntaxUid;
    this.frames = this._getElement(elements, 'NumberOfFrames') || 1;
    this.width = this._getElement(elements, 'Columns');
    this.height = this._getElement(elements, 'Rows');
    this.bitsAllocated = this._getElement(elements, 'BitsAllocated') || 0;
    this.bitsStored = this._getElement(elements, 'BitsStored') || this.bitsAllocated;
    this.highBit = this._getElement(elements, 'HighBit') || this.bitsStored - 1;
    this.samplesPerPixel = this._getElement(elements, 'SamplesPerPixel') || 1;
    this.pixelRepresentation =
      this._getElement(elements, 'PixelRepresentation') || PixelRepresentation.Unsigned;
    this.planarConfiguration =
      this._getElement(elements, 'PlanarConfiguration') || PlanarConfiguration.Interleaved;
    const photometricInterpretation = this._getElement(elements, 'PhotometricInterpretation');
    this.photometricInterpretation = photometricInterpretation
      ? photometricInterpretation.replace(/[^ -~]+/g, '').trim()
      : '';
    this.rescaleSlope = this._getElement(elements, 'RescaleSlope') || 1.0;
    this.rescaleIntercept = this._getElement(elements, 'RescaleIntercept') || 0.0;
    this.voiLutFunction = this._getElement(elements, 'VOILUTFunction') || 'LINEAR';
    this.smallestImagePixelValue = this._getElement(elements, 'SmallestImagePixelValue');
    this.largestImagePixelValue = this._getElement(elements, 'LargestImagePixelValue');
    this.pixelPaddingValue = this._getElement(elements, 'PixelPaddingValue');
    this.floatPixelPaddingValue = this._getElement(elements, 'FloatPixelPaddingValue');
    this.redPaletteColorLookupTableDescriptor = this._getElement(
      elements,
      'RedPaletteColorLookupTableDescriptor'
    );
    this.redPaletteColorLookupTableData = this._getElement(
      elements,
      'RedPaletteColorLookupTableData'
    );
    this.greenPaletteColorLookupTableData = this._getElement(
      elements,
      'GreenPaletteColorLookupTableData'
    );
    this.bluePaletteColorLookupTableData = this._getElement(
      elements,
      'BluePaletteColorLookupTableData'
    );
    this.pixelData = this._getElement(elements, 'PixelData');
    this.floatPixelData = this._getElement(elements, 'FloatPixelData');
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
    return this.isSigned() ? -Math.pow(2, this.getBitsStored() - 1) : 0;
  }

  /**
   * Gets the maximum pixel value.
   * @method
   * @returns {number} Maximum pixel value.
   */
  getMaximumPixelValue() {
    return this.isSigned()
      ? Math.pow(2, this.getBitsStored() - 1) - 1
      : Math.pow(2, this.getBitsStored()) - 1;
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
      return Math.trunc((this.getWidth() * this.getHeight() - 1) / 8 + 1);
    }
    if (this.getPhotometricInterpretation() === PhotometricInterpretation.YbrFull422) {
      const syntax = this.getTransferSyntaxUid();
      if (
        syntax === TransferSyntax.ImplicitVRLittleEndian ||
        syntax === TransferSyntax.ExplicitVRLittleEndian ||
        syntax === TransferSyntax.DeflatedExplicitVRLittleEndian ||
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
   * Gets the VOI LUT function.
   * @method
   * @returns {string} VOI LUT function.
   */
  getVoiLutFunction() {
    return this.voiLutFunction;
  }

  /**
   * Gets the smallest image pixel value.
   * @method
   * @returns {number} Smallest image pixel value.
   */
  getSmallestImagePixelValue() {
    return this.smallestImagePixelValue;
  }

  /**
   * Gets the largest image pixel value.
   * @method
   * @returns {number} Largest image pixel value.
   */
  getLargestImagePixelValue() {
    return this.largestImagePixelValue;
  }

  /**
   * Gets the pixel padding value.
   * @method
   * @returns {number} Pixel padding value.
   */
  getPixelPaddingValue() {
    return this.pixelPaddingValue || this.floatPixelPaddingValue;
  }

  /**
   * Gets the red palette color lookup table descriptor.
   * @method
   * @returns {Array<number>} Red palette color lookup table descriptor.
   */
  getRedPaletteColorLookupTableDescriptor() {
    return this.redPaletteColorLookupTableDescriptor;
  }

  /**
   * Gets the red palette color lookup table data.
   * @method
   * @returns {Array<ArrayBuffer>} Red palette color lookup table data.
   */
  getRedPaletteColorLookupTableData() {
    return this.redPaletteColorLookupTableData;
  }

  /**
   * Gets the green palette color lookup table data.
   * @method
   * @returns {Array<ArrayBuffer>} Green palette color lookup table data.
   */
  getGreenPaletteColorLookupTableData() {
    return this.greenPaletteColorLookupTableData;
  }

  /**
   * Gets the blue palette color lookup table data.
   * @method
   * @returns {Array<ArrayBuffer>} Blue palette color lookup table data.
   */
  getBluePaletteColorLookupTableData() {
    return this.bluePaletteColorLookupTableData;
  }

  /**
   * Gets the pixel data.
   * @method
   * @returns {Array<ArrayBuffer>} Pixel data.
   */
  getPixelData() {
    return this.pixelData || this.floatPixelData;
  }

  /**
   * Checks whether the float pixel data exist.
   * @method
   * @returns {boolean} Whether the float pixel data exist.
   */
  hasFloatPixelData() {
    return this.floatPixelData !== undefined;
  }

  /**
   * Gets the pixel data as an array of unsigned byte values.
   * @method
   * @param {number} frame - Frame index.
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
    const u16 = this.getFrameDataU16(frame);
    const s16 = new Int16Array(u16);

    if (this.getBitsStored() !== 16) {
      const shiftLeft = this.getBitsAllocated() - this.getHighBit() - 1;
      const shiftRight = this.getBitsAllocated() - this.getBitsStored();
      for (let i = 0; i < s16.length; i++) {
        s16[i] <<= shiftLeft;
        s16[i] >>= shiftRight;
      }
    }

    return s16;
  }

  /**
   * Gets the pixel data as an array of unsigned integer values.
   * @method
   * @param {number} frame - Frame index.
   * @returns {Uint32Array} Pixel data as an array of unsigned integer values.
   */
  getFrameDataU32(frame) {
    const frameBuffer = this._getFrameBuffer(frame);

    return new Uint32Array(
      frameBuffer.buffer,
      frameBuffer.byteOffset,
      frameBuffer.byteLength / Uint32Array.BYTES_PER_ELEMENT
    );
  }

  /**
   * Gets the pixel data as an array of signed integer values.
   * @method
   * @param {number} frame - Frame index.
   * @returns {Int32Array} Pixel data as an array of signed integer values.
   */
  getFrameDataS32(frame) {
    const u32 = this.getFrameDataU32(frame);
    const s32 = new Int32Array(u32);

    return s32;
  }

  /**
   * Gets the pixel data as an array of float values.
   * @method
   * @param {number} frame - Frame index.
   * @returns {Float32Array} Pixel data as an array of float values.
   */
  getFrameDataF32(frame) {
    const frameBuffer = this._getFrameBuffer(frame);

    return new Float32Array(
      frameBuffer.buffer,
      frameBuffer.byteOffset,
      frameBuffer.byteLength / Float32Array.BYTES_PER_ELEMENT
    );
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
   * @throws Error if requested frame is out of range, pixel data could not be extracted,
   * width/height/bits allocated/stored/photometric interpretation has an invalid value or
   * transfer syntax cannot be currently decoded.
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
      this.getTransferSyntaxUid() === TransferSyntax.DeflatedExplicitVRLittleEndian ||
      this.getTransferSyntaxUid() === TransferSyntax.ExplicitVRBigEndian
    ) {
      const frameSize = this.getUncompressedFrameSize();
      const frameOffset = frameSize * frame;

      // Take the first buffer from pixel buffers and extract the current frame data
      let pixelBuffer = new Uint8Array(
        Array.isArray(pixelBuffers) ? pixelBuffers.find((o) => o) : pixelBuffers
      );
      const framePixelBuffer = pixelBuffer.slice(frameOffset, frameOffset + frameSize);

      // Swap endianness, if necessary
      if (this.getTransferSyntaxUid() === TransferSyntax.ExplicitVRBigEndian) {
        if (this.getBitsAllocated() > 8 && this.getBitsAllocated() <= 16) {
          for (let i = 0; i < framePixelBuffer.length; i += 2) {
            const holder = framePixelBuffer[i];
            framePixelBuffer[i] = framePixelBuffer[i + 1];
            framePixelBuffer[i + 1] = holder;
          }
        } else if (this.getBitsAllocated() === 32) {
          if (this.hasFloatPixelData()) {
            for (let i = 0; i < framePixelBuffer.length; i += 4) {
              let holder = framePixelBuffer[i];
              framePixelBuffer[i] = framePixelBuffer[i + 3];
              framePixelBuffer[i + 3] = holder;
              holder = framePixelBuffer[i + 1];
              framePixelBuffer[i + 1] = framePixelBuffer[i + 2];
              framePixelBuffer[i + 2] = holder;
            }
          } else {
            for (let i = 0; i < framePixelBuffer.length; i += 4) {
              let holder = framePixelBuffer[i];
              framePixelBuffer[i] = framePixelBuffer[i + 1];
              framePixelBuffer[i + 1] = holder;
              holder = framePixelBuffer[i + 2];
              framePixelBuffer[i + 2] = framePixelBuffer[i + 3];
              framePixelBuffer[i + 3] = holder;
            }
          }
        }
      }

      return framePixelBuffer;
    } else {
      const frameFragmentsData = this._getFrameFragments(pixelBuffers, frame);
      if (this.getTransferSyntaxUid() === TransferSyntax.RleLossless) {
        return NativePixelDecoder.decodeRle(this, frameFragmentsData);
      } else if (
        this.getTransferSyntaxUid() === TransferSyntax.JpegBaselineProcess1 ||
        this.getTransferSyntaxUid() === TransferSyntax.JpegBaselineProcess2_4
      ) {
        return NativePixelDecoder.decodeJpeg(this, frameFragmentsData, {
          convertColorspaceToRgb: true,
        });
      } else if (
        this.getTransferSyntaxUid() === TransferSyntax.JpegLosslessProcess14 ||
        this.getTransferSyntaxUid() === TransferSyntax.JpegLosslessProcess14V1
      ) {
        return NativePixelDecoder.decodeJpeg(this, frameFragmentsData);
      } else if (
        this.getTransferSyntaxUid() === TransferSyntax.JpegLsLossless ||
        this.getTransferSyntaxUid() === TransferSyntax.JpegLsLossy
      ) {
        return NativePixelDecoder.decodeJpegLs(this, frameFragmentsData);
      } else if (
        this.getTransferSyntaxUid() === TransferSyntax.Jpeg2000Lossless ||
        this.getTransferSyntaxUid() === TransferSyntax.Jpeg2000Lossy
      ) {
        return NativePixelDecoder.decodeJpeg2000(this, frameFragmentsData);
      }

      throw new Error(
        `Transfer syntax cannot be currently decoded [${this.getTransferSyntaxUid()}]`
      );
    }
  }

  /**
   * Gets the frame fragments data.
   * @method
   * @private
   * @param {number} pixelBuffers - Pixel data buffers.
   * @param {number} frame - Frame index.
   * @returns {Uint8Array} Frame data as an array of unsigned byte values.
   * @throws Error if there are no fragmented pixel data or requested frame
   * is larger or equal to the pixel fragments number.
   */
  _getFrameFragments(pixelBuffers, frame) {
    if (pixelBuffers.length === 0) {
      throw new Error('No fragmented pixel data');
    }
    if (frame >= pixelBuffers.length) {
      throw new Error(
        `Requested frame is larger or equal to the pixel fragments number [frame: (${frame}), fragments: ${pixelBuffers.length}]`
      );
    }
    if (this.getNumberOfFrames() === 1) {
      return new Uint8Array(
        pixelBuffers.reduce((result, current, i) => {
          if (i === 0) {
            return result;
          }
          const tmp = new Uint8Array(result.byteLength + current.byteLength);
          tmp.set(new Uint8Array(result), 0);
          tmp.set(new Uint8Array(current), result.byteLength);

          return tmp.buffer;
        })
      );
    }
    if (pixelBuffers.length === this.getNumberOfFrames()) {
      return new Uint8Array(pixelBuffers[frame]);
    }

    throw new Error('Multiple fragments per frame is not yet implemented');
  }

  /**
   * Gets element value.
   * @method
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

//#region PixelPipeline
class PixelPipeline {
  /**
   * Gets the image width.
   * @method
   * @returns {number} Width.
   * @throws Error if getWidth is not implemented.
   */
  getWidth() {
    throw new Error('getWidth should be implemented');
  }

  /**
   * Gets the image height.
   * @method
   * @returns {number} Height.
   * @throws Error if getWidth is not implemented.
   */
  getHeight() {
    throw new Error('getHeight should be implemented');
  }

  /**
   * Gets the minimum pixel value.
   * @method
   * @returns {number} Minimum pixel value.
   * @throws Error if getMinimumPixelValue is not implemented.
   */
  getMinimumPixelValue() {
    throw new Error('getMinimumPixelValue should be implemented');
  }

  /**
   * Gets the maximum pixel value.
   * @method
   * @returns {number} Maximum pixel value.
   * @throws Error if getMaximumPixelValue is not implemented.
   */
  getMaximumPixelValue() {
    throw new Error('getMaximumPixelValue should be implemented');
  }

  /**
   * Gets the image components.
   * @method
   * @returns {number} Components.
   * @throws Error if getComponents is not implemented.
   */
  getComponents() {
    throw new Error('getComponents should be implemented');
  }

  /**
   * Renders the image.
   * @method
   * @param {Lut} [lut] - Lookup table.
   * @returns {Int32Array} Rendered pixels.
   * @throws Error if render is not implemented.
   */
  // eslint-disable-next-line no-unused-vars
  render(lut) {
    throw new Error('render should be implemented');
  }

  /**
   * Calculates histograms.
   * @method
   * @returns {Array<Histogram>} Calculated histograms.
   * @throws Error if calculateHistograms is not implemented.
   */
  calculateHistograms() {
    throw new Error('calculateHistograms should be implemented');
  }

  /**
   * Creates a pixel data object based on the pixel parameters.
   * @method
   * @static
   * @param {Pixel} pixel - Pixel object.
   * @param {number} frame - Frame index.
   * @returns {PixelPipeline} Pixel pipeline object.
   * @throws Error if bits stored or photometric interpretation
   * pixel data value is not supported.
   */
  static create(pixel, frame) {
    this._applyPipelineFixes(pixel);
    let photometricInterpretation = pixel.getPhotometricInterpretation();
    if (
      photometricInterpretation === PhotometricInterpretation.Monochrome1 ||
      photometricInterpretation === PhotometricInterpretation.Monochrome2 ||
      photometricInterpretation === PhotometricInterpretation.PaletteColor
    ) {
      if (pixel.getBitsStored() === 1) {
        return new SingleBitPixelPipeline(
          pixel.getWidth(),
          pixel.getHeight(),
          pixel.getFrameDataU8(frame)
        );
      } else if (
        pixel.getBitsAllocated() === 8 &&
        pixel.getHighBit() === 7 &&
        pixel.getBitsStored() === 8
      ) {
        return new GrayscalePixelPipeline(
          pixel.getWidth(),
          pixel.getHeight(),
          pixel.getMinimumPixelValue(),
          pixel.getMaximumPixelValue(),
          pixel.getFrameDataU8(frame)
        );
      } else if (pixel.getBitsAllocated() <= 16) {
        return new GrayscalePixelPipeline(
          pixel.getWidth(),
          pixel.getHeight(),
          pixel.getMinimumPixelValue(),
          pixel.getMaximumPixelValue(),
          pixel.isSigned() ? pixel.getFrameDataS16(frame) : pixel.getFrameDataU16(frame)
        );
      } else if (pixel.getBitsAllocated() <= 32) {
        return new GrayscalePixelPipeline(
          pixel.getWidth(),
          pixel.getHeight(),
          pixel.getMinimumPixelValue(),
          pixel.getMaximumPixelValue(),
          pixel.hasFloatPixelData()
            ? pixel.getFrameDataF32(frame)
            : pixel.isSigned()
            ? pixel.getFrameDataS32(frame)
            : pixel.getFrameDataU32(frame)
        );
      } else {
        throw new Error(`Unsupported pixel data value for bits stored: ${pixel.getBitsStored()}`);
      }
    } else if (
      photometricInterpretation == PhotometricInterpretation.Rgb ||
      photometricInterpretation == PhotometricInterpretation.YbrFull ||
      photometricInterpretation == PhotometricInterpretation.YbrFull422 ||
      photometricInterpretation == PhotometricInterpretation.YbrPartial422 ||
      photometricInterpretation == PhotometricInterpretation.Cmyk ||
      photometricInterpretation == PhotometricInterpretation.Argb ||
      photometricInterpretation == PhotometricInterpretation.Hsv
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
      } else if (photometricInterpretation == PhotometricInterpretation.Cmyk) {
        if (pixel.getSamplesPerPixel() !== 4) {
          throw new Error(
            `Unsupported samples per pixel value for CMYK: ${pixel.getSamplesPerPixel()}`
          );
        }
        pixels = PixelConverter.cmykToRgb(pixels, pixel.getWidth(), pixel.getHeight());
      } else if (photometricInterpretation == PhotometricInterpretation.Argb) {
        if (pixel.getSamplesPerPixel() !== 4) {
          throw new Error(
            `Unsupported samples per pixel value for ARGB: ${pixel.getSamplesPerPixel()}`
          );
        }
        pixels = PixelConverter.argbToRgb(pixels, pixel.getWidth(), pixel.getHeight());
      } else if (photometricInterpretation == PhotometricInterpretation.Hsv) {
        pixels = PixelConverter.hsvToRgb(pixels);
      }

      return new ColorPixelPipeline(
        pixel.getWidth(),
        pixel.getHeight(),
        pixel.getMinimumPixelValue(),
        pixel.getMaximumPixelValue(),
        pixels
      );
    } else {
      throw new Error(
        `Unsupported pixel data photometric interpretation: ${photometricInterpretation}`
      );
    }
  }

  //#region Private Methods
  /**
   * Applies common pipeline fixes.
   * @method
   * @static
   * @private
   * @param {Pixel} pixel - Pixel object.
   */
  static _applyPipelineFixes(pixel) {
    // For color JPEG baseline datasets, colorspace is converted to RGB and
    // planar configuration is set to interleaved in WebAssembly
    if (
      (pixel.getTransferSyntaxUid() === TransferSyntax.JpegBaselineProcess1 ||
        pixel.getTransferSyntaxUid() === TransferSyntax.JpegBaselineProcess2_4) &&
      pixel.getSamplesPerPixel() === 3
    ) {
      pixel.photometricInterpretation = PhotometricInterpretation.Rgb;
      pixel.planarConfiguration = PlanarConfiguration.Interleaved;
    }

    // For color JPEG 2000 datasets, colorspace is converted to RGB in WebAssembly
    if (
      (pixel.getTransferSyntaxUid() === TransferSyntax.Jpeg2000Lossless ||
        pixel.getTransferSyntaxUid() === TransferSyntax.Jpeg2000Lossy) &&
      (pixel.getPhotometricInterpretation() === PhotometricInterpretation.YbrRct ||
        pixel.getPhotometricInterpretation() === PhotometricInterpretation.YbrIct)
    ) {
      pixel.photometricInterpretation = PhotometricInterpretation.Rgb;
    }
  }
  //#endregion
}
//#endregion

//#region GrayscalePixelPipeline
class GrayscalePixelPipeline extends PixelPipeline {
  /**
   * Creates an instance of GrayscalePixelPipeline.
   * @constructor
   * @param {number} width - Image width.
   * @param {number} height - Image height.
   * @param {number} minimumPixelValue - Minimum pixel value.
   * @param {number} maximumPixelValue - Maximum pixel value.
   * @param {Uint8Array|Uint16Array|Int16Array} data - Pixel data.
   */
  constructor(width, height, minimumPixelValue, maximumPixelValue, data) {
    super();
    this.width = width;
    this.height = height;
    this.minValue = minimumPixelValue;
    this.maxValue = maximumPixelValue;
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
   * Gets the minimum pixel value.
   * @method
   * @returns {number} Minimum pixel value.
   */
  getMinimumPixelValue() {
    return this.minValue;
  }

  /**
   * Gets the maximum pixel value.
   * @method
   * @returns {number} Maximum pixel value.
   */
  getMaximumPixelValue() {
    return this.maxValue;
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
    if (!lut) {
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

  /**
   * Calculates histograms.
   * @method
   * @returns {Array<Histogram>} Calculated histograms.
   */
  calculateHistograms() {
    const histogram = new Histogram('gray', this.minValue, this.maxValue);
    for (let i = 0; i < this.data.length; i++) {
      histogram.add(this.data[i]);
    }

    return [histogram];
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
    super(width, height, 0, 1, SingleBitPixelPipeline._expandBits(width, height, data));
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
   * @throws Error if an array item is not within the 0-255 range.
   */
  static _expandBits(width, height, data) {
    const output = new Uint8Array(width * height);
    for (let i = 0, l = width * height; i < l; i++) {
      const byteIndex = Math.floor(i / 8);
      const bitIndex = i - 8 * byteIndex;
      const byteValue = data[byteIndex];
      if (byteValue < 0 || byteValue > 255) {
        throw new Error('Array item must be in 0-255 range');
      }
      const bitValue = (byteValue >>> bitIndex) & 0x01;
      output[i] = bitValue ? 1 : 0;
    }

    return output;
  }

  /**
   * Calculates histograms.
   * @method
   * @returns {Array<Histogram>} Calculated histograms.
   */
  calculateHistograms() {
    const histogram = new Histogram('bit', this.minValue, this.maxValue);
    for (let i = 0; i < this.data.length; i++) {
      histogram.add(this.data[i]);
    }

    return [histogram];
  }
}
//#endregion

//#region ColorPixelPipeline
class ColorPixelPipeline extends PixelPipeline {
  /**
   * Creates an instance of ColorPixelPipeline.
   * @constructor
   * @param {number} width - Image width.
   * @param {number} height - Image height.
   * @param {number} minimumPixelValue - Minimum pixel value.
   * @param {number} maximumPixelValue - Maximum pixel value.
   * @param {Uint8Array} data - Pixel data.
   */
  constructor(width, height, minimumPixelValue, maximumPixelValue, data) {
    super();
    this.width = width;
    this.height = height;
    this.minValue = minimumPixelValue;
    this.maxValue = maximumPixelValue;
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
   * Gets the minimum pixel value.
   * @method
   * @returns {number} Minimum pixel value.
   */
  getMinimumPixelValue() {
    return this.minValue;
  }

  /**
   * Gets the maximum pixel value.
   * @method
   * @returns {number} Maximum pixel value.
   */
  getMaximumPixelValue() {
    return this.maxValue;
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
    if (!lut) {
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

  /**
   * Calculates histograms.
   * @method
   * @returns {Array<Histogram>} Calculated histograms.
   */
  calculateHistograms() {
    const redHistogram = new Histogram('red', this.minValue, this.maxValue);
    const greenHistogram = new Histogram('green', this.minValue, this.maxValue);
    const blueHistogram = new Histogram('blue', this.minValue, this.maxValue);

    for (let i = 0; i < this.data.length; i += 3) {
      redHistogram.add(this.data[i]);
      greenHistogram.add(this.data[i + 1]);
      blueHistogram.add(this.data[i + 2]);
    }

    return [redHistogram, greenHistogram, blueHistogram];
  }
}
//#endregion

//#region PixelConverter
class PixelConverter {
  /**
   * Converts 24 bits pixels from planar (RRR...GGG...BBB...) to interleaved (RGB).
   * @method
   * @static
   * @param {Uint8Array} data - Pixels data in planar format (RRR...GGG...BBB...).
   * @returns {Uint8Array} Pixels data in interleaved format (RGB).
   */
  static planarToInterleaved24(data) {
    const output = new Uint8Array(data.length);
    const pixelCount = Math.trunc(data.length / 3);
    for (let n = 0; n < pixelCount; n++) {
      output[n * 3] = data[n];
      output[n * 3 + 1] = data[n + pixelCount * 1];
      output[n * 3 + 2] = data[n + pixelCount * 2];
    }

    return output;
  }

  /**
   * Converts YBR_FULL photometric interpretation pixels to RGB.
   * @method
   * @static
   * @param {Uint8Array} data - Array of YBR_FULL photometric interpretation pixels.
   * @returns {Uint8Array} Array of pixel data in RGB photometric interpretation.
   */
  static ybrFullToRgb(data) {
    const output = new Uint8Array(data.length);
    for (let n = 0; n < data.length; n += 3) {
      const y = data[n];
      const b = data[n + 1];
      const r = data[n + 2];

      output[n] = this._truncAndClamp(y + 1.402 * (r - 128) + 0.5, 0x00, 0xff);
      output[n + 1] = this._truncAndClamp(
        y - 0.3441 * (b - 128) - 0.7141 * (r - 128) + 0.5,
        0x00,
        0xff
      );
      output[n + 2] = this._truncAndClamp(y + 1.772 * (b - 128) + 0.5, 0x00, 0xff);
    }

    return output;
  }

  /**
   * Converts YBR_FULL_422 photometric interpretation pixels to RGB.
   * @method
   * @static
   * @param {Uint8Array} data - Array of YBR_FULL_422 photometric interpretation pixels.
   * @param {number} width - Image width.
   * @returns {Uint8Array} Array of pixel data in RGB photometric interpretation.
   */
  static ybrFull422ToRgb(data, width) {
    const output = new Uint8Array(Math.trunc((data.length / 4) * 2 * 3));
    for (let n = 0, p = 0, col = 0; n < data.length; ) {
      const y1 = data[n++];
      const y2 = data[n++];
      const cb = data[n++];
      const cr = data[n++];

      output[p++] = this._truncAndClamp(y1 + 1.402 * (cr - 128) + 0.5, 0x00, 0xff);
      output[p++] = this._truncAndClamp(
        y1 - 0.3441 * (cb - 128) - 0.7141 * (cr - 128) + 0.5,
        0x00,
        0xff
      );
      output[p++] = this._truncAndClamp(y1 + 1.772 * (cb - 128) + 0.5, 0x00, 0xff);

      if (++col === width) {
        col = 0;
        continue;
      }

      output[p++] = this._truncAndClamp(y2 + 1.402 * (cr - 128) + 0.5, 0x00, 0xff);
      output[p++] = this._truncAndClamp(
        y2 - 0.3441 * (cb - 128) - 0.7141 * (cr - 128) + 0.5,
        0x00,
        0xff
      );
      output[p++] = this._truncAndClamp(y2 + 1.772 * (cb - 128) + 0.5, 0x00, 0xff);

      if (++col === width) {
        col = 0;
      }
    }

    return output;
  }

  /**
   * Converts YBR_PARTIAL_422 photometric interpretation pixels to RGB.
   * @method
   * @static
   * @param {Uint8Array} data - Array of YBR_PARTIAL_422 photometric interpretation pixels.
   * @param {number} width - Image width.
   * @returns {Uint8Array} Array of pixel data in RGB photometric interpretation.
   */
  static ybrPartial422ToRgb(data, width) {
    const output = new Uint8Array(Math.trunc((data.length / 4) * 2 * 3));
    for (let n = 0, p = 0, col = 0; n < data.length; ) {
      const y1 = data[n++];
      const y2 = data[n++];
      const cb = data[n++];
      const cr = data[n++];

      output[p++] = this._truncAndClamp(1.1644 * (y1 - 16) + 1.596 * (cr - 128) + 0.5, 0x00, 0xff);
      output[p++] = this._truncAndClamp(
        1.1644 * (y1 - 16) - 0.3917 * (cb - 128) - 0.813 * (cr - 128) + 0.5,
        0x00,
        0xff
      );
      output[p++] = this._truncAndClamp(1.1644 * (y1 - 16) + 2.0173 * (cb - 128) + 0.5, 0x00, 0xff);

      if (++col === width) {
        col = 0;
        continue;
      }

      output[p++] = this._truncAndClamp(1.1644 * (y2 - 16) + 1.596 * (cr - 128) + 0.5, 0x00, 0xff);
      output[p++] = this._truncAndClamp(
        1.1644 * (y2 - 16) - 0.3917 * (cb - 128) - 0.813 * (cr - 128) + 0.5,
        0x00,
        0xff
      );
      output[p++] = this._truncAndClamp(1.1644 * (y2 - 16) + 2.0173 * (cb - 128) + 0.5, 0x00, 0xff);

      if (++col == width) {
        col = 0;
      }
    }

    return output;
  }

  /**
   * Converts CMYK photometric interpretation pixels to RGB.
   * @method
   * @static
   * @param {Uint8Array} data - Array of CMYK photometric interpretation pixels.
   * @param {number} width - Image width.
   * @param {number} height - Image height.
   * @returns {Uint8Array} Array of pixel data in RGB photometric interpretation.
   */
  static cmykToRgb(data, width, height) {
    const output = new Uint8Array(3 * width * height);
    for (let n = 0, p = 0; n < data.length; ) {
      let c = data[n++];
      let m = data[n++];
      let y = data[n++];
      const k = data[n++];

      c += k;
      m += k;
      y += k;

      output[p++] = this._truncAndClamp(0xff - c, 0x00, 0xff);
      output[p++] = this._truncAndClamp(0xff - m, 0x00, 0xff);
      output[p++] = this._truncAndClamp(0xff - y, 0x00, 0xff);
    }

    return output;
  }

  /**
   * Converts ARGB photometric interpretation pixels to RGB.
   * @method
   * @static
   * @param {Uint8Array} data - Array of ARGB photometric interpretation pixels.
   * @param {number} width - Image width.
   * @param {number} height - Image height.
   * @returns {Uint8Array} Array of pixel data in RGB photometric interpretation.
   */
  static argbToRgb(data, width, height) {
    const output = new Uint8Array(3 * width * height);
    for (let n = 0, p = 0; n < data.length; ) {
      n++;
      output[p++] = data[n++];
      output[p++] = data[n++];
      output[p++] = data[n++];
    }

    return output;
  }

  /**
   * Converts HSV photometric interpretation pixels to RGB.
   * @method
   * @static
   * @param {Uint8Array} data - Array of HSV photometric interpretation pixels.
   * @returns {Uint8Array} Array of pixel data in RGB photometric interpretation.
   */
  static hsvToRgb(data) {
    const output = new Uint8Array(data.length);
    for (let n = 0; n < data.length; n += 3) {
      const h = data[n];
      const s = data[n + 1];
      const v = data[n + 2];

      let r = v;
      let g = v;
      let b = v;
      if (s !== 0) {
        const region = Math.trunc(h / 43);
        const remainder = (h - region * 43) * 6;

        const p = (v * (0xff - s)) >> 8;
        const q = (v * (0xff - ((s * remainder) >> 8))) >> 8;
        const t = (v * (0xff - ((s * (0xff - remainder)) >> 8))) >> 8;

        if (region === 0) {
          r = v;
          g = t;
          b = p;
        } else if (region === 1) {
          r = q;
          g = v;
          b = p;
        } else if (region === 2) {
          r = p;
          g = v;
          b = t;
        } else if (region === 3) {
          r = p;
          g = q;
          b = v;
        } else if (region === 4) {
          r = t;
          g = p;
          b = v;
        } else {
          r = v;
          g = p;
          b = q;
        }
      }

      output[n] = this._truncAndClamp(r, 0x00, 0xff);
      output[n + 1] = this._truncAndClamp(g, 0x00, 0xff);
      output[n + 2] = this._truncAndClamp(b, 0x00, 0xff);
    }

    return output;
  }

  //#region Private Methods
  /**
   * Truncates and clamps value between min and max.
   * @method
   * @static
   * @private
   * @param {number} value - Original value.
   * @param {number} min - Minimum value.
   * @param {number} max - Maximum value.
   * @returns {number} Clamped value.
   */
  static _truncAndClamp(value, min, max) {
    return Math.min(Math.max(Math.trunc(value), min), max);
  }
  //#endregion
}
//#endregion

//#region Exports
module.exports = {
  ColorPixelPipeline,
  GrayscalePixelPipeline,
  Pixel,
  PixelConverter,
  PixelPipeline,
  SingleBitPixelPipeline,
};
//#endregion
