const ColorPalette = require('./../src/ColorPalette');
const DicomImage = require('./../src/DicomImage');
const { Pixel } = require('./../src/Pixel');
const { TransferSyntax } = require('./../src/Constants');

const chai = require('chai');
const expect = chai.expect;

describe('ColorPalette', () => {
  it('should correctly construct a MONOCHROME1 ColorPalette', () => {
    const colorPalette = ColorPalette.getColorPaletteMonochrome1();
    for (let i = 0; i < 256; i++) {
      expect((colorPalette[i] >> 0x18) & 0xff).to.be.eq(255);
      expect((colorPalette[i] >> 0x10) & 0xff).to.be.eq(255 - i);
      expect((colorPalette[i] >> 0x08) & 0xff).to.be.eq(255 - i);
      expect(colorPalette[i] & 0xff).to.be.eq(255 - i);
    }
  });

  it('should correctly construct a MONOCHROME2 ColorPalette', () => {
    const colorPalette = ColorPalette.getColorPaletteMonochrome2();
    for (let i = 0; i < 256; i++) {
      expect((colorPalette[i] >> 0x18) & 0xff).to.be.eq(255);
      expect((colorPalette[i] >> 0x10) & 0xff).to.be.eq(i);
      expect((colorPalette[i] >> 0x08) & 0xff).to.be.eq(i);
      expect(colorPalette[i] & 0xff).to.be.eq(i);
    }
  });

  it('should correctly construct a PALETTE COLOR ColorPalette', () => {
    const lut = [];
    for (let i = 0; i < 256; i++) {
      lut.push(i);
    }
    const image = new DicomImage(
      {
        RedPaletteColorLookupTableDescriptor: [256, 0, 8],
        RedPaletteColorLookupTableData: [Uint8Array.from(lut).buffer],
        GreenPaletteColorLookupTableData: [Uint8Array.from(lut).buffer],
        BluePaletteColorLookupTableData: [Uint8Array.from(lut).buffer],
      },
      TransferSyntax.ImplicitVRLittleEndian
    );
    const pixel = new Pixel(image.getElements(), image.getTransferSyntaxUid());
    const colorPalette = ColorPalette.getColorPalettePaletteColor(pixel);
    for (let i = 0; i < 256; i++) {
      expect((colorPalette[i] >> 0x18) & 0xff).to.be.eq(255);
      expect((colorPalette[i] >> 0x10) & 0xff).to.be.eq(i);
      expect((colorPalette[i] >> 0x08) & 0xff).to.be.eq(i);
      expect(colorPalette[i] & 0xff).to.be.eq(i);
    }
  });

  it('should throw for bad PALETTE COLOR data', () => {
    const lut = [];
    for (let i = 0; i < 256; i++) {
      lut.push(i);
    }

    const image = new DicomImage(
      {
        RedPaletteColorLookupTableDescriptor: [256, 0, 8],
        GreenPaletteColorLookupTableData: [Uint8Array.from(lut).buffer],
        BluePaletteColorLookupTableData: [Uint8Array.from(lut).buffer],
      },
      TransferSyntax.ImplicitVRLittleEndian
    );

    expect(() => {
      const pixel = new Pixel(image.getElements(), image.getTransferSyntaxUid());
      ColorPalette.getColorPalettePaletteColor(pixel);
    }).to.throw();
  });
});
