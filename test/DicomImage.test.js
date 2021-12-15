const DicomImage = require('./../src/DicomImage');
const {
  TransferSyntax,
  PlanarConfiguration,
  PhotometricInterpretation,
  PixelRepresentation,
} = require('./../src/Constants');

const { createImageFromPixelData } = require('./utils');

const chai = require('chai');
const { WindowLevel } = require('../src');
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
    expect(image3.getRenderOverlays()).to.be.eq(true);
  });

  it('should throw for not renderable transfer syntax UID', () => {
    const image = new DicomImage(
      {
        PixelData: [Uint8Array.from([1, 2, 3, 4, 5]).buffer],
      },
      TransferSyntax.Jpeg2000Lossless
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
      image.render(2);
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
      image.render(0, 'ww/wl');
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
    const renderedPixels = new Uint8Array(monoImage.render(0, new WindowLevel(255, 255 / 2)));
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
    const renderedPixels = new Uint8Array(monoImage.render(0, new WindowLevel(255, 255 / 2)));
    for (let i = 0, p = 0; i < 4 * width * height; i += 4) {
      expect(renderedPixels[i]).to.be.eq(expectedRenderedPixels[p]);
      expect(renderedPixels[i + 1]).to.be.eq(expectedRenderedPixels[p]);
      expect(renderedPixels[i + 2]).to.be.eq(expectedRenderedPixels[p]);
      expect(renderedPixels[i + 3]).to.be.eq(255);
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
    const renderedPixels = new Uint8Array(monoImage.render());
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
      0x7F, 0xFF,   0xFF, 0x7F,   0x7F, 0xFF,
      0xFF, 0x7F,   0x7F, 0xFF,   0xFF, 0x7F,
      0x7F, 0xFF,   0xFF, 0x7F,   0x7F, 0xFF,
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
    const renderedPixels = new Uint8Array(monoImage.render());
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
      0xFF, 0x7F,   0x7F, 0xFF,   0xFF, 0x7F,
      0x7F, 0xFF,   0xFF, 0x7F,   0x7F, 0xFF,
      0xFF, 0x7F,   0x7F, 0xFF,   0xFF, 0x7F,
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
    const renderedPixels = new Uint8Array(monoImage.render());
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
    const renderedPixels = new Uint8Array(rgbImage.render());
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
    const renderedPixels = new Uint8Array(paletteImage.render());
    for (let i = 0, p = 0; i < 4 * width * height; i += 4) {
      expect(renderedPixels[i]).to.be.eq(expectedRenderedPixels[p++]);
      expect(renderedPixels[i + 1]).to.be.eq(expectedRenderedPixels[p++]);
      expect(renderedPixels[i + 2]).to.be.eq(expectedRenderedPixels[p++]);
      expect(renderedPixels[i + 3]).to.be.eq(255);
    }
  });
});
