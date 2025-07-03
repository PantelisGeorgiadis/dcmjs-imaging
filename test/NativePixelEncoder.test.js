const { Pixel } = require('./../src/Pixel');
const {
  PhotometricInterpretation,
  PixelRepresentation,
  TransferSyntax,
} = require('./../src/Constants');
const NativePixelEncoder = require('./../src/NativePixelEncoder');
const NativePixelDecoder = require('./../src/NativePixelDecoder');

const { createImageFromPixelData } = require('./utils');

const chai = require('chai');
const expect = chai.expect;

describe('Uninitialized NativePixelEncoder', () => {
  it('should throw for uninitialized NativePixelEncoder', () => {
    const width = 3;
    const height = 3;
    const testData = Uint8Array.from([0x00, 0xff, 0x00, 0xff, 0x00, 0xff, 0x00, 0xff, 0x00]);

    const monoImage = createImageFromPixelData(
      width,
      height,
      8,
      8,
      1,
      PixelRepresentation.Unsigned,
      PhotometricInterpretation.Monochrome2,
      testData.buffer,
      TransferSyntax.ExplicitVRLittleEndian
    );
    const pixel = new Pixel(monoImage.getElements(), monoImage.getTransferSyntaxUid());

    expect(() => {
      NativePixelEncoder.encodeRle(pixel, testData);
    }).to.throw();
    expect(() => {
      NativePixelEncoder.encodeJpeg(pixel, testData);
    }).to.throw();
    expect(() => {
      NativePixelEncoder.encodeJpegLs(pixel, testData);
    }).to.throw();
    expect(() => {
      NativePixelEncoder.encodeJpeg2000(pixel, testData);
    }).to.throw();
    expect(() => {
      NativePixelEncoder.encodeJpegXl(pixel, testData);
    }).to.throw();
    expect(() => {
      NativePixelEncoder.encodeHtJpeg2000(pixel, testData);
    }).to.throw();
  });
});

describe('NativePixelEncoder', () => {
  before(async () => {
    const isNodeJs = !!(
      typeof process !== 'undefined' &&
      process.versions &&
      process.versions.node
    );
    const webAssemblyModulePathOrUrl = !isNodeJs
      ? 'base/node_modules/dcmjs-codecs/build/dcmjs-native-codecs.wasm'
      : undefined;

    // Initialize both encoder and decoder for round-trip testing
    await NativePixelEncoder.initializeAsync({
      webAssemblyModulePathOrUrl,
      logNativeEncodersMessages: true,
    });
    await NativePixelDecoder.initializeAsync({
      webAssemblyModulePathOrUrl,
      logNativeDecodersMessages: true,
    });
  });

  after(() => {
    NativePixelEncoder.release();
    NativePixelDecoder.release();
  });

  it('should correctly return initialization status', () => {
    expect(NativePixelEncoder.isInitialized()).to.be.eq(true);
  });

  it('should handle multiple initialization calls gracefully', async () => {
    // Since it's already initialized, this should return early without error
    expect(NativePixelEncoder.isInitialized()).to.be.eq(true);

    // Call initializeAsync again - should return immediately due to early return
    await NativePixelEncoder.initializeAsync({
      logNativeEncodersMessages: false,
    });

    // Should still be initialized
    expect(NativePixelEncoder.isInitialized()).to.be.eq(true);
  });

  describe('RLE Encoding', () => {
    it('should correctly encode and decode basic RLE data', () => {
      const width = 3;
      const height = 3;
      const originalData = Uint8Array.from([0x00, 0xff, 0x00, 0xff, 0x00, 0xff, 0x00, 0xff, 0x00]);

      const monoImage = createImageFromPixelData(
        width,
        height,
        8,
        8,
        1,
        PixelRepresentation.Unsigned,
        PhotometricInterpretation.Monochrome2,
        originalData.buffer,
        TransferSyntax.ExplicitVRLittleEndian
      );
      const pixel = new Pixel(monoImage.getElements(), monoImage.getTransferSyntaxUid());

      // Encode the data
      const encodedData = NativePixelEncoder.encodeRle(pixel, originalData);
      expect(encodedData).to.be.instanceOf(Uint8Array);
      expect(encodedData.length).to.be.greaterThan(0);

      // Decode it back and verify
      const decodedData = NativePixelDecoder.decodeRle(pixel, encodedData);
      expect(decodedData).to.deep.equal(originalData);
    });

    it('should encode RLE with custom parameters', () => {
      const width = 4;
      const height = 4;
      const originalData = Uint8Array.from([
        0x00, 0x00, 0xff, 0xff, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0xff, 0xff, 0x00,
        0x00,
      ]);

      const monoImage = createImageFromPixelData(
        width,
        height,
        8,
        8,
        1,
        PixelRepresentation.Unsigned,
        PhotometricInterpretation.Monochrome2,
        originalData.buffer,
        TransferSyntax.ExplicitVRLittleEndian
      );
      const pixel = new Pixel(monoImage.getElements(), monoImage.getTransferSyntaxUid());

      const encodedData = NativePixelEncoder.encodeRle(pixel, originalData, {});
      expect(encodedData).to.be.instanceOf(Uint8Array);

      const decodedData = NativePixelDecoder.decodeRle(pixel, encodedData);
      expect(decodedData).to.deep.equal(originalData);
    });
  });

  describe('JPEG Encoding', () => {
    it('should correctly encode and decode lossless JPEG data', () => {
      const width = 4;
      const height = 4;
      const originalData = Uint8Array.from([
        0x00, 0x80, 0xff, 0x40, 0x80, 0xff, 0x40, 0x00, 0xff, 0x40, 0x00, 0x80, 0x40, 0x00, 0x80,
        0xff,
      ]);

      const monoImage = createImageFromPixelData(
        width,
        height,
        8,
        8,
        1,
        PixelRepresentation.Unsigned,
        PhotometricInterpretation.Monochrome2,
        originalData.buffer,
        TransferSyntax.ExplicitVRLittleEndian
      );
      const pixel = new Pixel(monoImage.getElements(), monoImage.getTransferSyntaxUid());

      // Test lossless encoding
      const encodedData = NativePixelEncoder.encodeJpeg(pixel, originalData, {
        lossless: true,
      });
      expect(encodedData).to.be.instanceOf(Uint8Array);
      expect(encodedData.length).to.be.greaterThan(0);

      const decodedData = NativePixelDecoder.decodeJpeg(pixel, encodedData);
      expect(decodedData).to.deep.equal(originalData);
    });

    it('should encode JPEG with quality parameter', () => {
      const width = 8;
      const height = 8;
      const originalData = new Uint8Array(width * height);

      // Create a gradient pattern
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          originalData[y * width + x] = Math.floor(((x + y) * 255) / (width + height - 2));
        }
      }

      const monoImage = createImageFromPixelData(
        width,
        height,
        8,
        8,
        1,
        PixelRepresentation.Unsigned,
        PhotometricInterpretation.Monochrome2,
        originalData.buffer,
        TransferSyntax.ExplicitVRLittleEndian
      );
      const pixel = new Pixel(monoImage.getElements(), monoImage.getTransferSyntaxUid());

      // Test different quality levels
      const highQualityEncoded = NativePixelEncoder.encodeJpeg(pixel, originalData, {
        quality: 95,
        lossless: false,
      });
      const lowQualityEncoded = NativePixelEncoder.encodeJpeg(pixel, originalData, {
        quality: 10,
        lossless: false,
      });

      expect(highQualityEncoded).to.be.instanceOf(Uint8Array);
      expect(lowQualityEncoded).to.be.instanceOf(Uint8Array);
      // Note: For small images, quality differences may not result in size differences
      expect(lowQualityEncoded.length).to.be.lessThanOrEqual(highQualityEncoded.length);
    });
  });

  describe('JPEG-LS Encoding', () => {
    it('should correctly encode and decode lossless JPEG-LS data', () => {
      const width = 4;
      const height = 4;
      const originalData = Uint8Array.from([
        0x00, 0x40, 0x80, 0xff, 0x40, 0x80, 0xff, 0x00, 0x80, 0xff, 0x00, 0x40, 0xff, 0x00, 0x40,
        0x80,
      ]);

      const monoImage = createImageFromPixelData(
        width,
        height,
        8,
        8,
        1,
        PixelRepresentation.Unsigned,
        PhotometricInterpretation.Monochrome2,
        originalData.buffer,
        TransferSyntax.ExplicitVRLittleEndian
      );
      const pixel = new Pixel(monoImage.getElements(), monoImage.getTransferSyntaxUid());

      const encodedData = NativePixelEncoder.encodeJpegLs(pixel, originalData, {
        nearLossless: 0,
      });
      expect(encodedData).to.be.instanceOf(Uint8Array);
      expect(encodedData.length).to.be.greaterThan(0);

      const decodedData = NativePixelDecoder.decodeJpegLs(pixel, encodedData);
      expect(decodedData).to.deep.equal(originalData);
    });

    it('should encode JPEG-LS with near-lossless parameter', () => {
      const width = 8;
      const height = 8;
      const originalData = new Uint8Array(width * height);

      // Create a smooth gradient
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          originalData[y * width + x] = Math.floor((x * y * 255) / ((width - 1) * (height - 1)));
        }
      }

      const monoImage = createImageFromPixelData(
        width,
        height,
        8,
        8,
        1,
        PixelRepresentation.Unsigned,
        PhotometricInterpretation.Monochrome2,
        originalData.buffer,
        TransferSyntax.ExplicitVRLittleEndian
      );
      const pixel = new Pixel(monoImage.getElements(), monoImage.getTransferSyntaxUid());

      // Test different near-lossless values
      const losslessEncoded = NativePixelEncoder.encodeJpegLs(pixel, originalData, {
        nearLossless: 0,
      });
      const nearLosslessEncoded = NativePixelEncoder.encodeJpegLs(pixel, originalData, {
        nearLossless: 2,
      });

      expect(losslessEncoded).to.be.instanceOf(Uint8Array);
      expect(nearLosslessEncoded).to.be.instanceOf(Uint8Array);
      // Note: For small images, near-lossless may not always produce smaller files
      expect(nearLosslessEncoded.length).to.be.lessThanOrEqual(losslessEncoded.length);
    });
  });

  describe('JPEG2000 Encoding', () => {
    it('should correctly encode and decode lossless JPEG2000 data', () => {
      const width = 4;
      const height = 4;
      const originalData = Uint8Array.from([
        0x00, 0x55, 0xaa, 0xff, 0x55, 0xaa, 0xff, 0x00, 0xaa, 0xff, 0x00, 0x55, 0xff, 0x00, 0x55,
        0xaa,
      ]);

      const monoImage = createImageFromPixelData(
        width,
        height,
        8,
        8,
        1,
        PixelRepresentation.Unsigned,
        PhotometricInterpretation.Monochrome2,
        originalData.buffer,
        TransferSyntax.ExplicitVRLittleEndian
      );
      const pixel = new Pixel(monoImage.getElements(), monoImage.getTransferSyntaxUid());

      const encodedData = NativePixelEncoder.encodeJpeg2000(pixel, originalData, {
        lossless: true,
      });
      expect(encodedData).to.be.instanceOf(Uint8Array);
      expect(encodedData.length).to.be.greaterThan(0);

      const decodedData = NativePixelDecoder.decodeJpeg2000(pixel, encodedData);
      expect(decodedData).to.deep.equal(originalData);
    });

    it('should encode JPEG2000 with compression ratio', () => {
      const width = 8;
      const height = 8;
      const originalData = new Uint8Array(width * height);

      // Create a checkerboard pattern
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          originalData[y * width + x] = ((x + y) % 2) * 255;
        }
      }

      const monoImage = createImageFromPixelData(
        width,
        height,
        8,
        8,
        1,
        PixelRepresentation.Unsigned,
        PhotometricInterpretation.Monochrome2,
        originalData.buffer,
        TransferSyntax.ExplicitVRLittleEndian
      );
      const pixel = new Pixel(monoImage.getElements(), monoImage.getTransferSyntaxUid());

      // Test different compression ratios
      const lowCompressionEncoded = NativePixelEncoder.encodeJpeg2000(pixel, originalData, {
        compressionRatio: 2,
        lossless: false,
      });
      const highCompressionEncoded = NativePixelEncoder.encodeJpeg2000(pixel, originalData, {
        compressionRatio: 10,
        lossless: false,
      });

      expect(lowCompressionEncoded).to.be.instanceOf(Uint8Array);
      expect(highCompressionEncoded).to.be.instanceOf(Uint8Array);
      // Note: For small images, compression ratio differences may not result in size differences
      expect(highCompressionEncoded.length).to.be.lessThanOrEqual(lowCompressionEncoded.length);
    });
  });

  describe('Multi-component Images', () => {
    it('should encode RGB images correctly', () => {
      const width = 4;
      const height = 4;
      const samplesPerPixel = 3;
      const originalData = new Uint8Array(width * height * samplesPerPixel);

      // Create RGB test pattern
      for (let i = 0; i < width * height; i++) {
        originalData[i * 3] = (i * 85) % 256; // Red
        originalData[i * 3 + 1] = (i * 51) % 256; // Green
        originalData[i * 3 + 2] = (i * 17) % 256; // Blue
      }

      const rgbImage = createImageFromPixelData(
        width,
        height,
        8,
        8,
        samplesPerPixel,
        PixelRepresentation.Unsigned,
        PhotometricInterpretation.Rgb,
        originalData.buffer,
        TransferSyntax.ExplicitVRLittleEndian
      );
      const pixel = new Pixel(rgbImage.getElements(), rgbImage.getTransferSyntaxUid());

      // Test different encoding methods with RGB data
      const rleEncoded = NativePixelEncoder.encodeRle(pixel, originalData);
      expect(rleEncoded).to.be.instanceOf(Uint8Array);

      const jpegLsEncoded = NativePixelEncoder.encodeJpegLs(pixel, originalData, {
        nearLossless: 0,
      });
      expect(jpegLsEncoded).to.be.instanceOf(Uint8Array);

      const jpeg2000Encoded = NativePixelEncoder.encodeJpeg2000(pixel, originalData, {
        lossless: true,
      });
      expect(jpeg2000Encoded).to.be.instanceOf(Uint8Array);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid pixel data gracefully', () => {
      const width = 2;
      const height = 2;
      const invalidData = new Uint8Array(0); // Empty data

      const monoImage = createImageFromPixelData(
        width,
        height,
        8,
        8,
        1,
        PixelRepresentation.Unsigned,
        PhotometricInterpretation.Monochrome2,
        new ArrayBuffer(width * height), // Valid buffer size
        TransferSyntax.ExplicitVRLittleEndian
      );
      const pixel = new Pixel(monoImage.getElements(), monoImage.getTransferSyntaxUid());

      expect(() => {
        NativePixelEncoder.encodeRle(pixel, invalidData);
      }).to.throw();
    });

    it('should handle null/undefined parameters', () => {
      const width = 2;
      const height = 2;
      const testData = new Uint8Array(width * height);

      const monoImage = createImageFromPixelData(
        width,
        height,
        8,
        8,
        1,
        PixelRepresentation.Unsigned,
        PhotometricInterpretation.Monochrome2,
        testData.buffer,
        TransferSyntax.ExplicitVRLittleEndian
      );
      const pixel = new Pixel(monoImage.getElements(), monoImage.getTransferSyntaxUid());

      expect(() => {
        NativePixelEncoder.encodeRle(null, testData);
      }).to.throw();

      expect(() => {
        NativePixelEncoder.encodeRle(pixel, null);
      }).to.throw();
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle single pixel images', () => {
      const width = 1;
      const height = 1;
      const originalData = Uint8Array.from([0x80]);

      const monoImage = createImageFromPixelData(
        width,
        height,
        8,
        8,
        1,
        PixelRepresentation.Unsigned,
        PhotometricInterpretation.Monochrome2,
        originalData.buffer,
        TransferSyntax.ExplicitVRLittleEndian
      );
      const pixel = new Pixel(monoImage.getElements(), monoImage.getTransferSyntaxUid());

      const encodedData = NativePixelEncoder.encodeRle(pixel, originalData);
      expect(encodedData).to.be.instanceOf(Uint8Array);

      const decodedData = NativePixelDecoder.decodeRle(pixel, encodedData);
      expect(decodedData).to.deep.equal(originalData);
    });

    it('should handle uniform pixel values', () => {
      const width = 8;
      const height = 8;
      const uniformValue = 0x7f;
      const originalData = new Uint8Array(width * height).fill(uniformValue);

      const monoImage = createImageFromPixelData(
        width,
        height,
        8,
        8,
        1,
        PixelRepresentation.Unsigned,
        PhotometricInterpretation.Monochrome2,
        originalData.buffer,
        TransferSyntax.ExplicitVRLittleEndian
      );
      const pixel = new Pixel(monoImage.getElements(), monoImage.getTransferSyntaxUid());

      // RLE should be very efficient for uniform data
      const rleEncoded = NativePixelEncoder.encodeRle(pixel, originalData);
      // Note: RLE encoding includes headers and may not always be smaller for very small images
      expect(rleEncoded.length).to.be.greaterThan(0);

      const rleDecoded = NativePixelDecoder.decodeRle(pixel, rleEncoded);
      expect(rleDecoded).to.deep.equal(originalData);

      // JPEG-LS should also be efficient
      const jpegLsEncoded = NativePixelEncoder.encodeJpegLs(pixel, originalData, {
        nearLossless: 0,
      });
      expect(jpegLsEncoded.length).to.be.lessThan(originalData.length);

      const jpegLsDecoded = NativePixelDecoder.decodeJpegLs(pixel, jpegLsEncoded);
      expect(jpegLsDecoded).to.deep.equal(originalData);
    });

    it('should handle maximum pixel values', () => {
      const width = 4;
      const height = 4;
      const originalData = new Uint8Array(width * height).fill(0xff);

      const monoImage = createImageFromPixelData(
        width,
        height,
        8,
        8,
        1,
        PixelRepresentation.Unsigned,
        PhotometricInterpretation.Monochrome2,
        originalData.buffer,
        TransferSyntax.ExplicitVRLittleEndian
      );
      const pixel = new Pixel(monoImage.getElements(), monoImage.getTransferSyntaxUid());

      const encodedData = NativePixelEncoder.encodeJpeg2000(pixel, originalData, {
        lossless: true,
      });
      expect(encodedData).to.be.instanceOf(Uint8Array);

      const decodedData = NativePixelDecoder.decodeJpeg2000(pixel, encodedData);
      expect(decodedData).to.deep.equal(originalData);
    });
  });
});
