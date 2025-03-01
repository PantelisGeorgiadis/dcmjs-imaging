const {
  PhotometricInterpretation,
  PixelRepresentation,
  PlanarConfiguration,
  StandardColorPalette,
  TransferSyntax,
} = require('./../src/Constants');
const DicomImage = require('./../src/DicomImage');
const WindowLevel = require('./../src/WindowLevel');
const ColorPalette = require('./../src/ColorPalette');

const { createImageFromPixelData } = require('./utils');

const pako = require('pako');
const chai = require('chai');
const expect = chai.expect;

describe('DicomImage', () => {
  it('should correctly convert elements to a DicomImage and back', () => {
    const rows = 512;
    const columns = 256;
    const bitsStored = 12;
    const photometricInterpretation = PhotometricInterpretation.Monochrome2;
    const planarConfiguration = PlanarConfiguration.Interleaved;
    const numberOfFrames = 15;

    const image1 = new DicomImage(
      {
        Rows: rows,
        Columns: columns,
        BitsStored: bitsStored,
      },
      TransferSyntax.ImplicitVRLittleEndian
    );
    image1.setElement('PhotometricInterpretation', photometricInterpretation);
    image1.setElement('NumberOfFrames', numberOfFrames);
    const dicomImage1 = image1.getDenaturalizedDataset();

    const image2 = new DicomImage(dicomImage1, TransferSyntax.ImplicitVRLittleEndian);
    expect(image2.getElement('Rows')).to.be.eq(rows);
    expect(image2.getElement('Columns')).to.be.eq(columns);
    expect(image2.getElement('BitsStored')).to.be.eq(bitsStored);
    expect(image2.getElement('PhotometricInterpretation')).to.be.eq(photometricInterpretation);
    expect(image2.getTransferSyntaxUid()).to.be.eq(TransferSyntax.ImplicitVRLittleEndian);

    image2.setTransferSyntaxUid(TransferSyntax.ExplicitVRLittleEndian);
    image2.setElement('PlanarConfiguration', planarConfiguration);
    const dicomImage2 = image2.getDenaturalizedDataset();

    const image3 = new DicomImage(dicomImage2, TransferSyntax.ExplicitVRLittleEndian);
    expect(image3.getElement('Rows')).to.be.eq(rows);
    expect(image3.getElement('Columns')).to.be.eq(columns);
    expect(image3.getElement('BitsStored')).to.be.eq(bitsStored);
    expect(image3.getElement('PhotometricInterpretation')).to.be.eq(photometricInterpretation);
    expect(image3.getElement('PlanarConfiguration')).to.be.eq(planarConfiguration);
    expect(image3.getTransferSyntaxUid()).to.be.eq(TransferSyntax.ExplicitVRLittleEndian);
    expect(image3.getHeight()).to.be.eq(rows);
    expect(image3.getWidth()).to.be.eq(columns);
    expect(image3.getNumberOfFrames()).to.be.eq(numberOfFrames);
    expect(image3.toString()).to.be.a('string');
  });

  it('should throw for not renderable transfer syntax UID', () => {
    const image = new DicomImage(
      {
        Rows: 128,
        Columns: 128,
        BitsStored: 8,
        PhotometricInterpretation: PhotometricInterpretation.Monochrome2,
        PixelData: [Uint8Array.from([1, 2, 3, 4, 5]).buffer],
      },
      '1.2.3.4.5.6'
    );

    expect(() => {
      image.render();
    }).to.throw();
  });

  it('should throw for rendering non-existent frames', () => {
    const image = new DicomImage(
      {
        NumberOfFrames: 1,
        PixelData: [Uint8Array.from([1, 2, 3, 4, 5]).buffer],
      },
      TransferSyntax.ImplicitVRLittleEndian
    );

    expect(() => {
      image.render({ frame: 2 });
    }).to.throw();
  });

  it('should throw for rendering with a bad user defined WindowLevel', () => {
    const image = new DicomImage(
      {
        PixelData: [Uint8Array.from([1, 2, 3, 4, 5]).buffer],
      },
      TransferSyntax.ImplicitVRLittleEndian
    );

    expect(() => {
      image.render({ windowLevel: 'ww/wl' });
    }).to.throw();
  });

  it('should correctly render a single bit frame (MONOCHROME2)', () => {
    [
      TransferSyntax.ImplicitVRLittleEndian,
      TransferSyntax.ExplicitVRLittleEndian,
      TransferSyntax.ExplicitVRBigEndian,
    ].forEach((syntax) => {
      const width = 4;
      const height = 4;
      // prettier-ignore
      const pixels = Uint8Array.from([
        0x00, 0x01, 0x00, 0x01,
        0x01, 0x00, 0x01, 0x00,
        0x00, 0x01, 0x00, 0x01,
        0x01, 0x01, 0x01, 0x01,
      ]);
      // prettier-ignore
      const expectedRenderedPixels = Uint8Array.from([
        0x00, 0xff, 0x00, 0xff,
        0xff, 0x00, 0xff, 0x00,
        0x00, 0xff, 0x00, 0xff,
        0xff, 0xff, 0xff, 0xff,
      ]);

      const packedPixels = new Uint8Array((width * height) / 8);
      for (let i = 0, l = width * height; i < l; i++) {
        const value = pixels[i] === 0x01;
        const byteIndex = Math.floor(i / 8);
        const bitIndex = i - 8 * byteIndex;
        const byteValue = packedPixels[byteIndex];
        const maskValue = 0x01 << bitIndex;
        packedPixels[byteIndex] = value ? byteValue | maskValue : byteValue & ~maskValue;
      }

      const monoImage = createImageFromPixelData(
        width,
        height,
        1,
        1,
        1,
        PixelRepresentation.Unsigned,
        PhotometricInterpretation.Monochrome2,
        packedPixels.buffer,
        syntax
      );
      const renderingResult = monoImage.render();
      expect(renderingResult.histograms).to.be.undefined;
      expect(renderingResult.windowLevel).not.to.be.undefined;
      expect(renderingResult.windowLevel.getWindow()).to.be.eq(2);
      expect(renderingResult.windowLevel.getLevel()).to.be.eq(1);
      expect(renderingResult.frame).to.be.eq(0);
      expect(renderingResult.width).to.be.eq(width);
      expect(renderingResult.height).to.be.eq(height);
      expect(renderingResult.colorPalette).to.be.eq(StandardColorPalette.Grayscale);

      const renderedPixels = new Uint8Array(renderingResult.pixels);
      for (let i = 0, p = 0; i < 4 * width * height; i += 4) {
        expect(renderedPixels[i]).to.be.eq(expectedRenderedPixels[p]);
        expect(renderedPixels[i + 1]).to.be.eq(expectedRenderedPixels[p]);
        expect(renderedPixels[i + 2]).to.be.eq(expectedRenderedPixels[p]);
        expect(renderedPixels[i + 3]).to.be.eq(255);
        p++;
      }
    });
  });

  it('should correctly render an 8-bit grayscale frame (MONOCHROME1)', () => {
    [
      TransferSyntax.ImplicitVRLittleEndian,
      TransferSyntax.ExplicitVRLittleEndian,
      TransferSyntax.ExplicitVRBigEndian,
    ].forEach((syntax) => {
      const width = 3;
      const height = 3;
      // prettier-ignore
      const pixels = Uint8Array.from([
        0x00, 0xff, 0x00,
        0xff, 0x7f, 0xff,
        0x00, 0xff, 0x00,
      ]);
      // prettier-ignore
      const expectedRenderedPixels = Uint8Array.from([
        0xff - 0x00, 0xff - 0xff, 0xff - 0x00,
        0xff - 0xff, 0xff - 0x7f, 0xff - 0xff,
        0xff - 0x00, 0xff - 0xff, 0xff - 0x00,
      ]);
      const monoImage = createImageFromPixelData(
        width,
        height,
        8,
        8,
        1,
        PixelRepresentation.Unsigned,
        PhotometricInterpretation.Monochrome1,
        pixels.buffer,
        syntax
      );
      const renderingResult = monoImage.render({ windowLevel: new WindowLevel(255, 255 / 2) });
      expect(renderingResult.histograms).to.be.undefined;
      expect(renderingResult.windowLevel).not.to.be.undefined;
      expect(renderingResult.windowLevel.getWindow()).to.be.eq(255);
      expect(renderingResult.windowLevel.getLevel()).to.be.eq(255 / 2);
      expect(renderingResult.frame).to.be.eq(0);
      expect(renderingResult.width).to.be.eq(width);
      expect(renderingResult.height).to.be.eq(height);
      expect(renderingResult.colorPalette).to.be.eq(StandardColorPalette.Grayscale);

      const renderedPixels = new Uint8Array(renderingResult.pixels);
      for (let i = 0, p = 0; i < 4 * width * height; i += 4) {
        expect(renderedPixels[i]).to.be.eq(expectedRenderedPixels[p]);
        expect(renderedPixels[i + 1]).to.be.eq(expectedRenderedPixels[p]);
        expect(renderedPixels[i + 2]).to.be.eq(expectedRenderedPixels[p]);
        expect(renderedPixels[i + 3]).to.be.eq(255);
        p++;
      }
    });
  });

  it('should correctly render an 8-bit grayscale frame (MONOCHROME2)', () => {
    [
      TransferSyntax.ImplicitVRLittleEndian,
      TransferSyntax.ExplicitVRLittleEndian,
      TransferSyntax.ExplicitVRBigEndian,
    ].forEach((syntax) => {
      const width = 3;
      const height = 3;
      // prettier-ignore
      const pixels = Uint8Array.from([
        0x00, 0x7f, 0x00,
        0xff, 0x00, 0xff,
        0x00, 0x7f, 0x00,
      ]);
      // prettier-ignore
      const expectedRenderedPixels = Uint8Array.from([
        0x00, 0x7f, 0x00,
        0xff, 0x00, 0xff,
        0x00, 0x7f, 0x00,
      ]);
      const monoImage = createImageFromPixelData(
        width,
        height,
        8,
        8,
        1,
        PixelRepresentation.Unsigned,
        PhotometricInterpretation.Monochrome2,
        pixels.buffer,
        syntax
      );
      const renderingResult = monoImage.render({
        windowLevel: new WindowLevel(255, 255 / 2),
        colorPalette: StandardColorPalette.Grayscale,
      });
      expect(renderingResult.histograms).to.be.undefined;
      expect(renderingResult.windowLevel).not.to.be.undefined;
      expect(renderingResult.windowLevel.getWindow()).to.be.eq(255);
      expect(renderingResult.windowLevel.getLevel()).to.be.eq(255 / 2);
      expect(renderingResult.frame).to.be.eq(0);
      expect(renderingResult.width).to.be.eq(width);
      expect(renderingResult.height).to.be.eq(height);
      expect(renderingResult.colorPalette).to.be.eq(StandardColorPalette.Grayscale);

      const renderedPixels = new Uint8Array(renderingResult.pixels);
      for (let i = 0, p = 0; i < 4 * width * height; i += 4) {
        expect(renderedPixels[i]).to.be.eq(expectedRenderedPixels[p]);
        expect(renderedPixels[i + 1]).to.be.eq(expectedRenderedPixels[p]);
        expect(renderedPixels[i + 2]).to.be.eq(expectedRenderedPixels[p]);
        expect(renderedPixels[i + 3]).to.be.eq(255);
        p++;
      }
    });
  });

  it('should correctly render an 8-bit grayscale multiframe (MONOCHROME2)', () => {
    [
      TransferSyntax.ImplicitVRLittleEndian,
      TransferSyntax.ExplicitVRLittleEndian,
      TransferSyntax.ExplicitVRBigEndian,
    ].forEach((syntax) => {
      const width = 3;
      const height = 3;
      // prettier-ignore
      const pixels = Uint8Array.from([
        // Frame 1
        0x00, 0x7f, 0x00,
        0xff, 0x00, 0xff,
        0x00, 0x7f, 0x00,
        // Frame 2
        0xff, 0x00, 0xff,
        0x00, 0x7f, 0x00,
        0xff, 0x00, 0xff,
      ]);
      // prettier-ignore
      const expectedRenderedPixelsFrame1 = Uint8Array.from([
        0x00, 0x7f, 0x00,
        0xff, 0x00, 0xff,
        0x00, 0x7f, 0x00,
      ]);
      // prettier-ignore
      const expectedRenderedPixelsFrame2 = Uint8Array.from([
        0xff, 0x00, 0xff, 
        0x00, 0x7f, 0x00, 
        0xff, 0x00, 0xff,
      ]);
      const monoImage = createImageFromPixelData(
        width,
        height,
        8,
        8,
        1,
        PixelRepresentation.Unsigned,
        PhotometricInterpretation.Monochrome2,
        pixels.buffer,
        syntax
      );
      monoImage.setElement('NumberOfFrames', 2);

      const renderingResult1 = monoImage.render({
        frame: 0,
        windowLevel: new WindowLevel(255, 255 / 2),
      });
      expect(renderingResult1.histograms).to.be.undefined;
      expect(renderingResult1.windowLevel).not.to.be.undefined;
      expect(renderingResult1.windowLevel.getWindow()).to.be.eq(255);
      expect(renderingResult1.windowLevel.getLevel()).to.be.eq(255 / 2);
      expect(renderingResult1.frame).to.be.eq(0);
      expect(renderingResult1.colorPalette).to.be.eq(StandardColorPalette.Grayscale);

      const renderedPixels1 = new Uint8Array(renderingResult1.pixels);
      for (let i = 0, p = 0; i < 4 * width * height; i += 4) {
        expect(renderedPixels1[i]).to.be.eq(expectedRenderedPixelsFrame1[p]);
        expect(renderedPixels1[i + 1]).to.be.eq(expectedRenderedPixelsFrame1[p]);
        expect(renderedPixels1[i + 2]).to.be.eq(expectedRenderedPixelsFrame1[p]);
        expect(renderedPixels1[i + 3]).to.be.eq(255);
        p++;
      }

      const renderingResult2 = monoImage.render({
        frame: 1,
        windowLevel: new WindowLevel(255, 255 / 2),
      });
      expect(renderingResult2.histograms).to.be.undefined;
      expect(renderingResult2.windowLevel).not.to.be.undefined;
      expect(renderingResult2.windowLevel.getWindow()).to.be.eq(255);
      expect(renderingResult2.windowLevel.getLevel()).to.be.eq(255 / 2);
      expect(renderingResult2.frame).to.be.eq(1);
      expect(renderingResult2.colorPalette).to.be.eq(StandardColorPalette.Grayscale);

      const renderedPixels2 = new Uint8Array(renderingResult2.pixels);
      for (let i = 0, p = 0; i < 4 * width * height; i += 4) {
        expect(renderedPixels2[i]).to.be.eq(expectedRenderedPixelsFrame2[p]);
        expect(renderedPixels2[i + 1]).to.be.eq(expectedRenderedPixelsFrame2[p]);
        expect(renderedPixels2[i + 2]).to.be.eq(expectedRenderedPixelsFrame2[p]);
        expect(renderedPixels2[i + 3]).to.be.eq(255);
        p++;
      }
    });
  });

  it('should correctly render a little endian unsigned 16-bit grayscale frame (MONOCHROME2)', () => {
    const width = 3;
    const height = 3;
    // prettier-ignore
    const pixels = Uint8Array.from([
      0x00, 0x00,   0xff, 0xff,   0x00, 0x00,
      0xff, 0xff,   0xff, 0x7f,   0xff, 0xff,
      0x00, 0x00,   0xff, 0xff,   0x00, 0x00,
    ]);
    // prettier-ignore
    const expectedRenderedPixels = Uint8Array.from([
      0x00, 0xff, 0x00,
      0xff, 0x7f, 0xff,
      0x00, 0xff, 0x00,
    ]);
    const monoImage = createImageFromPixelData(
      width,
      height,
      16,
      16,
      1,
      PixelRepresentation.Unsigned,
      PhotometricInterpretation.Monochrome2,
      pixels.buffer,
      TransferSyntax.ImplicitVRLittleEndian
    );
    const renderingResult = monoImage.render();
    expect(renderingResult.histograms).to.be.undefined;
    expect(renderingResult.windowLevel).not.to.be.undefined;
    expect(renderingResult.frame).to.be.eq(0);
    expect(renderingResult.width).to.be.eq(width);
    expect(renderingResult.height).to.be.eq(height);
    expect(renderingResult.colorPalette).to.be.eq(StandardColorPalette.Grayscale);

    const renderedPixels = new Uint8Array(renderingResult.pixels);
    for (let i = 0, p = 0; i < 4 * width * height; i += 4) {
      expect(renderedPixels[i]).to.be.eq(expectedRenderedPixels[p]);
      expect(renderedPixels[i + 1]).to.be.eq(expectedRenderedPixels[p]);
      expect(renderedPixels[i + 2]).to.be.eq(expectedRenderedPixels[p]);
      expect(renderedPixels[i + 3]).to.be.eq(255);
      p++;
    }
  });

  it('should correctly render a little endian signed 16-bit grayscale frame (MONOCHROME2)', () => {
    const width = 3;
    const height = 3;
    // prettier-ignore
    const pixels = Uint8Array.from([
      0x7f, 0xff,   0xff, 0x7f,   0x7f, 0xff,
      0xff, 0x7f,   0x7f, 0xff,   0xff, 0x7f,
      0x7f, 0xff,   0xff, 0x7f,   0x7f, 0xff,
    ]);
    // prettier-ignore
    const expectedRenderedPixels = Uint8Array.from([
      0x00, 0xff, 0x00,
      0xff, 0x00, 0xff,
      0x00, 0xff, 0x00,
    ]);
    const monoImage = createImageFromPixelData(
      width,
      height,
      16,
      16,
      1,
      PixelRepresentation.Signed,
      PhotometricInterpretation.Monochrome2,
      pixels.buffer,
      TransferSyntax.ImplicitVRLittleEndian
    );
    const renderingResult = monoImage.render();
    expect(renderingResult.histograms).to.be.undefined;
    expect(renderingResult.windowLevel).not.to.be.undefined;
    expect(renderingResult.frame).to.be.eq(0);
    expect(renderingResult.width).to.be.eq(width);
    expect(renderingResult.height).to.be.eq(height);
    expect(renderingResult.colorPalette).to.be.eq(StandardColorPalette.Grayscale);

    const renderedPixels = new Uint8Array(renderingResult.pixels);
    for (let i = 0, p = 0; i < 4 * width * height; i += 4) {
      expect(renderedPixels[i]).to.be.eq(expectedRenderedPixels[p]);
      expect(renderedPixels[i + 1]).to.be.eq(expectedRenderedPixels[p]);
      expect(renderedPixels[i + 2]).to.be.eq(expectedRenderedPixels[p]);
      expect(renderedPixels[i + 3]).to.be.eq(255);
      p++;
    }
  });

  it('should correctly render a big endian unsigned 16-bit grayscale frame (MONOCHROME2)', () => {
    const width = 3;
    const height = 3;
    // prettier-ignore
    const pixels = Uint8Array.from([
      0x00, 0x00,   0xff, 0xff,   0x00, 0x00,
      0xff, 0xff,   0x00, 0x00,   0xff, 0xff,
      0x00, 0x00,   0xff, 0xff,   0x00, 0x00,
    ]);
    // prettier-ignore
    const expectedRenderedPixels = Uint8Array.from([
      0x00, 0xff, 0x00,
      0xff, 0x00, 0xff,
      0x00, 0xff, 0x00,
    ]);
    const monoImage = createImageFromPixelData(
      width,
      height,
      16,
      16,
      1,
      PixelRepresentation.Unsigned,
      PhotometricInterpretation.Monochrome2,
      pixels.buffer,
      TransferSyntax.ExplicitVRBigEndian
    );
    const renderingResult = monoImage.render();
    expect(renderingResult.histograms).to.be.undefined;
    expect(renderingResult.windowLevel).not.to.be.undefined;
    expect(renderingResult.frame).to.be.eq(0);
    expect(renderingResult.width).to.be.eq(width);
    expect(renderingResult.height).to.be.eq(height);
    expect(renderingResult.colorPalette).to.be.eq(StandardColorPalette.Grayscale);

    const renderedPixels = new Uint8Array(renderingResult.pixels);
    for (let i = 0, p = 0; i < 4 * width * height; i += 4) {
      expect(renderedPixels[i]).to.be.eq(expectedRenderedPixels[p]);
      expect(renderedPixels[i + 1]).to.be.eq(expectedRenderedPixels[p]);
      expect(renderedPixels[i + 2]).to.be.eq(expectedRenderedPixels[p]);
      expect(renderedPixels[i + 3]).to.be.eq(255);
      p++;
    }
  });

  it('should correctly render a big endian signed 16-bit grayscale frame (MONOCHROME2)', () => {
    const width = 3;
    const height = 3;
    // prettier-ignore
    const pixels = Uint8Array.from([
      0x80, 0x00,   0x7f, 0xff,   0x80, 0x00,
      0x7f, 0xff,   0xff, 0x7f,   0x7f, 0xff,
      0x80, 0x00,   0x7f, 0xff,   0x80, 0x00,
    ]);
    // prettier-ignore
    const expectedRenderedPixels = Uint8Array.from([
      0x00, 0xff, 0x00,
      0xff, 0x7f, 0xff,
      0x00, 0xff, 0x00,
    ]);
    const monoImage = createImageFromPixelData(
      width,
      height,
      16,
      16,
      1,
      PixelRepresentation.Signed,
      PhotometricInterpretation.Monochrome2,
      pixels.buffer,
      TransferSyntax.ExplicitVRBigEndian
    );
    const renderingResult = monoImage.render();
    expect(renderingResult.histograms).to.be.undefined;
    expect(renderingResult.windowLevel).not.to.be.undefined;
    expect(renderingResult.frame).to.be.eq(0);
    expect(renderingResult.width).to.be.eq(width);
    expect(renderingResult.height).to.be.eq(height);
    expect(renderingResult.colorPalette).to.be.eq(StandardColorPalette.Grayscale);

    const renderedPixels = new Uint8Array(renderingResult.pixels);
    for (let i = 0, p = 0; i < 4 * width * height; i += 4) {
      expect(renderedPixels[i]).to.be.eq(expectedRenderedPixels[p]);
      expect(renderedPixels[i + 1]).to.be.eq(expectedRenderedPixels[p]);
      expect(renderedPixels[i + 2]).to.be.eq(expectedRenderedPixels[p]);
      expect(renderedPixels[i + 3]).to.be.eq(255);
      p++;
    }
  });

  it('should correctly render a little endian unsigned 32-bit grayscale frame (MONOCHROME2)', () => {
    const width = 3;
    const height = 3;
    // prettier-ignore
    const pixels = Uint8Array.from([
      0x00, 0x00, 0x00, 0x00,   0xff, 0xff, 0xff, 0xff,   0x00, 0x00, 0x00, 0x00,
      0xff, 0xff, 0xff, 0xff,   0xff, 0xff, 0xff, 0x7f,   0xff, 0xff, 0xff, 0xff,
      0x00, 0x00, 0x00, 0x00,   0xff, 0xff, 0xff, 0xff,   0x00, 0x00, 0x00, 0x00,
    ]);
    // prettier-ignore
    const expectedRenderedPixels = Uint8Array.from([
      0x00, 0xff, 0x00,
      0xff, 0x7f, 0xff,
      0x00, 0xff, 0x00,
    ]);
    const monoImage = createImageFromPixelData(
      width,
      height,
      32,
      32,
      1,
      PixelRepresentation.Unsigned,
      PhotometricInterpretation.Monochrome2,
      pixels.buffer,
      TransferSyntax.ExplicitVRLittleEndian
    );
    const renderingResult = monoImage.render();
    expect(renderingResult.histograms).to.be.undefined;
    expect(renderingResult.windowLevel).not.to.be.undefined;
    expect(renderingResult.frame).to.be.eq(0);
    expect(renderingResult.width).to.be.eq(width);
    expect(renderingResult.height).to.be.eq(height);
    expect(renderingResult.colorPalette).to.be.eq(StandardColorPalette.Grayscale);

    const renderedPixels = new Uint8Array(renderingResult.pixels);
    for (let i = 0, p = 0; i < 4 * width * height; i += 4) {
      expect(renderedPixels[i]).to.be.eq(expectedRenderedPixels[p]);
      expect(renderedPixels[i + 1]).to.be.eq(expectedRenderedPixels[p]);
      expect(renderedPixels[i + 2]).to.be.eq(expectedRenderedPixels[p]);
      expect(renderedPixels[i + 3]).to.be.eq(255);
      p++;
    }
  });

  it('should correctly render a little endian signed 32-bit grayscale frame (MONOCHROME2)', () => {
    const width = 3;
    const height = 3;
    // prettier-ignore
    const pixels = Uint8Array.from([
      0x00, 0x00, 0x00, 0x80,   0xff, 0xff, 0xff, 0x7f,   0x00, 0x00, 0x00, 0x80,
      0xff, 0xff, 0xff, 0x7f,   0x00, 0x00, 0x00, 0x80,   0xff, 0xff, 0xff, 0x7f,
      0x00, 0x00, 0x00, 0x80,   0xff, 0xff, 0xff, 0x7f,   0x00, 0x00, 0x00, 0x80,
    ]);
    // prettier-ignore
    const expectedRenderedPixels = Uint8Array.from([
      0x00, 0xff, 0x00,
      0xff, 0x00, 0xff,
      0x00, 0xff, 0x00,
    ]);
    const monoImage = createImageFromPixelData(
      width,
      height,
      32,
      32,
      1,
      PixelRepresentation.Signed,
      PhotometricInterpretation.Monochrome2,
      pixels.buffer,
      TransferSyntax.ExplicitVRLittleEndian
    );
    const renderingResult = monoImage.render();
    expect(renderingResult.histograms).to.be.undefined;
    expect(renderingResult.windowLevel).not.to.be.undefined;
    expect(renderingResult.frame).to.be.eq(0);
    expect(renderingResult.width).to.be.eq(width);
    expect(renderingResult.height).to.be.eq(height);
    expect(renderingResult.colorPalette).to.be.eq(StandardColorPalette.Grayscale);

    const renderedPixels = new Uint8Array(renderingResult.pixels);
    for (let i = 0, p = 0; i < 4 * width * height; i += 4) {
      expect(renderedPixels[i]).to.be.eq(expectedRenderedPixels[p]);
      expect(renderedPixels[i + 1]).to.be.eq(expectedRenderedPixels[p]);
      expect(renderedPixels[i + 2]).to.be.eq(expectedRenderedPixels[p]);
      expect(renderedPixels[i + 3]).to.be.eq(255);
      p++;
    }
  });

  it('should correctly render a big endian unsigned 32-bit grayscale frame (MONOCHROME2)', () => {
    const width = 3;
    const height = 3;
    // prettier-ignore
    const pixels = Uint8Array.from([
      0x00, 0x00, 0x00, 0x00,   0xff, 0xff, 0xff, 0xff,   0x00, 0x00, 0x00, 0x00,
      0xff, 0xff, 0xff, 0xff,   0xff, 0xff, 0x7f, 0xff,   0xff, 0xff, 0xff, 0xff,
      0x00, 0x00, 0x00, 0x00,   0xff, 0xff, 0xff, 0xff,   0x00, 0x00, 0x00, 0x00,
    ]);
    // prettier-ignore
    const expectedRenderedPixels = Uint8Array.from([
      0x00, 0xff, 0x00,
      0xff, 0x7f, 0xff,
      0x00, 0xff, 0x00,
    ]);
    const monoImage = createImageFromPixelData(
      width,
      height,
      32,
      32,
      1,
      PixelRepresentation.Unsigned,
      PhotometricInterpretation.Monochrome2,
      pixels.buffer,
      TransferSyntax.ExplicitVRBigEndian
    );
    const renderingResult = monoImage.render();
    expect(renderingResult.histograms).to.be.undefined;
    expect(renderingResult.windowLevel).not.to.be.undefined;
    expect(renderingResult.frame).to.be.eq(0);
    expect(renderingResult.width).to.be.eq(width);
    expect(renderingResult.height).to.be.eq(height);
    expect(renderingResult.colorPalette).to.be.eq(StandardColorPalette.Grayscale);

    const renderedPixels = new Uint8Array(renderingResult.pixels);
    for (let i = 0, p = 0; i < 4 * width * height; i += 4) {
      expect(renderedPixels[i]).to.be.eq(expectedRenderedPixels[p]);
      expect(renderedPixels[i + 1]).to.be.eq(expectedRenderedPixels[p]);
      expect(renderedPixels[i + 2]).to.be.eq(expectedRenderedPixels[p]);
      expect(renderedPixels[i + 3]).to.be.eq(255);
      p++;
    }
  });

  it('should correctly render a big endian signed 32-bit grayscale frame (MONOCHROME2)', () => {
    const width = 3;
    const height = 3;
    // prettier-ignore
    const pixels = Uint8Array.from([
      0x00, 0x00, 0x80, 0x00,   0xff, 0xff, 0x7f, 0xff,   0x00, 0x00, 0x80, 0x00,
      0xff, 0xff, 0x7f, 0xff,   0x00, 0x00, 0x80, 0x00,   0xff, 0xff, 0x7f, 0xff,
      0x00, 0x00, 0x80, 0x00,   0xff, 0xff, 0x7f, 0xff,   0x00, 0x00, 0x80, 0x00,
    ]);
    // prettier-ignore
    const expectedRenderedPixels = Uint8Array.from([
      0x00, 0xff, 0x00,
      0xff, 0x00, 0xff,
      0x00, 0xff, 0x00,
    ]);
    const monoImage = createImageFromPixelData(
      width,
      height,
      32,
      32,
      1,
      PixelRepresentation.Signed,
      PhotometricInterpretation.Monochrome2,
      pixels.buffer,
      TransferSyntax.ExplicitVRBigEndian
    );
    const renderingResult = monoImage.render();
    expect(renderingResult.histograms).to.be.undefined;
    expect(renderingResult.windowLevel).not.to.be.undefined;
    expect(renderingResult.frame).to.be.eq(0);
    expect(renderingResult.width).to.be.eq(width);
    expect(renderingResult.height).to.be.eq(height);
    expect(renderingResult.colorPalette).to.be.eq(StandardColorPalette.Grayscale);

    const renderedPixels = new Uint8Array(renderingResult.pixels);
    for (let i = 0, p = 0; i < 4 * width * height; i += 4) {
      expect(renderedPixels[i]).to.be.eq(expectedRenderedPixels[p]);
      expect(renderedPixels[i + 1]).to.be.eq(expectedRenderedPixels[p]);
      expect(renderedPixels[i + 2]).to.be.eq(expectedRenderedPixels[p]);
      expect(renderedPixels[i + 3]).to.be.eq(255);
      p++;
    }
  });

  it('should correctly render a little and big endian float 32-bit grayscale frame (MONOCHROME2)', () => {
    function floatToUint8Array(f, littleEndian) {
      const fArray = new Float32Array(1);
      fArray[0] = f;

      return littleEndian === true
        ? new Uint8Array(fArray.buffer)
        : new Uint8Array(fArray.buffer).reverse();
    }

    [true, false].forEach((littleEndian) => {
      const width = 3;
      const height = 3;
      // prettier-ignore
      const pixels = new Uint8Array([ 
        ...floatToUint8Array(   0.0, littleEndian), ...floatToUint8Array(1024.0, littleEndian), ...floatToUint8Array(   0.0, littleEndian),
        ...floatToUint8Array(1024.0, littleEndian), ...floatToUint8Array(   0.0, littleEndian), ...floatToUint8Array(1024.0, littleEndian),
        ...floatToUint8Array(   0.0, littleEndian), ...floatToUint8Array(1024.0, littleEndian), ...floatToUint8Array(   0.0, littleEndian)
      ]);
      // prettier-ignore
      const expectedRenderedPixels = Uint8Array.from([
        0x00, 0xff, 0x00,
        0xff, 0x00, 0xff,
        0x00, 0xff, 0x00,
      ]);
      const monoImage = new DicomImage(
        {
          Rows: height,
          Columns: width,
          BitsAllocated: 32,
          SamplesPerPixel: 1,
          PhotometricInterpretation: PhotometricInterpretation.Monochrome2,
          FloatPixelData: [pixels],
        },
        littleEndian === true
          ? TransferSyntax.ExplicitVRLittleEndian
          : TransferSyntax.ExplicitVRBigEndian
      );

      const renderingResult = monoImage.render();
      expect(renderingResult.histograms).to.be.undefined;
      expect(renderingResult.windowLevel).not.to.be.undefined;
      expect(renderingResult.frame).to.be.eq(0);
      expect(renderingResult.width).to.be.eq(width);
      expect(renderingResult.height).to.be.eq(height);
      expect(renderingResult.colorPalette).to.be.eq(StandardColorPalette.Grayscale);

      const renderedPixels = new Uint8Array(renderingResult.pixels);
      for (let i = 0, p = 0; i < 4 * width * height; i += 4) {
        expect(renderedPixels[i]).to.be.eq(expectedRenderedPixels[p]);
        expect(renderedPixels[i + 1]).to.be.eq(expectedRenderedPixels[p]);
        expect(renderedPixels[i + 2]).to.be.eq(expectedRenderedPixels[p]);
        expect(renderedPixels[i + 3]).to.be.eq(255);
        p++;
      }
    });
  });

  it('should correctly render an RGB color frame (Interleaved)', () => {
    [
      TransferSyntax.ImplicitVRLittleEndian,
      TransferSyntax.ExplicitVRLittleEndian,
      TransferSyntax.ExplicitVRBigEndian,
    ].forEach((syntax) => {
      const width = 3;
      const height = 3;
      // prettier-ignore
      const pixels = Uint8Array.from([
          0x00, 0x00, 0x00,   0xff, 0xff, 0xff,   0x00, 0x00, 0x00,
          0xff, 0xff, 0xff,   0x7f, 0x7f, 0x7f,   0xff, 0xff, 0xff,
          0x00, 0x00, 0x00,   0xff, 0xff, 0xff,   0x00, 0x00, 0x00,
        ]);
      // prettier-ignore
      const expectedRenderedPixels = Uint8Array.from([
          0x00, 0x00, 0x00,   0xff, 0xff, 0xff,   0x00, 0x00, 0x00,
          0xff, 0xff, 0xff,   0x7f, 0x7f, 0x7f,   0xff, 0xff, 0xff,
          0x00, 0x00, 0x00,   0xff, 0xff, 0xff,   0x00, 0x00, 0x00,
        ]);
      const rgbImage = createImageFromPixelData(
        width,
        height,
        8,
        8,
        3,
        PixelRepresentation.Unsigned,
        PhotometricInterpretation.Rgb,
        pixels.buffer,
        syntax
      );
      const renderingResult = rgbImage.render();
      expect(renderingResult.histograms).to.be.undefined;
      expect(renderingResult.windowLevel).to.be.undefined;
      expect(renderingResult.frame).to.be.eq(0);
      expect(renderingResult.width).to.be.eq(width);
      expect(renderingResult.height).to.be.eq(height);
      expect(renderingResult.colorPalette).to.be.undefined;

      const renderedPixels = new Uint8Array(renderingResult.pixels);
      for (let i = 0, p = 0; i < 4 * width * height; i += 4) {
        expect(renderedPixels[i]).to.be.eq(expectedRenderedPixels[p++]);
        expect(renderedPixels[i + 1]).to.be.eq(expectedRenderedPixels[p++]);
        expect(renderedPixels[i + 2]).to.be.eq(expectedRenderedPixels[p++]);
        expect(renderedPixels[i + 3]).to.be.eq(255);
      }
    });
  });

  it('should correctly render an RGB color frame (Planar)', () => {
    const width = 3;
    const height = 3;
    // prettier-ignore
    const pixels = Uint8Array.from([
      0x00, 0x00, 0x00,   0xff, 0xff, 0xff,   0x00, 0x00, 0x00,
      0xff, 0xff, 0xff,   0x7f, 0x7f, 0x7f,   0xff, 0xff, 0xff,
      0x00, 0x00, 0x00,   0xff, 0xff, 0xff,   0x00, 0x00, 0x00,
    ]);
    // prettier-ignore
    const expectedRenderedPixels = Uint8Array.from([
      0x00, 0x00, 0x00,   0xff, 0xff, 0xff,   0x00, 0x00, 0x00,
      0xff, 0xff, 0xff,   0x7f, 0x7f, 0x7f,   0xff, 0xff, 0xff,
      0x00, 0x00, 0x00,   0xff, 0xff, 0xff,   0x00, 0x00, 0x00,
    ]);
    const planarPixels = new Uint8Array(3 * width * height);
    for (let n = 0; n < width * height; n++) {
      planarPixels[n + width * height * 0] = pixels[n * 3 + 0];
      planarPixels[n + width * height * 1] = pixels[n * 3 + 1];
      planarPixels[n + width * height * 2] = pixels[n * 3 + 2];
    }
    const rgbImage = createImageFromPixelData(
      width,
      height,
      8,
      8,
      3,
      PixelRepresentation.Unsigned,
      PhotometricInterpretation.Rgb,
      planarPixels.buffer,
      TransferSyntax.ImplicitVRLittleEndian
    );
    rgbImage.setElement('PlanarConfiguration', PlanarConfiguration.Planar);

    const renderingResult = rgbImage.render();
    expect(renderingResult.histograms).to.be.undefined;
    expect(renderingResult.windowLevel).to.be.undefined;
    expect(renderingResult.frame).to.be.eq(0);
    expect(renderingResult.width).to.be.eq(width);
    expect(renderingResult.height).to.be.eq(height);
    expect(renderingResult.colorPalette).to.be.undefined;

    const renderedPixels = new Uint8Array(renderingResult.pixels);
    for (let i = 0, p = 0; i < 4 * width * height; i += 4) {
      expect(renderedPixels[i]).to.be.eq(expectedRenderedPixels[p++]);
      expect(renderedPixels[i + 1]).to.be.eq(expectedRenderedPixels[p++]);
      expect(renderedPixels[i + 2]).to.be.eq(expectedRenderedPixels[p++]);
      expect(renderedPixels[i + 3]).to.be.eq(255);
    }
  });

  it('should correctly render an ARGB color frame', () => {
    const width = 3;
    const height = 3;
    // prettier-ignore
    const pixels = Uint8Array.from([
      0x00, 0x00, 0x00, 0x00,   0x00, 0xff, 0xff, 0xff,   0x00, 0x00, 0x00, 0x00,
      0x00, 0xff, 0xff, 0xff,   0x00, 0x7f, 0x7f, 0x7f,   0x00, 0xff, 0xff, 0xff,
      0x00, 0x00, 0x00, 0x00,   0x00, 0xff, 0xff, 0xff,   0x00, 0x00, 0x00, 0x00,
    ]);
    // prettier-ignore
    const expectedRenderedPixels = Uint8Array.from([
      0x00, 0x00, 0x00,   0xff, 0xff, 0xff,   0x00, 0x00, 0x00,
      0xff, 0xff, 0xff,   0x7f, 0x7f, 0x7f,   0xff, 0xff, 0xff,
      0x00, 0x00, 0x00,   0xff, 0xff, 0xff,   0x00, 0x00, 0x00,
    ]);
    const rgbImage = createImageFromPixelData(
      width,
      height,
      8,
      8,
      4,
      PixelRepresentation.Unsigned,
      PhotometricInterpretation.Argb,
      pixels.buffer,
      TransferSyntax.ImplicitVRLittleEndian
    );
    const renderingResult = rgbImage.render();
    expect(renderingResult.histograms).to.be.undefined;
    expect(renderingResult.windowLevel).to.be.undefined;
    expect(renderingResult.frame).to.be.eq(0);
    expect(renderingResult.width).to.be.eq(width);
    expect(renderingResult.height).to.be.eq(height);
    expect(renderingResult.colorPalette).to.be.undefined;

    const renderedPixels = new Uint8Array(renderingResult.pixels);
    for (let i = 0, p = 0; i < 4 * width * height; i += 4) {
      expect(renderedPixels[i]).to.be.eq(expectedRenderedPixels[p++]);
      expect(renderedPixels[i + 1]).to.be.eq(expectedRenderedPixels[p++]);
      expect(renderedPixels[i + 2]).to.be.eq(expectedRenderedPixels[p++]);
      expect(renderedPixels[i + 3]).to.be.eq(255);
    }
  });

  it('should correctly render an CMYK color frame', () => {
    const width = 3;
    const height = 3;
    // prettier-ignore
    const pixels = Uint8Array.from([
      0x00, 0x00, 0x00,   0xff, 0xff, 0xff,   0x00, 0x00, 0x00,
      0xff, 0xff, 0xff,   0x7f, 0x7f, 0x7f,   0xff, 0xff, 0xff,
      0x00, 0x00, 0x00,   0xff, 0xff, 0xff,   0x00, 0x00, 0x00,
    ]);
    // prettier-ignore
    const expectedRenderedPixels = Uint8Array.from([
      0x00, 0x00, 0x00,   0xff, 0xff, 0xff,   0x00, 0x00, 0x00,
      0xff, 0xff, 0xff,   0x7f, 0x7f, 0x7f,   0xff, 0xff, 0xff,
      0x00, 0x00, 0x00,   0xff, 0xff, 0xff,   0x00, 0x00, 0x00,
    ]);
    const cmykData = new Uint8Array(4 * width * height);
    for (let n = 0, p = 0; n < pixels.length; n += 3) {
      const c = 255 - pixels[n];
      const m = 255 - pixels[n + 1];
      const y = 255 - pixels[n + 2];
      const k = Math.min(y, Math.min(c, m));

      cmykData[p++] = c - k;
      cmykData[p++] = m - k;
      cmykData[p++] = y - k;
      cmykData[p++] = k;
    }
    const rgbImage = createImageFromPixelData(
      width,
      height,
      8,
      8,
      4,
      PixelRepresentation.Unsigned,
      PhotometricInterpretation.Cmyk,
      cmykData.buffer,
      TransferSyntax.ImplicitVRLittleEndian
    );
    const renderingResult = rgbImage.render();
    expect(renderingResult.histograms).to.be.undefined;
    expect(renderingResult.windowLevel).to.be.undefined;
    expect(renderingResult.frame).to.be.eq(0);
    expect(renderingResult.width).to.be.eq(width);
    expect(renderingResult.height).to.be.eq(height);
    expect(renderingResult.colorPalette).to.be.undefined;

    const renderedPixels = new Uint8Array(renderingResult.pixels);
    for (let i = 0, p = 0; i < 4 * width * height; i += 4) {
      expect(renderedPixels[i]).to.be.eq(expectedRenderedPixels[p++]);
      expect(renderedPixels[i + 1]).to.be.eq(expectedRenderedPixels[p++]);
      expect(renderedPixels[i + 2]).to.be.eq(expectedRenderedPixels[p++]);
      expect(renderedPixels[i + 3]).to.be.eq(255);
    }
  });

  it('should correctly render a deflated RGB color frame', () => {
    const width = 3;
    const height = 3;
    // prettier-ignore
    const pixels = Uint8Array.from([
      0x00, 0x00, 0x00,   0xff, 0xff, 0xff,   0x00, 0x00, 0x00,
      0xff, 0xff, 0xff,   0x00, 0x00, 0x00,   0xff, 0xff, 0xff,
      0x00, 0x00, 0x00,   0xff, 0xff, 0xff,   0x00, 0x00, 0x00,
    ]);
    // prettier-ignore
    const expectedRenderedPixels = Uint8Array.from([
      0x00, 0x00, 0x00,   0xff, 0xff, 0xff,   0x00, 0x00, 0x00,
      0xff, 0xff, 0xff,   0x00, 0x00, 0x00,   0xff, 0xff, 0xff,
      0x00, 0x00, 0x00,   0xff, 0xff, 0xff,   0x00, 0x00, 0x00,
    ]);

    const arrayBuffers = [];

    // Commented out to test no preamble/prefix patching
    // Preamble
    // arrayBuffers.push(new ArrayBuffer(128));
    // Prefix
    // const prefix = Uint8Array.from([
    //   'D'.charCodeAt(0),
    //   'I'.charCodeAt(0),
    //   'C'.charCodeAt(0),
    //   'M'.charCodeAt(0),
    // ]);
    // arrayBuffers.push(prefix.buffer.slice(prefix.byteOffset, prefix.byteOffset + prefix.byteLength));

    // Meta info header
    const metaElements = new DicomImage(
      {
        _vrMap: { FileMetaInformationVersion: 'OB' },
        // length: 2(GROUP) + 2(ELEMENT) + 2(VR) + 2(RESERVED) + 4(VL) + X(EVEN DATA LENGTH)
        FileMetaInformationGroupLength: 162,
        FileMetaInformationVersion: new Uint8Array([0, 1]).buffer,
        MediaStorageSOPClassUID: '1.2.840.10008.5.1.4.1.1.7',
        MediaStorageSOPInstanceUID: '1.2.3.4.5.6.7.8.9.1',
        TransferSyntaxUID: TransferSyntax.DeflatedExplicitVRLittleEndian,
        ImplementationClassUID: '1.2.826.0.1.3680043.10.854',
        ImplementationVersionName: 'DCMJS-IMAGING',
      },
      TransferSyntax.ExplicitVRLittleEndian
    );
    arrayBuffers.push(metaElements.getDenaturalizedDataset());

    // Deflated dataset
    const rgbImage = createImageFromPixelData(
      width,
      height,
      8,
      8,
      3,
      PixelRepresentation.Unsigned,
      // Commented out to test no photometric interpretation patching
      undefined, // PhotometricInterpretation.Rgb,
      pixels.buffer,
      TransferSyntax.ExplicitVRLittleEndian
    );
    const rgbElements = rgbImage.getElements();
    rgbElements._vrMap = { PixelData: 'OB' };
    const deflatedBuffer = pako.deflateRaw(rgbImage.getDenaturalizedDataset());
    arrayBuffers.push(
      deflatedBuffer.buffer.slice(
        deflatedBuffer.byteOffset,
        deflatedBuffer.byteOffset + deflatedBuffer.byteLength
      )
    );

    const concatenatedArrayBuffer = arrayBuffers.reduce((pBuf, cBuf, i) => {
      if (i === 0) {
        return pBuf;
      }
      const tmp = new Uint8Array(pBuf.byteLength + cBuf.byteLength);
      tmp.set(new Uint8Array(pBuf), 0);
      tmp.set(new Uint8Array(cBuf), pBuf.byteLength);

      return tmp.buffer;
    }, arrayBuffers[0]);

    const image = new DicomImage(concatenatedArrayBuffer);
    const renderingResult = image.render();
    expect(renderingResult.histograms).to.be.undefined;
    expect(renderingResult.windowLevel).to.be.undefined;
    expect(renderingResult.frame).to.be.eq(0);
    expect(renderingResult.width).to.be.eq(width);
    expect(renderingResult.height).to.be.eq(height);
    expect(renderingResult.colorPalette).to.be.undefined;

    const renderedPixels = new Uint8Array(renderingResult.pixels);
    for (let i = 0, p = 0; i < 4 * width * height; i += 4) {
      expect(renderedPixels[i]).to.be.eq(expectedRenderedPixels[p++]);
      expect(renderedPixels[i + 1]).to.be.eq(expectedRenderedPixels[p++]);
      expect(renderedPixels[i + 2]).to.be.eq(expectedRenderedPixels[p++]);
      expect(renderedPixels[i + 3]).to.be.eq(255);
    }
  });

  it('should correctly render a PALETTE COLOR color frame', () => {
    const width = 3;
    const height = 3;
    // prettier-ignore
    const pixels = Uint8Array.from([
      0x00, 0xff, 0x00,
      0xff, 0x00, 0xff,
      0x00, 0xff, 0x00,
    ]);
    // prettier-ignore
    const expectedRenderedPixels = Uint8Array.from([
      0x00, 0x00, 0x00,   0xff, 0xff, 0xff,   0x00, 0x00, 0x00,
      0xff, 0xff, 0xff,   0x00, 0x00, 0x00,   0xff, 0xff, 0xff,
      0x00, 0x00, 0x00,   0xff, 0xff, 0xff,   0x00, 0x00, 0x00,
    ]);
    const lut = [];
    for (let i = 0; i < 256; i++) {
      lut.push(i);
    }
    const paletteImage = new DicomImage(
      {
        Rows: height,
        Columns: width,
        BitsStored: 8,
        BitsAllocated: 8,
        SamplesPerPixel: 1,
        PixelRepresentation: PixelRepresentation.Unsigned,
        PhotometricInterpretation: PhotometricInterpretation.PaletteColor,
        PixelData: [pixels.buffer],
        RedPaletteColorLookupTableDescriptor: [256, 0, 8],
        RedPaletteColorLookupTableData: [Uint8Array.from(lut).buffer],
        GreenPaletteColorLookupTableData: [Uint8Array.from(lut).buffer],
        BluePaletteColorLookupTableData: [Uint8Array.from(lut).buffer],
      },
      TransferSyntax.ImplicitVRLittleEndian
    );
    const renderingResult = paletteImage.render();
    expect(renderingResult.histograms).to.be.undefined;
    expect(renderingResult.windowLevel).to.be.undefined;
    expect(renderingResult.frame).to.be.eq(0);
    expect(renderingResult.width).to.be.eq(width);
    expect(renderingResult.height).to.be.eq(height);
    expect(renderingResult.colorPalette).to.be.undefined;

    const renderedPixels = new Uint8Array(renderingResult.pixels);
    for (let i = 0, p = 0; i < 4 * width * height; i += 4) {
      expect(renderedPixels[i]).to.be.eq(expectedRenderedPixels[p++]);
      expect(renderedPixels[i + 1]).to.be.eq(expectedRenderedPixels[p++]);
      expect(renderedPixels[i + 2]).to.be.eq(expectedRenderedPixels[p++]);
      expect(renderedPixels[i + 3]).to.be.eq(255);
    }
  });

  it('should correctly render with StandardColorPalettes', () => {
    const width = 3;
    const height = 3;
    // prettier-ignore
    const pixels = Uint8Array.from([
      0x00, 0x7f, 0x00,
      0xff, 0x00, 0xff,
      0x00, 0x7f, 0x00,
    ]);
    // prettier-ignore
    const expectedRenderedPixels = Uint8Array.from([
      0x00, 0x7f, 0x00,
      0xff, 0x00, 0xff,
      0x00, 0x7f, 0x00,
    ]);

    const colorPalettes = Object.assign({}, StandardColorPalette);
    delete colorPalettes.Grayscale;

    const colorPaletteKeys = Object.keys(colorPalettes);
    const randomColorPalette =
      colorPalettes[colorPaletteKeys[(colorPaletteKeys.length * Math.random()) << 0]];

    const monoImage = createImageFromPixelData(
      width,
      height,
      8,
      8,
      1,
      PixelRepresentation.Unsigned,
      PhotometricInterpretation.Monochrome2,
      pixels.buffer,
      TransferSyntax.ImplicitVRLittleEndian
    );
    const renderingResult = monoImage.render({
      windowLevel: new WindowLevel(255, 255 / 2),
      colorPalette: randomColorPalette,
    });
    expect(renderingResult.histograms).to.be.undefined;
    expect(renderingResult.windowLevel).not.to.be.undefined;
    expect(renderingResult.windowLevel.getWindow()).to.be.eq(255);
    expect(renderingResult.windowLevel.getLevel()).to.be.eq(255 / 2);
    expect(renderingResult.frame).to.be.eq(0);
    expect(renderingResult.width).to.be.eq(width);
    expect(renderingResult.height).to.be.eq(height);
    expect(renderingResult.colorPalette).to.be.eq(randomColorPalette);

    const colorPalette = ColorPalette.getColorPaletteStandard(randomColorPalette);
    const renderedPixels = new Uint8Array(renderingResult.pixels);
    for (let i = 0, p = 0; i < 4 * width * height; i += 4) {
      expect(
        (renderedPixels[i + 3] << 0x18) |
          (renderedPixels[i] << 0x10) |
          (renderedPixels[i + 1] << 0x08) |
          renderedPixels[i + 2]
      ).to.be.eq(colorPalette[expectedRenderedPixels[p]]);
      p++;
    }
  });

  it('should correctly render an uncompressed icon image', () => {
    const width = 3;
    const height = 3;
    // prettier-ignore
    const pixels = Uint8Array.from([
      0x00, 0x00,   0xff, 0xff,   0x00, 0x00,
      0xff, 0xff,   0xff, 0x7f,   0xff, 0xff,
      0x00, 0x00,   0xff, 0xff,   0x00, 0x00,
    ]);
    // prettier-ignore
    const iconPixels = Uint8Array.from([
      0x00, 0x7f, 0x00,
      0xff, 0x00, 0xff,
      0x00, 0x7f, 0x00,
    ]);
    // prettier-ignore
    const expectedRenderedPixels = Uint8Array.from([
      0x00, 0xff, 0x00,
      0xff, 0x7f, 0xff,
      0x00, 0xff, 0x00,
    ]);
    // prettier-ignore
    const expectedRenderedIconPixels = Uint8Array.from([  
      0x00, 0x7f, 0x00,
      0xff, 0x00, 0xff,
      0x00, 0x7f, 0x00,
    ]);
    const monoImage = createImageFromPixelData(
      width,
      height,
      16,
      16,
      1,
      PixelRepresentation.Unsigned,
      PhotometricInterpretation.Monochrome2,
      pixels.buffer,
      TransferSyntax.ImplicitVRLittleEndian
    );
    monoImage.setElement('IconImageSequence', [
      {
        Rows: width,
        Columns: width,
        BitsStored: 8,
        BitsAllocated: 8,
        SamplesPerPixel: 1,
        PixelRepresentation: PixelRepresentation.Unsigned,
        PhotometricInterpretation: PhotometricInterpretation.Monochrome2,
        PixelData: [iconPixels],
      },
    ]);

    const iconRenderingResult = monoImage.renderIcon();
    expect(iconRenderingResult.histograms).to.be.undefined;
    expect(iconRenderingResult.windowLevel).not.to.be.undefined;
    expect(iconRenderingResult.frame).to.be.eq(0);
    expect(iconRenderingResult.width).to.be.eq(width);
    expect(iconRenderingResult.height).to.be.eq(height);
    expect(iconRenderingResult.colorPalette).to.be.eq(StandardColorPalette.Grayscale);

    const iconRenderedPixels = new Uint8Array(iconRenderingResult.pixels);
    for (let i = 0, p = 0; i < 4 * width * height; i += 4) {
      expect(iconRenderedPixels[i]).to.be.eq(expectedRenderedIconPixels[p]);
      expect(iconRenderedPixels[i + 1]).to.be.eq(expectedRenderedIconPixels[p]);
      expect(iconRenderedPixels[i + 2]).to.be.eq(expectedRenderedIconPixels[p]);
      expect(iconRenderedPixels[i + 3]).to.be.eq(255);
      p++;
    }

    const renderingResult = monoImage.render();
    expect(renderingResult.histograms).to.be.undefined;
    expect(renderingResult.windowLevel).not.to.be.undefined;
    expect(renderingResult.frame).to.be.eq(0);
    expect(renderingResult.width).to.be.eq(width);
    expect(renderingResult.height).to.be.eq(height);
    expect(renderingResult.colorPalette).to.be.eq(StandardColorPalette.Grayscale);

    const renderedPixels = new Uint8Array(renderingResult.pixels);
    for (let i = 0, p = 0; i < 4 * width * height; i += 4) {
      expect(renderedPixels[i]).to.be.eq(expectedRenderedPixels[p]);
      expect(renderedPixels[i + 1]).to.be.eq(expectedRenderedPixels[p]);
      expect(renderedPixels[i + 2]).to.be.eq(expectedRenderedPixels[p]);
      expect(renderedPixels[i + 3]).to.be.eq(255);
      p++;
    }
  });
});
