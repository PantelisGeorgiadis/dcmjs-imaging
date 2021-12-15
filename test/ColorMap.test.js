const ColorMap = require('./../src/ColorMap');
const DicomImage = require('./../src/DicomImage');
const { TransferSyntax } = require('./../src/Constants');

const chai = require('chai');
const expect = chai.expect;

describe('ColorMap', () => {
  it('should correctly construct a MONOCHROME1 ColorMap', () => {
    const colorMap = ColorMap.getColorMapMonochrome1();
    for (let i = 0; i < 256; i++) {
      expect((colorMap[i] >> 0x18) & 0xff).to.be.eq(255);
      expect((colorMap[i] >> 0x10) & 0xff).to.be.eq(255 - i);
      expect((colorMap[i] >> 0x08) & 0xff).to.be.eq(255 - i);
      expect(colorMap[i] & 0xff).to.be.eq(255 - i);
    }
  });

  it('should correctly construct a MONOCHROME2 ColorMap', () => {
    const colorMap = ColorMap.getColorMapMonochrome2();
    for (let i = 0; i < 256; i++) {
      expect((colorMap[i] >> 0x18) & 0xff).to.be.eq(255);
      expect((colorMap[i] >> 0x10) & 0xff).to.be.eq(i);
      expect((colorMap[i] >> 0x08) & 0xff).to.be.eq(i);
      expect(colorMap[i] & 0xff).to.be.eq(i);
    }
  });

  it('should correctly construct a PALETTE COLOR ColorMap', () => {
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
    const colorMap = ColorMap.getColorMapPaletteColor(image);
    for (let i = 0; i < 256; i++) {
      expect((colorMap[i] >> 0x18) & 0xff).to.be.eq(255);
      expect((colorMap[i] >> 0x10) & 0xff).to.be.eq(i);
      expect((colorMap[i] >> 0x08) & 0xff).to.be.eq(i);
      expect(colorMap[i] & 0xff).to.be.eq(i);
    }
  });
});
