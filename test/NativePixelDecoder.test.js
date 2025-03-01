const { Pixel } = require('./../src/Pixel');
const {
  PhotometricInterpretation,
  PixelRepresentation,
  TransferSyntax,
} = require('./../src/Constants');
const NativePixelDecoder = require('./../src/NativePixelDecoder');
const WindowLevel = require('./../src/WindowLevel');

const { createImageFromPixelData } = require('./utils');

const chai = require('chai');
const expect = chai.expect;

describe('Uninitialized NativePixelDecoder', () => {
  it('should throw for uninitialized NativePixelDecoder', () => {
    expect(() => {
      NativePixelDecoder.decodeRle(undefined, undefined);
    }).to.throw();
    expect(() => {
      NativePixelDecoder.decodeJpeg(undefined, undefined);
    }).to.throw();
    expect(() => {
      NativePixelDecoder.decodeJpegLs(undefined, undefined);
    }).to.throw();
    expect(() => {
      NativePixelDecoder.decodeJpeg2000(undefined, undefined);
    }).to.throw();
  });
});

describe('NativePixelDecoder', () => {
  before(async () => {
    const isNodeJs = !!(
      typeof process !== 'undefined' &&
      process.versions &&
      process.versions.node
    );
    const webAssemblyModulePathOrUrl = !isNodeJs
      ? 'base/node_modules/dcmjs-codecs/build/dcmjs-native-codecs.wasm'
      : undefined;
    await NativePixelDecoder.initializeAsync({
      webAssemblyModulePathOrUrl,
      logNativeDecodersMessages: true,
    });
  });
  after(() => {
    NativePixelDecoder.release();
  });

  it('should correctly return initialization status', () => {
    expect(NativePixelDecoder.isInitialized()).to.be.eq(true);
  });

  it('should correctly decode and render basic RleLossless', () => {
    const width = 3;
    const height = 3;
    // prettier-ignore
    const expectedImageData = Uint8Array.from([    
      0x00, 0xff, 0x00,
      0xff, 0x00, 0xff,
      0x00, 0xff, 0x00,
    ]);
    // prettier-ignore
    const rleData = Uint8Array.from([
      // Number of segments
      0x01, 0x00, 0x00, 0x00,
      // First segment offset
      0x40, 0x00, 0x00, 0x00,
      // Other segment offsets
      0x00, 0x00, 0x00, 0x00, // 2
      0x00, 0x00, 0x00, 0x00, // 3
      0x00, 0x00, 0x00, 0x00, // 4
      0x00, 0x00, 0x00, 0x00, // 5
      0x00, 0x00, 0x00, 0x00, // 6
      0x00, 0x00, 0x00, 0x00, // 7
      0x00, 0x00, 0x00, 0x00, // 8
      0x00, 0x00, 0x00, 0x00, // 9
      0x00, 0x00, 0x00, 0x00, // 10
      0x00, 0x00, 0x00, 0x00, // 11
      0x00, 0x00, 0x00, 0x00, // 12
      0x00, 0x00, 0x00, 0x00, // 13
      0x00, 0x00, 0x00, 0x00, // 14
      0x00, 0x00, 0x00, 0x00, // 15
      // RLE data
      0x08, 0x00, 0xff, 0x00, 0xff, 0x00, 0xff, 0x00, 0xff, 0x00
    ]);
    const monoImage = createImageFromPixelData(
      width,
      height,
      8,
      8,
      1,
      PixelRepresentation.Unsigned,
      PhotometricInterpretation.Monochrome2,
      rleData.buffer,
      TransferSyntax.RleLossless
    );
    const pixel = new Pixel(monoImage.getElements(), monoImage.getTransferSyntaxUid());
    const rleDecodedData = NativePixelDecoder.decodeRle(pixel, rleData);
    expect(rleDecodedData).to.deep.equal(expectedImageData);

    const renderingResult = monoImage.render({ windowLevel: new WindowLevel(255, 255 / 2) });
    expect(renderingResult.histograms).to.be.undefined;
    expect(renderingResult.windowLevel).not.to.be.undefined;
    expect(renderingResult.windowLevel.getWindow()).to.be.eq(255);
    expect(renderingResult.windowLevel.getLevel()).to.be.eq(255 / 2);
    expect(renderingResult.frame).to.be.eq(0);
    expect(renderingResult.width).to.be.eq(width);
    expect(renderingResult.height).to.be.eq(height);

    const renderedPixels = new Uint8Array(renderingResult.pixels);
    for (let i = 0, p = 0; i < 4 * width * height; i += 4) {
      expect(renderedPixels[i]).to.be.eq(expectedImageData[p]);
      expect(renderedPixels[i + 1]).to.be.eq(expectedImageData[p]);
      expect(renderedPixels[i + 2]).to.be.eq(expectedImageData[p]);
      expect(renderedPixels[i + 3]).to.be.eq(255);
      p++;
    }
  });

  it('should correctly decode and render basic JpegBaselineProcess1', () => {
    const width = 3;
    const height = 3;
    // prettier-ignore
    const expectedImageData = Uint8Array.from([    
      0x00, 0xff, 0x00,
      0xff, 0x00, 0xff,
      0x00, 0xff, 0x00,
    ]);
    const jpegBaselineCodestream = Uint8Array.from([
      // Start of image (SOI) marker
      0xff, 0xd8,
      // Application segment 0 (APP0) marker
      0xff, 0xe0,
      // APP0 marker length
      0x00, 0x10,
      // Identifier string JFIF
      0x4a, 0x46, 0x49, 0x46, 0x00,
      // JFIF version 1.01
      0x01, 0x01,
      // Density units (no units = 0)
      0x00,
      // Horizontal density
      0x00, 0x01,
      // Vertical density
      0x00, 0x01,
      // X thumbnail size
      0x00,
      // Y thumbnail size
      0x00,
      // Define quantization table (DQT) marker
      0xff, 0xdb,
      // DQT marker length
      0x00, 0x43,
      // Table #0, 8-bit
      0x00,
      // 64 byte quantization table
      0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
      0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
      0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
      0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
      0x01, 0x01, 0x01, 0x01,
      // Start of frame 0 (SOF0) marker
      0xff, 0xc0,
      // SOF0 marker length
      0x00, 0x0b,
      // Bits per pixel
      0x08,
      // Image height
      0x00, 0x03,
      // Image width
      0x00, 0x03,
      // Number of components
      0x01,
      // Y component = 0x01, Sampling factor = 0x22, Quantization table number
      0x01, 0x11, 0x00,
      // Define huffman table (DHT) marker
      0xff, 0xc4,
      // DHT marker length
      0x00, 0x1a,
      // Huffman table
      0x10,
      // Table data
      0x00, 0x03, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x05, 0x06, 0x07, 0x08, 0x04, 0x09, 0x03,
      // Define huffman table (DHT) marker
      0xff, 0xc4,
      // DHT marker length
      0x00, 0x14,
      // Table data
      0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x0a,
      // Start of scan (SOS) marker
      0xff, 0xda,
      // SOS marker length
      0x00, 0x08,
      // Number of components
      0x01,
      // Y component = 0x01, Huffman table to use = 0x00
      0x01, 0x00,
      // Start of spectral selection or predictor selection
      0x00,
      // End of spectral selection
      0x3f,
      // Successive approximation bit position or point transform
      0x00,
      // Frame data
      0x37, 0xbb, 0x87, 0x70, 0xda, 0x24, 0xf6, 0x84, 0xa5, 0x65, 0x64, 0xac, 0x80, 0x54, 0x61,
      0x5c, 0x81, 0xe7, 0xb5, 0x2f, 0xab, 0xaa, 0x97, 0xe7, 0xb6, 0x05, 0xb4, 0x31, 0xfc, 0x98,
      0xed, 0x18, 0x17, 0x34, 0xd8, 0x9c, 0x06, 0x8d, 0x70, 0xb1, 0x66, 0x97, 0xb6, 0xd0, 0xf3,
      0xf0, 0xed, 0xaf, 0x66, 0xc4, 0x49, 0xe4, 0xe2, 0x0d, 0xf0, 0xcb, 0x20, 0x92, 0xce, 0x14,
      0xd8, 0x5c, 0x2d, 0x36, 0x73, 0x12, 0x9d, 0x4f, 0xa7, 0xab, 0x1f,
      // End of image (EOI) marker
      0xff, 0xd9,
    ]);

    const monoImage = createImageFromPixelData(
      width,
      height,
      8,
      8,
      1,
      PixelRepresentation.Unsigned,
      PhotometricInterpretation.Monochrome2,
      jpegBaselineCodestream.buffer,
      TransferSyntax.JpegBaselineProcess1
    );
    const pixel = new Pixel(monoImage.getElements(), monoImage.getTransferSyntaxUid());
    const jpegBaselineDecodedData = NativePixelDecoder.decodeJpeg(pixel, jpegBaselineCodestream);
    expect(jpegBaselineDecodedData).to.deep.equal(expectedImageData);

    const renderingResult = monoImage.render({ windowLevel: new WindowLevel(255, 255 / 2) });
    expect(renderingResult.histograms).to.be.undefined;
    expect(renderingResult.windowLevel).not.to.be.undefined;
    expect(renderingResult.windowLevel.getWindow()).to.be.eq(255);
    expect(renderingResult.windowLevel.getLevel()).to.be.eq(255 / 2);
    expect(renderingResult.frame).to.be.eq(0);
    expect(renderingResult.width).to.be.eq(width);
    expect(renderingResult.height).to.be.eq(height);

    const renderedPixels = new Uint8Array(renderingResult.pixels);
    for (let i = 0, p = 0; i < 4 * width * height; i += 4) {
      expect(renderedPixels[i]).to.be.eq(expectedImageData[p]);
      expect(renderedPixels[i + 1]).to.be.eq(expectedImageData[p]);
      expect(renderedPixels[i + 2]).to.be.eq(expectedImageData[p]);
      expect(renderedPixels[i + 3]).to.be.eq(255);
      p++;
    }
  });

  it('should correctly decode and render basic JpegLsLossless', () => {
    const width = 3;
    const height = 3;
    // prettier-ignore
    const expectedImageData = Uint8Array.from([
      0x00, 0xff, 0x00,
      0xff, 0x7f, 0xff,
      0x00, 0xff, 0x00,
    ]);
    const jpegLsCodestream = Uint8Array.from([
      // Start of image (SOI) marker
      0xff, 0xd8,
      // Start of JPEG-LS frame (SOF55) marker – marker segment follows
      0xff, 0xf7,
      // Length of marker segment = 11 bytes including the length field
      0x00, 0x0b,
      // P = Precision
      0x08,
      // Y = Number of lines (big endian)
      0x00, 0x03,
      // X = Number of columns (big endian)
      0x00, 0x03,
      // Nf = Number of components in the frame = 1
      0x01,
      // C1 = Component ID = 1 (first and only component)
      0x01,
      // Sub-sampling: H1 = 1, V1 = 1
      0x11,
      // Tq1 = 0 (this field is always 0)
      0x00,
      // Start of scan (SOS) marker
      0xff, 0xda,
      // Length of marker segment = 8 bytes including the length field
      0x00, 0x08,
      // Ns = Number of components for this scan = 1
      0x01,
      // Ci = Component ID = 1
      0x01,
      // Tm1 = Mapping table index = 0 (no mapping table)
      0x00,
      // NEAR (0 = Lossless)
      0x00,
      // ILV = 0 (interleave mode = non-interleaved)
      0x00,
      // Al = 0, Ah = 0 (no point transform)
      0x00,
      // Frame data
      0xa5, 0xa0, 0x00, 0x00, 0x3f, 0xda, 0x06, 0x0e,
      // End of image (EOI) marker
      0xff, 0xd9,
    ]);

    const monoImage = createImageFromPixelData(
      width,
      height,
      8,
      8,
      1,
      PixelRepresentation.Unsigned,
      PhotometricInterpretation.Monochrome2,
      jpegLsCodestream.buffer,
      TransferSyntax.JpegLsLossless
    );
    const pixel = new Pixel(monoImage.getElements(), monoImage.getTransferSyntaxUid());
    const jpegLsDecodedData = NativePixelDecoder.decodeJpegLs(pixel, jpegLsCodestream);
    expect(jpegLsDecodedData).to.deep.equal(expectedImageData);

    const renderingResult = monoImage.render({ windowLevel: new WindowLevel(255, 255 / 2) });
    expect(renderingResult.histograms).to.be.undefined;
    expect(renderingResult.windowLevel).not.to.be.undefined;
    expect(renderingResult.windowLevel.getWindow()).to.be.eq(255);
    expect(renderingResult.windowLevel.getLevel()).to.be.eq(255 / 2);
    expect(renderingResult.frame).to.be.eq(0);
    expect(renderingResult.width).to.be.eq(width);
    expect(renderingResult.height).to.be.eq(height);

    const renderedPixels = new Uint8Array(renderingResult.pixels);
    for (let i = 0, p = 0; i < 4 * width * height; i += 4) {
      expect(renderedPixels[i]).to.be.eq(expectedImageData[p]);
      expect(renderedPixels[i + 1]).to.be.eq(expectedImageData[p]);
      expect(renderedPixels[i + 2]).to.be.eq(expectedImageData[p]);
      expect(renderedPixels[i + 3]).to.be.eq(255);
      p++;
    }
  });

  it('should correctly decode and render basic Jpeg2000Lossless', () => {
    const width = 3;
    const height = 3;
    // prettier-ignore
    const expectedImageData = Uint8Array.from([
      0x00, 0xff, 0x00,
      0xff, 0x7f, 0xff,
      0x00, 0xff, 0x00,
    ]);
    const jpeg2000Codestream = Uint8Array.from([
      // Start of codestream (SOC)
      0xff, 0x4f,
      // Image and tile size (SIZ)
      0xff, 0x51,
      // SIZ marker length
      0x00, 0x29,
      // Profile
      0x00, 0x00,
      // Reference grid size width
      0x00, 0x00, 0x00, 0x03,
      // Reference grid size height
      0x00, 0x00, 0x00, 0x03,
      // Horizontal offset from the origin of the reference
      // grid to the left and top side of the image area
      0x00, 0x00, 0x00, 0x00,
      // Vertical offset from the origin of the reference
      // grid to the left and top side of the image area
      0x00, 0x00, 0x00, 0x00,
      // Reference tile width
      0x00, 0x00, 0x00, 0x03,
      // Reference tile height
      0x00, 0x00, 0x00, 0x03,
      // Horizontal offset from the origin of the reference grid
      // to the left and top side of the first tile
      0x00, 0x00, 0x00, 0x00,
      // Vertical offset from the origin of the reference grid
      // to the left and top side of the first tile
      0x00, 0x00, 0x00, 0x00,
      // Number of color components
      0x00, 0x01,
      // Precision (depth) in bits and sign of the component samples
      0x07,
      // Horizontal separation of a sample
      0x01,
      // Vertical separation of a sample
      0x01,
      // Coding style default (COD)
      0xff, 0x52,
      // COD marker length
      0x00, 0x0c,
      // Coding style
      0x00,
      // Progression (LRCP = 0)
      0x00,
      // Quality layers
      0x00, 0x08,
      // Multiple component transform
      0x00,
      // Decomposition levels
      0x05,
      // Codeblock width exponent
      0x04,
      // Codeblock height exponent
      0x04,
      // Codeblock style
      0x00,
      // Wavelet filter (Irreversible_9_7 = 0, Reversible_5_3 = 1)
      0x01,
      // Quantization default (QCD)
      0xff, 0x5c,
      // QCD marker length
      0x00, 0x13,
      // Quantization default values for the Sqcd and Sqcc parameters
      0x40, 0x40, 0x48, 0x48, 0x50, 0x48, 0x48, 0x50, 0x48, 0x48, 0x50, 0x48, 0x48, 0x50, 0x48,
      0x48, 0x50,
      // Start of tile (SOT)
      0xff, 0x90,
      // SOT marker length
      0x00, 0x0a,
      // Tile index
      0x00, 0x00,
      // Length, in bytes, from the beginning of the first byte of
      // this SOT marker segment of the tile-part to the end of the
      // data of that tile-part
      0x00, 0x00, 0x00, 0x4f,
      // Tile-part index
      0x00,
      // Number of tile-parts of a tile in the codestream
      0x01,
      // Start of data (SOD)
      0xff, 0x93,
      // Frame data
      0xc7, 0xd2, 0x04, 0x04, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80,
      0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80,
      0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0xa3,
      0xec, 0x02, 0x9f, 0x78, 0x10, 0x02, 0x87, 0x06, 0x7f, 0x80, 0x80, 0x80, 0x80, 0x80, 0xc3,
      0xe6, 0x04, 0x00, 0x01, 0xaf,
      // End of codestream (EOC)
      0xff, 0xd9,
    ]);

    const monoImage = createImageFromPixelData(
      width,
      height,
      8,
      8,
      1,
      PixelRepresentation.Unsigned,
      PhotometricInterpretation.Monochrome2,
      jpeg2000Codestream.buffer,
      TransferSyntax.Jpeg2000Lossless
    );
    const pixel = new Pixel(monoImage.getElements(), monoImage.getTransferSyntaxUid());
    const jpeg2000DecodedData = NativePixelDecoder.decodeJpeg2000(pixel, jpeg2000Codestream);
    expect(jpeg2000DecodedData).to.deep.equal(expectedImageData);

    const renderingResult = monoImage.render({ windowLevel: new WindowLevel(255, 255 / 2) });
    expect(renderingResult.histograms).to.be.undefined;
    expect(renderingResult.windowLevel).not.to.be.undefined;
    expect(renderingResult.windowLevel.getWindow()).to.be.eq(255);
    expect(renderingResult.windowLevel.getLevel()).to.be.eq(255 / 2);
    expect(renderingResult.frame).to.be.eq(0);
    expect(renderingResult.width).to.be.eq(width);
    expect(renderingResult.height).to.be.eq(height);

    const renderedPixels = new Uint8Array(renderingResult.pixels);
    for (let i = 0, p = 0; i < 4 * width * height; i += 4) {
      expect(renderedPixels[i]).to.be.eq(expectedImageData[p]);
      expect(renderedPixels[i + 1]).to.be.eq(expectedImageData[p]);
      expect(renderedPixels[i + 2]).to.be.eq(expectedImageData[p]);
      expect(renderedPixels[i + 3]).to.be.eq(255);
      p++;
    }
  });

  it('should correctly decode and render basic HtJpeg2000Lossless', () => {
    const width = 4;
    const height = 4;
    // prettier-ignore
    const expectedImageData = Uint8Array.from([
      0x00, 0xff, 0x00, 0xff,
      0xff, 0x00, 0xff, 0x00,
      0x00, 0xff, 0x00, 0xff,
      0xff, 0x00, 0xff, 0x00,
    ]);
    const htJpeg2000Codestream = Uint8Array.from([
      // Start of codestream (SOC)
      0xff, 0x4f,
      // Image and tile size (SIZ)
      0xff, 0x51,
      // SIZ marker length
      0x00, 0x29,
      // Profile
      0x40, 0x00,
      // Reference grid size width
      0x00, 0x00, 0x00, 0x04,
      // Reference grid size height
      0x00, 0x00, 0x00, 0x04,
      // Horizontal offset from the origin of the reference
      // grid to the left and top side of the image area
      0x00, 0x00, 0x00, 0x00,
      // Vertical offset from the origin of the reference
      // grid to the left and top side of the image area
      0x00, 0x00, 0x00, 0x00,
      // Reference tile width
      0x00, 0x00, 0x00, 0x04,
      // Reference tile height
      0x00, 0x00, 0x00, 0x04,
      // Horizontal offset from the origin of the reference grid
      // to the left and top side of the first tile
      0x00, 0x00, 0x00, 0x00,
      // Vertical offset from the origin of the reference grid
      // to the left and top side of the first tile
      0x00, 0x00, 0x00, 0x00,
      // Number of color components
      0x00, 0x01,
      // Precision (depth) in bits and sign of the component samples
      0x07,
      // Horizontal separation of a sample
      0x01,
      // Vertical separation of a sample
      0x01,
      // Extended capability (CAP)
      0xff, 0x50,
      // CAP marker length
      0x00, 0x08,
      // Capabilities
      0x00, 0x02, 0x00, 0x00, 0x00, 0x0c,
      // Coding style default (COD)
      0xff, 0x52,
      // COD marker length
      0x00, 0x0c,
      // Coding style
      0x00,
      // Progression (RPCL = 2)
      0x00,
      // Quality layers
      0x00, 0x01,
      // Multiple component transform
      0x00,
      // Decomposition levels
      0x05,
      // Codeblock width exponent
      0x04,
      // Codeblock height exponent
      0x04,
      // Codeblock style
      0x40,
      // Wavelet filter (Irreversible_9_7 = 0, Reversible_5_3 = 1)
      0x01,
      // Quantization default (QCD)
      0xff, 0x5c,
      // QCD marker length
      0x00, 0x13,
      // Quantization default values for the Sqcd and Sqcc parameters
      0x20, 0x90, 0x98, 0x98, 0xa0, 0x98, 0x98, 0xa0, 0x98, 0x98, 0xa0, 0x98, 0x98, 0x98, 0x90,
      0x90, 0x98,
      // Start of tile (SOT)
      0xff, 0x90,
      // SOT marker length
      0x00, 0x0a,
      // Tile index
      0x00, 0x00,
      // Length, in bytes, from the beginning of the first byte of
      // this SOT marker segment of the tile-part to the end of the
      // data of that tile-part
      0x00, 0x00, 0x00, 0x1e,
      // Tile-part index
      0x00,
      // Number of tile-parts of a tile in the codestream
      0x01,
      // Start of data (SOD)
      0xff, 0x93,
      // Frame data
      0x00, 0x00, 0x00, 0x00, 0x00, 0x90, 0x02, 0xa0, 0xfb, 0xf7, 0xdf, 0x7f, 0x01, 0x01, 0xb4,
      0x00,
      // End of codestream (EOC)
      0xff, 0xd9,
    ]);

    const monoImage = createImageFromPixelData(
      width,
      height,
      8,
      8,
      1,
      PixelRepresentation.Unsigned,
      PhotometricInterpretation.Monochrome2,
      htJpeg2000Codestream.buffer,
      TransferSyntax.HtJpeg2000Lossless
    );
    const pixel = new Pixel(monoImage.getElements(), monoImage.getTransferSyntaxUid());
    const htJpeg2000DecodedData = NativePixelDecoder.decodeJpeg2000(pixel, htJpeg2000Codestream);
    expect(htJpeg2000DecodedData).to.deep.equal(expectedImageData);

    const renderingResult = monoImage.render({ windowLevel: new WindowLevel(255, 255 / 2) });
    expect(renderingResult.histograms).to.be.undefined;
    expect(renderingResult.windowLevel).not.to.be.undefined;
    expect(renderingResult.windowLevel.getWindow()).to.be.eq(255);
    expect(renderingResult.windowLevel.getLevel()).to.be.eq(255 / 2);
    expect(renderingResult.frame).to.be.eq(0);
    expect(renderingResult.width).to.be.eq(width);
    expect(renderingResult.height).to.be.eq(height);

    const renderedPixels = new Uint8Array(renderingResult.pixels);
    for (let i = 0, p = 0; i < 4 * width * height; i += 4) {
      expect(renderedPixels[i]).to.be.eq(expectedImageData[p]);
      expect(renderedPixels[i + 1]).to.be.eq(expectedImageData[p]);
      expect(renderedPixels[i + 2]).to.be.eq(expectedImageData[p]);
      expect(renderedPixels[i + 3]).to.be.eq(255);
      p++;
    }
  });
});
