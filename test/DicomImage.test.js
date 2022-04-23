const DicomImage = require('./../src/DicomImage');
const {
  TransferSyntax,
  PlanarConfiguration,
  PhotometricInterpretation,
  PixelRepresentation,
  StandardColorPalette,
} = require('./../src/Constants');
const WindowLevel = require('../src/WindowLevel');
const ColorPalette = require('../src/ColorPalette');

const { createImageFromPixelData } = require('./utils');

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
  });

  it('should throw for not renderable transfer syntax UID', () => {
    const image = new DicomImage(
      {
        PixelData: [Uint8Array.from([1, 2, 3, 4, 5]).buffer],
      },
      TransferSyntax.JpegLsLossless
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

  it('should correctly render an 8-bit grayscale frame (MONOCHROME1)', () => {
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
      TransferSyntax.ImplicitVRLittleEndian
    );
    const renderingResult = monoImage.render({ windowLevel: new WindowLevel(255, 255 / 2) });
    expect(renderingResult.histograms).to.be.undefined;
    expect(renderingResult.windowLevel).not.to.be.undefined;
    expect(renderingResult.windowLevel.getWindow()).to.be.eq(255);
    expect(renderingResult.windowLevel.getLevel()).to.be.eq(255 / 2);
    expect(renderingResult.frame).to.be.eq(0);
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

  it('should correctly render an 8-bit grayscale frame (MONOCHROME2)', () => {
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
      TransferSyntax.ImplicitVRLittleEndian
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

  it('should correctly render an 8-bit grayscale multiframe (MONOCHROME2)', () => {
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
    const expectedRenderedPixels1 = Uint8Array.from([
      0x00, 0x7f, 0x00,
      0xff, 0x00, 0xff,
      0x00, 0x7f, 0x00,
    ]);
    const expectedRenderedPixels2 = Uint8Array.from([
      0xff, 0x00, 0xff, 0x00, 0x7f, 0x00, 0xff, 0x00, 0xff,
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
      TransferSyntax.ImplicitVRLittleEndian
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
      expect(renderedPixels1[i]).to.be.eq(expectedRenderedPixels1[p]);
      expect(renderedPixels1[i + 1]).to.be.eq(expectedRenderedPixels1[p]);
      expect(renderedPixels1[i + 2]).to.be.eq(expectedRenderedPixels1[p]);
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
      expect(renderedPixels2[i]).to.be.eq(expectedRenderedPixels2[p]);
      expect(renderedPixels2[i + 1]).to.be.eq(expectedRenderedPixels2[p]);
      expect(renderedPixels2[i + 2]).to.be.eq(expectedRenderedPixels2[p]);
      expect(renderedPixels2[i + 3]).to.be.eq(255);
      p++;
    }
  });

  it('should correctly render a little endian unsigned 16-bit grayscale frame (MONOCHROME2)', () => {
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
      TransferSyntax.ImplicitVRLittleEndian
    );
    const renderingResult = monoImage.render();
    expect(renderingResult.histograms).to.be.undefined;
    expect(renderingResult.windowLevel).not.to.be.undefined;
    expect(renderingResult.frame).to.be.eq(0);
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
      TransferSyntax.ExplicitVRBigEndian
    );
    const renderingResult = monoImage.render();
    expect(renderingResult.histograms).to.be.undefined;
    expect(renderingResult.windowLevel).not.to.be.undefined;
    expect(renderingResult.frame).to.be.eq(0);
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

  it('should correctly render an RGB color frame', () => {
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
    const rgbImage = createImageFromPixelData(
      width,
      height,
      8,
      8,
      3,
      PixelRepresentation.Unsigned,
      PhotometricInterpretation.Rgb,
      pixels.buffer,
      TransferSyntax.ImplicitVRLittleEndian
    );
    const renderingResult = rgbImage.render();
    expect(renderingResult.histograms).to.be.undefined;
    expect(renderingResult.windowLevel).to.be.undefined;
    expect(renderingResult.frame).to.be.eq(0);
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
});
