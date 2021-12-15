const DicomImage = require('./../src/DicomImage');
const {
  Pixel,
  PixelPipeline,
  GrayscalePixelPipeline,
  ColorPixelPipeline,
  PixelConverter,
} = require('./../src/Pixel');
const {
  TransferSyntax,
  PlanarConfiguration,
  PhotometricInterpretation,
  PixelRepresentation,
} = require('./../src/Constants');

const { arrayBuffersAreEqual } = require('./utils');

const chai = require('chai');
const expect = chai.expect;

describe('Pixel', () => {
  it('should correctly construct a Pixel from DicomImage', () => {
    const rows = 512;
    const columns = 256;
    const numberOfFrames = 15;
    const bitsStored = 12;
    const bitsAllocated = 16;
    const highBit = 11;
    const samplesPerPixel = 1;
    const pixelRepresentation = PixelRepresentation.Unsigned;
    const planarConfiguration = PlanarConfiguration.Interleaved;
    const photometricInterpretation = PhotometricInterpretation.Monochrome2;
    const rescaleSlope = 1.1;
    const rescaleIntercept = 2.2;
    const pixelData = [Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 0]).buffer];

    const image = new DicomImage(
      {
        Rows: rows,
        Columns: columns,
        NumberOfFrames: numberOfFrames,
        BitsStored: bitsStored,
        BitsAllocated: bitsAllocated,
        HighBit: highBit,
        SamplesPerPixel: samplesPerPixel,
        PixelRepresentation: pixelRepresentation,
        PlanarConfiguration: planarConfiguration,
        PhotometricInterpretation: photometricInterpretation,
        RescaleSlope: rescaleSlope,
        RescaleIntercept: rescaleIntercept,
        PixelData: pixelData,
      },
      TransferSyntax.ImplicitVRLittleEndian
    );
    const pixel = new Pixel(image);

    expect(pixel.getTransferSyntaxUid()).to.be.eq(TransferSyntax.ImplicitVRLittleEndian);
    expect(pixel.getNumberOfFrames()).to.be.eq(numberOfFrames);
    expect(pixel.getHeight()).to.be.eq(rows);
    expect(pixel.getWidth()).to.be.eq(columns);
    expect(pixel.getBitsStored()).to.be.eq(bitsStored);
    expect(pixel.getBitsAllocated()).to.be.eq(bitsAllocated);
    expect(pixel.getHighBit()).to.be.eq(highBit);
    expect(pixel.getSamplesPerPixel()).to.be.eq(samplesPerPixel);
    expect(pixel.getPixelRepresentation()).to.be.eq(pixelRepresentation);
    expect(pixel.getPlanarConfiguration()).to.be.eq(planarConfiguration);
    expect(pixel.getPhotometricInterpretation()).to.be.eq(photometricInterpretation);
    expect(pixel.getRescaleSlope()).to.be.eq(rescaleSlope);
    expect(pixel.getRescaleIntercept()).to.be.eq(rescaleIntercept);
    expect(pixel.getMinimumPixelValue()).to.be.eq(0);
    expect(pixel.getMaximumPixelValue()).to.be.eq((1 << pixel.getBitsStored()) - 1);
    expect(pixel.isPlanar()).to.be.eq(false);
    expect(arrayBuffersAreEqual(pixel.getPixelData()[0], pixelData[0])).to.be.true;
  });

  it('should throw for missing rendering parameters', () => {
    const image = new DicomImage(
      {
        NumberOfFrames: 1,
        PhotometricInterpretation: PhotometricInterpretation.Monochrome1,
        PixelData: [Uint8Array.from([1, 2, 3, 4, 5]).buffer],
      },
      TransferSyntax.ImplicitVRLittleEndian
    );
    expect(() => {
      image.render(0);
    }).to.throw();

    const image2 = new DicomImage(
      {
        PixelData: [Uint8Array.from([1, 2, 3, 4, 5]).buffer],
        PhotometricInterpretation: PhotometricInterpretation.Monochrome1,
      },
      TransferSyntax.ImplicitVRLittleEndian
    );
    expect(() => {
      image2.render();
    }).to.throw();

    const image3 = new DicomImage(
      {
        Rows: 128,
        Columns: 128,
        PhotometricInterpretation: PhotometricInterpretation.Monochrome1,
        PixelData: [Uint8Array.from([1, 2, 3, 4, 5]).buffer],
      },
      TransferSyntax.ImplicitVRLittleEndian
    );
    expect(() => {
      image3.render();
    }).to.throw();

    const image4 = new DicomImage(
      {
        Rows: 128,
        Columns: 128,
        BitsAllocated: 8,
        BitsStored: 8,
        PhotometricInterpretation: PhotometricInterpretation.Monochrome1,
        PixelData: [Uint8Array.from([1, 2, 3, 4, 5]).buffer],
      },
      TransferSyntax.ImplicitVRLittleEndian
    );
    expect(() => {
      image4.render();
    }).to.throw();

    const image5 = new DicomImage(
      {
        PhotometricInterpretation: PhotometricInterpretation.Monochrome1,
      },
      TransferSyntax.ImplicitVRLittleEndian
    );
    expect(() => {
      image5.render();
    }).to.throw();
  });

  it('should correctly construct a PixelPipeline from Pixel', () => {
    const pixel1 = new Pixel(
      new DicomImage(
        {
          Rows: 5,
          Columns: 5,
          BitsStored: 8,
          BitsAllocated: 8,
          SamplesPerPixel: 1,
          PhotometricInterpretation: PhotometricInterpretation.Monochrome1,
          PixelData: [Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 0]).buffer],
        },
        TransferSyntax.ImplicitVRLittleEndian
      )
    );
    const pipeline1 = PixelPipeline.create(pixel1, 0);
    expect(pipeline1).to.be.instanceof(GrayscalePixelPipeline);

    const pixel2 = new Pixel(
      new DicomImage(
        {
          Rows: 5,
          Columns: 5,
          BitsStored: 12,
          BitsAllocated: 16,
          SamplesPerPixel: 1,
          PhotometricInterpretation: PhotometricInterpretation.Monochrome2,
          PixelData: [
            Uint16Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0]).buffer,
          ],
        },
        TransferSyntax.ImplicitVRLittleEndian
      )
    );
    const pipeline2 = PixelPipeline.create(pixel2, 0);
    expect(pipeline2).to.be.instanceof(GrayscalePixelPipeline);

    const pixel3 = new Pixel(
      new DicomImage(
        {
          Rows: 5,
          Columns: 5,
          BitsStored: 8,
          BitsAllocated: 8,
          SamplesPerPixel: 3,
          PhotometricInterpretation: PhotometricInterpretation.Rgb,
          PixelData: [
            Uint8Array.from([
              1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
              0,
            ]).buffer,
          ],
        },
        TransferSyntax.ImplicitVRLittleEndian
      )
    );
    const pipeline3 = PixelPipeline.create(pixel3, 0);
    expect(pipeline3).to.be.instanceof(ColorPixelPipeline);
  });

  it('should correctly convert pixels from planar to interleaved', () => {
    const width = 3;
    const height = 3;
    // prettier-ignore
    const planarPixels = Uint8Array.from([
      0x00, 0xff, 0x00, 0xff, 0x00, 0xff, 0x00, 0xff, 0x00,
      0x00, 0xff, 0x00, 0xff, 0x00, 0xff, 0x00, 0xff, 0x00,
      0x00, 0xff, 0x00, 0xff, 0x00, 0xff, 0x00, 0xff, 0x00,
    ]);
    // prettier-ignore
    const expectedInterleavedPixels = Uint8Array.from([
      0x00, 0x00, 0x00,   0xff, 0xff, 0xff,   0x00, 0x00, 0x00,
      0xff, 0xff, 0xff,   0x00, 0x00, 0x00,   0xff, 0xff, 0xff,
      0x00, 0x00, 0x00,   0xff, 0xff, 0xff,   0x00, 0x00, 0x00,
    ]);
    const convertedInterleavedPixels = PixelConverter.planarToInterleaved24(planarPixels);
    for (let i = 0; i < 3 * width * height; i++) {
      expect(convertedInterleavedPixels[i]).to.be.eq(expectedInterleavedPixels[i]);
    }
  });

  it('should correctly convert pixels from YBR_FULL to RGB', () => {
    const width = 3;
    const height = 3;
    // prettier-ignore
    const rgbPixels = Uint8Array.from([
      0x00, 0x00, 0x00,   0xff, 0xff, 0xff,   0x00, 0x00, 0x00,
      0xff, 0xff, 0xff,   0x00, 0x00, 0x00,   0xff, 0xff, 0xff,
      0x00, 0x00, 0x00,   0xff, 0xff, 0xff,   0x00, 0x00, 0x00,
    ]);
    // prettier-ignore
    const expectedRgbPixels = Uint8Array.from([
      0x00, 0x00, 0x00,   0xff, 0xff, 0xff,   0x00, 0x00, 0x00,
      0xff, 0xff, 0xff,   0x00, 0x00, 0x00,   0xff, 0xff, 0xff,
      0x00, 0x00, 0x00,   0xff, 0xff, 0xff,   0x00, 0x00, 0x00,
    ]);
    const ybrFullData = new Uint8Array(rgbPixels.length);
    for (let n = 0; n < rgbPixels.length; n += 3) {
      const r = rgbPixels[n];
      const g = rgbPixels[n + 1];
      const b = rgbPixels[n + 2];

      ybrFullData[n] = 0.299 * r + 0.587 * g + 0.114 * b;
      ybrFullData[n + 1] = -0.168736 * r - 0.331264 * g + 0.5 * b + 128;
      ybrFullData[n + 2] = 0.5 * r - 0.418688 * g - 0.081312 * b + 128;
    }
    const convertedRgbPixels = PixelConverter.ybrFullToRgb(ybrFullData);
    for (let i = 0; i < 3 * width * height; i++) {
      expect(convertedRgbPixels[i]).to.be.eq(expectedRgbPixels[i]);
    }
  });
});
