const DicomImage = require('./../src/DicomImage');
const WindowLevel = require('./../src/WindowLevel');
const {
  LutPipeline,
  GrayscaleLutPipeline,
  RgbColorLutPipeline,
  PaletteColorLutPipeline,
  Lut,
  RescaleLut,
  VoiLut,
  InvertLut,
  OutputLut,
  CompositeLut,
  PreCalculatedLut,
  CachedLut,
} = require('./../src/Lut');
const { Pixel } = require('./../src/Pixel');
const ColorPalette = require('./../src/ColorPalette');
const { TransferSyntax, PhotometricInterpretation } = require('./../src/Constants');

const { getRandomInteger, getRandomNumber } = require('./utils');

const chai = require('chai');
const expect = chai.expect;

describe('Lut', () => {
  it('should throw in case LUT methods are not implemented', () => {
    class SubclassedLut extends Lut {
      constructor() {
        super();
      }
    }
    const subclassedLut = new SubclassedLut();

    expect(() => {
      subclassedLut.isValid();
    }).to.throw();
    expect(() => {
      subclassedLut.getMinimumOutputValue();
    }).to.throw();
    expect(() => {
      subclassedLut.getMaximumOutputValue();
    }).to.throw();
    expect(() => {
      subclassedLut.recalculate();
    }).to.throw();
    expect(() => {
      subclassedLut.getValue(undefined);
    }).to.throw();
  });

  it('should return the correct values for RescaleLut', () => {
    const minValue = getRandomInteger(-65536, 0);
    const maxValue = getRandomInteger(0, 65536);
    const slope = getRandomNumber(0.0, 5.0);
    const intercept = getRandomNumber(0.0, 5.0);
    const lut = new RescaleLut(minValue, maxValue, slope, intercept);

    expect(lut.getMinimumOutputValue()).to.be.eq(Math.trunc(minValue * slope + intercept));
    expect(lut.getMaximumOutputValue()).to.be.eq(Math.trunc(maxValue * slope + intercept));
    expect(lut.getRescaleSlope()).to.be.eq(slope);
    expect(lut.getRescaleIntercept()).to.be.eq(intercept);
    for (let i = minValue; i <= maxValue; i++) {
      expect(lut.getValue(i)).to.be.eq(Math.trunc(i * slope + intercept));
    }
  });

  it('should return the correct values for VoiLut (LINEAR)', () => {
    const random = getRandomInteger(-65536, 65536);
    const windowLevel = new WindowLevel(random, random / 2);
    const lut = new VoiLut(windowLevel);
    lut.recalculate();

    expect(lut.getMinimumOutputValue()).to.be.eq(0);
    expect(lut.getMaximumOutputValue()).to.be.eq(255);

    const windowLevel2 = lut.getWindowLevel();
    expect(windowLevel2.getWindow()).to.be.eq(random);
    expect(windowLevel2.getLevel()).to.be.eq(random / 2);

    const windowCenterMin05 = windowLevel.getLevel() - 0.5;
    const windowWidthMin1 = windowLevel.getWindow() - 1;

    for (let i = -random; i <= random; i++) {
      const value = Math.trunc(
        ((i - windowCenterMin05) / windowWidthMin1 + 0.5) * lut.getMaximumOutputValue() +
          lut.getMinimumOutputValue()
      );
      if (value <= lut.getMinimumOutputValue()) {
        expect(lut.getValue(i)).to.be.eq(lut.getMinimumOutputValue());
        continue;
      }
      if (value > lut.getMaximumOutputValue()) {
        expect(lut.getValue(i)).to.be.eq(lut.getMaximumOutputValue());
        continue;
      }

      expect(lut.getValue(i)).to.be.eq(value);
    }
  });

  it('should return the correct values for VoiLut (LINEAR_EXACT)', () => {
    const random = getRandomInteger(-65536, 65536);
    const windowLevel = new WindowLevel(random, random / 2);
    const lut = new VoiLut(windowLevel, 'LINEAR_EXACT');
    lut.recalculate();

    expect(lut.getMinimumOutputValue()).to.be.eq(0);
    expect(lut.getMaximumOutputValue()).to.be.eq(255);

    const windowLevel2 = lut.getWindowLevel();
    expect(windowLevel2.getWindow()).to.be.eq(random);
    expect(windowLevel2.getLevel()).to.be.eq(random / 2);

    for (let i = -random; i <= random; i++) {
      const value = Math.trunc(
        ((i - windowLevel2.getLevel()) / windowLevel2.getWindow()) * lut.getMaximumOutputValue() +
          lut.getMinimumOutputValue()
      );
      if (value <= lut.getMinimumOutputValue()) {
        expect(lut.getValue(i)).to.be.eq(lut.getMinimumOutputValue());
        continue;
      }
      if (value > lut.getMaximumOutputValue()) {
        expect(lut.getValue(i)).to.be.eq(lut.getMaximumOutputValue());
        continue;
      }

      expect(lut.getValue(i)).to.be.eq(value);
    }
  });

  it('should return the correct values for VoiLut (SIGMOID)', () => {
    const random = getRandomInteger(-65536, 65536);
    const windowLevel = new WindowLevel(random, random / 2);
    const lut = new VoiLut(windowLevel, 'SIGMOID');
    lut.recalculate();

    expect(lut.getMinimumOutputValue()).to.be.eq(0);
    expect(lut.getMaximumOutputValue()).to.be.eq(255);

    const windowLevel2 = lut.getWindowLevel();
    expect(windowLevel2.getWindow()).to.be.eq(random);
    expect(windowLevel2.getLevel()).to.be.eq(random / 2);

    for (let i = -random; i <= random; i++) {
      const value = Math.trunc(
        lut.getMaximumOutputValue() /
          (1.0 + Math.exp(-4.0 * ((i - windowLevel2.getLevel()) / windowLevel2.getWindow())))
      );
      if (value <= lut.getMinimumOutputValue()) {
        expect(lut.getValue(i)).to.be.eq(lut.getMinimumOutputValue());
        continue;
      }
      if (value > lut.getMaximumOutputValue()) {
        expect(lut.getValue(i)).to.be.eq(lut.getMaximumOutputValue());
        continue;
      }

      expect(lut.getValue(i)).to.be.eq(value);
    }
  });

  it('should return the correct values for InvertLut', () => {
    const minValue = getRandomInteger(-65536, 0);
    const maxValue = getRandomInteger(0, 65536);
    const lut = new InvertLut(minValue, maxValue);

    expect(lut.getMinimumOutputValue()).to.be.eq(minValue);
    expect(lut.getMaximumOutputValue()).to.be.eq(maxValue);
    for (let i = minValue; i <= maxValue; i++) {
      expect(lut.getValue(i)).to.be.eq(Math.trunc(maxValue - i));
    }
  });

  it('should return the correct values for OutputLut', () => {
    const colorPalette = ColorPalette.getColorPaletteMonochrome2();
    const lut = new OutputLut(colorPalette);
    lut.recalculate();

    expect(lut.getMinimumOutputValue()).to.be.eq(Number.MIN_SAFE_INTEGER);
    expect(lut.getMaximumOutputValue()).to.be.eq(Number.MAX_SAFE_INTEGER);
    for (let i = 0; i < 256; i++) {
      expect(lut.getValue(i)).to.be.eq(colorPalette[i]);
    }
  });

  it('should return the correct values for CompositeLut', () => {
    const minValue = getRandomInteger(-65536, 0);
    const maxValue = getRandomInteger(0, 65536);
    const slope = getRandomNumber(0.0, 5.0);
    const intercept = getRandomNumber(0.0, 5.0);
    const lut1 = new RescaleLut(minValue, maxValue, slope, intercept);
    const lut2 = new InvertLut(minValue, maxValue);
    const lut = new CompositeLut();
    lut.addLut(lut1);
    lut.addLut(lut2);

    expect(lut.getMinimumOutputValue()).to.be.eq(lut2.getMinimumOutputValue());
    expect(lut.getMaximumOutputValue()).to.be.eq(lut2.getMaximumOutputValue());
    for (let i = minValue; i <= maxValue; i++) {
      expect(lut.getValue(i)).to.be.eq(lut2.getValue(lut1.getValue(i)));
    }
  });

  it('should return the correct values for PreCalculatedLut', () => {
    const minValue = getRandomInteger(-65536, 0);
    const maxValue = getRandomInteger(0, 65536);
    const slope = getRandomNumber(0.0, 5.0);
    const intercept = getRandomNumber(0.0, 5.0);
    const lut1 = new RescaleLut(minValue, maxValue, slope, intercept);
    const lut2 = new InvertLut(minValue, maxValue);
    const lut3 = new CompositeLut();
    lut3.addLut(lut1);
    lut3.addLut(lut2);
    const lut = new PreCalculatedLut(lut3, minValue, maxValue);
    lut.recalculate();

    expect(lut.getMinimumOutputValue()).to.be.eq(lut2.getMinimumOutputValue());
    expect(lut.getMaximumOutputValue()).to.be.eq(lut2.getMaximumOutputValue());
    for (let i = minValue; i <= maxValue; i++) {
      expect(lut.getValue(i)).to.be.eq(lut2.getValue(lut1.getValue(i)));
    }
  });

  it('should return the correct values for CachedLut', () => {
    const minValue = getRandomInteger(-65536, 0);
    const maxValue = getRandomInteger(0, 65536);
    const slope = getRandomNumber(0.0, 5.0);
    const intercept = getRandomNumber(0.0, 5.0);
    const lut1 = new RescaleLut(minValue, maxValue, slope, intercept);
    const lut2 = new InvertLut(minValue, maxValue);
    const lut3 = new CompositeLut();
    lut3.addLut(lut1);
    lut3.addLut(lut2);
    const lut = new CachedLut(lut3, minValue, maxValue);
    lut.recalculate();

    expect(lut.getMinimumOutputValue()).to.be.eq(lut2.getMinimumOutputValue());
    expect(lut.getMaximumOutputValue()).to.be.eq(lut2.getMaximumOutputValue());
    for (let i = minValue; i <= maxValue; i++) {
      expect(lut.getValue(i)).to.be.eq(lut2.getValue(lut1.getValue(i)));
    }
  });

  it('should correctly construct a LutPipeline from DicomImage and Pixel', () => {
    const image1 = new DicomImage(
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
    );

    const pixel1 = new Pixel(image1.getElements(), image1.getTransferSyntaxUid());
    const pipeline1 = LutPipeline.create(pixel1);
    expect(pipeline1).to.be.instanceof(GrayscaleLutPipeline);

    const image2 = new DicomImage(
      {
        Rows: 5,
        Columns: 5,
        BitsStored: 12,
        BitsAllocated: 16,
        SamplesPerPixel: 1,
        PhotometricInterpretation: PhotometricInterpretation.Monochrome1,
        PixelData: [
          Uint16Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0]).buffer,
        ],
      },
      TransferSyntax.ImplicitVRLittleEndian
    );
    const pixel2 = new Pixel(image2.getElements(), image2.getTransferSyntaxUid());
    const pipeline2 = LutPipeline.create(pixel2);
    expect(pipeline2).to.be.instanceof(GrayscaleLutPipeline);

    const image3 = new DicomImage(
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
    );
    const pixel3 = new Pixel(image3.getElements(), image3.getTransferSyntaxUid());
    const pipeline3 = LutPipeline.create(pixel3);
    expect(pipeline3).to.be.instanceof(RgbColorLutPipeline);

    const lut = [];
    for (let i = 0; i < 256; i++) {
      lut.push(i);
    }
    const image4 = new DicomImage(
      {
        Rows: 5,
        Columns: 5,
        BitsStored: 8,
        BitsAllocated: 8,
        SamplesPerPixel: 3,
        PhotometricInterpretation: PhotometricInterpretation.PaletteColor,
        PixelData: [
          Uint8Array.from([
            1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
            0,
          ]).buffer,
        ],
        RedPaletteColorLookupTableDescriptor: [256, 0, 8],
        RedPaletteColorLookupTableData: [Uint8Array.from(lut).buffer],
        GreenPaletteColorLookupTableData: [Uint8Array.from(lut).buffer],
        BluePaletteColorLookupTableData: [Uint8Array.from(lut).buffer],
      },
      TransferSyntax.ImplicitVRLittleEndian
    );
    const pixel4 = new Pixel(image4.getElements(), image4.getTransferSyntaxUid());
    const pipeline4 = LutPipeline.create(pixel4);
    expect(pipeline4).to.be.instanceof(PaletteColorLutPipeline);
  });
});
