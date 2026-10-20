const { ColorPalette, SegmentedColorPalette } = require('./../src/ColorPalette');
const { Pixel } = require('./../src/Pixel');
const { TransferSyntax } = require('./../src/Constants');
const DicomImage = require('./../src/DicomImage');

const chai = require('chai');
const expect = chai.expect;

function toBuffer(words) {
  return Uint16Array.from(words).buffer;
}

describe('ColorPalette', () => {
  it('should correctly construct a MONOCHROME1 ColorPalette', () => {
    const colorPalette = ColorPalette.getColorPaletteMonochrome1();
    for (let i = 0; i < 256; i++) {
      expect((colorPalette[i] >> 0x18) & 0xff).to.be.eq(0xff);
      expect((colorPalette[i] >> 0x10) & 0xff).to.be.eq(0xff - i);
      expect((colorPalette[i] >> 0x08) & 0xff).to.be.eq(0xff - i);
      expect(colorPalette[i] & 0xff).to.be.eq(0xff - i);
    }
  });

  it('should correctly construct a MONOCHROME2 ColorPalette', () => {
    const colorPalette = ColorPalette.getColorPaletteMonochrome2();
    for (let i = 0; i < 256; i++) {
      expect((colorPalette[i] >> 0x18) & 0xff).to.be.eq(0xff);
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
      expect((colorPalette[i] >> 0x18) & 0xff).to.be.eq(0xff);
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

  it('should throw for non existent standard color palette', () => {
    expect(() => {
      ColorPalette.getColorPaletteStandard(-1);
    }).to.throw();
  });
});

// discrete segment with 16 entries linearly covering the full [0, 65535] range
const ramp = [];
for (let i = 0; i < 16; i++) {
  ramp.push(i * 4369);
}

describe('SegmentedColorPalette', () => {
  it('should expand a discrete segment', () => {
    const data = toBuffer([0, 3, 100, 200, 300]);
    const expanded = SegmentedColorPalette.expand(data);
    expect(Array.from(expanded)).to.deep.eq([100, 200, 300]);
  });

  it('should expand a linear segment starting from zero', () => {
    const data = toBuffer([1, 4, 1000]);
    const expanded = SegmentedColorPalette.expand(data);
    expect(Array.from(expanded)).to.deep.eq([250, 500, 750, 1000]);
  });

  it('should expand a linear segment starting from the previous value', () => {
    const data = toBuffer([0, 1, 100, 1, 4, 200]);
    const expanded = SegmentedColorPalette.expand(data);
    expect(Array.from(expanded)).to.deep.eq([100, 125, 150, 175, 200]);
  });

  it('should expand multiple segments', () => {
    const data = toBuffer([1, 3, 300, 0, 2, 400, 500, 1, 2, 1000]);
    const expanded = SegmentedColorPalette.expand(data);
    expect(Array.from(expanded)).to.deep.eq([100, 200, 300, 400, 500, 750, 1000]);
  });

  it('should expand an indirect segment', () => {
    // indirect segment referencing the discrete segment at byte offset 0
    const data = toBuffer([0, 2, 7, 9, 2, 1, 0, 0]);
    const expanded = SegmentedColorPalette.expand(data);
    expect(Array.from(expanded)).to.deep.eq([7, 9, 7, 9]);
  });

  it('should expand an indirect segment referencing a linear segment', () => {
    // discrete(7,9), a linear segment 9->800, and an indirect segment referencing the
    // linear segment at byte offset 8; the re-expanded ramp starts from the last value
    // emitted before the indirect segment, i.e. 800
    const data = toBuffer([0, 2, 7, 9, 1, 2, 800, 2, 1, 8, 0]);
    const expanded = SegmentedColorPalette.expand(data);
    expect(Array.from(expanded)).to.deep.eq([7, 9, 405, 800, 800, 800]);
  });

  it('should expand data provided as Uint16Array or array of words', () => {
    const words = [0, 2, 10, 20];
    expect(Array.from(SegmentedColorPalette.expand(Uint16Array.from(words)))).to.deep.eq([10, 20]);
    expect(Array.from(SegmentedColorPalette.expand(words))).to.deep.eq([10, 20]);
    expect(Array.from(SegmentedColorPalette.expand([Uint16Array.from(words)]))).to.deep.eq([
      10, 20,
    ]);
  });

  it('should throw for empty data or invalid opcodes', () => {
    expect(() => SegmentedColorPalette.expand(new Uint16Array(0))).to.throw();
    expect(() => SegmentedColorPalette.expand(toBuffer([3, 1, 5]))).to.throw();
  });

  it('should throw for indirect segment with invalid reference', () => {
    // references a non-existing segment at byte offset 4
    expect(() => SegmentedColorPalette.expand(toBuffer([2, 1, 4, 0]))).to.throw();
    // references another indirect segment (invalid opcode)
    expect(() => SegmentedColorPalette.expand(toBuffer([2, 1, 0, 0, 2, 1, 0, 0]))).to.throw();
    // misaligned byte offset
    expect(() => SegmentedColorPalette.expand(toBuffer([0, 1, 5, 2, 1, 1, 0]))).to.throw();
  });

  it('should throw for unsupported data types', () => {
    expect(() => SegmentedColorPalette.expand('invalid')).to.throw();
  });

  it('should expand data provided as a byte buffer', () => {
    const words = Uint16Array.from([0, 2, 10, 20]);
    const bytes = new Uint8Array(2 + words.byteLength).fill(0xff);
    bytes.set(new Uint8Array(words.buffer), 2);
    const offsetView = new Uint8Array(bytes.buffer, 1, bytes.length - 1);
    expect(Array.from(SegmentedColorPalette.expand(offsetView))).to.deep.eq([10, 20]);
  });

  it('should construct a segmented PALETTE COLOR ColorPalette', () => {
    const image = new DicomImage(
      {
        RedPaletteColorLookupTableDescriptor: [16, 0, 16],
        SegmentedRedPaletteColorLookupTableData: [toBuffer([0, 16, ...ramp])],
        SegmentedGreenPaletteColorLookupTableData: [toBuffer([0, 16, ...ramp])],
        SegmentedBluePaletteColorLookupTableData: [toBuffer([0, 16, ...ramp])],
      },
      TransferSyntax.ImplicitVRLittleEndian
    );
    const pixel = new Pixel(image.getElements(), image.getTransferSyntaxUid());
    const colorPalette = ColorPalette.getColorPalettePaletteColor(pixel);
    expect(colorPalette.length).to.be.eq(16);
    for (let i = 0; i < 16; i++) {
      expect((colorPalette[i] >> 0x18) & 0xff).to.be.eq(0xff);
      expect((colorPalette[i] >> 0x10) & 0xff).to.be.eq(i * 17);
      expect((colorPalette[i] >> 0x08) & 0xff).to.be.eq(i * 17);
      expect(colorPalette[i] & 0xff).to.be.eq(i * 17);
    }
  });

  it('should scale segmented entries by the descriptor bits', () => {
    // 12-bit discrete ramp [0, 4095] for red; constant channels for green/blue
    const ramp12 = [0, 585, 1170, 1755, 2340, 2925, 3510, 4095];
    const image = new DicomImage(
      {
        RedPaletteColorLookupTableDescriptor: [8, 0, 12],
        SegmentedRedPaletteColorLookupTableData: [toBuffer([0, 8, ...ramp12])],
        SegmentedGreenPaletteColorLookupTableData: [toBuffer([0, 8, ...ramp12])],
        SegmentedBluePaletteColorLookupTableData: [toBuffer([0, 8, ...ramp12])],
      },
      TransferSyntax.ImplicitVRLittleEndian
    );
    const pixel = new Pixel(image.getElements(), image.getTransferSyntaxUid());
    const colorPalette = ColorPalette.getColorPalettePaletteColor(pixel);
    expect(colorPalette.length).to.be.eq(8);
    expect((colorPalette[0] >> 0x10) & 0xff).to.be.eq(0);
    expect((colorPalette[1] >> 0x10) & 0xff).to.be.eq(36);
    expect((colorPalette[7] >> 0x10) & 0xff).to.be.eq(255);
    expect((colorPalette[7] >> 0x08) & 0xff).to.be.eq(255);
    expect(colorPalette[7] & 0xff).to.be.eq(255);
  });

  it('should clamp the palette size to the expanded segment data', () => {
    const image = new DicomImage(
      {
        RedPaletteColorLookupTableDescriptor: [256, 0, 16],
        SegmentedRedPaletteColorLookupTableData: [toBuffer([0, 1, 65535])],
        SegmentedGreenPaletteColorLookupTableData: [toBuffer([0, 1, 0])],
        SegmentedBluePaletteColorLookupTableData: [toBuffer([0, 1, 0])],
      },
      TransferSyntax.ImplicitVRLittleEndian
    );
    const pixel = new Pixel(image.getElements(), image.getTransferSyntaxUid());
    const colorPalette = ColorPalette.getColorPalettePaletteColor(pixel);
    expect(colorPalette.length).to.be.eq(1);
    expect((colorPalette[0] >> 0x10) & 0xff).to.be.eq(255);
    expect((colorPalette[0] >> 0x08) & 0xff).to.be.eq(0);
    expect(colorPalette[0] & 0xff).to.be.eq(0);
  });

  it('should throw when both non-segmented and segmented data are missing', () => {
    const image = new DicomImage(
      {
        RedPaletteColorLookupTableDescriptor: [256, 0, 8],
        SegmentedRedPaletteColorLookupTableData: [toBuffer([0, 1, 1])],
      },
      TransferSyntax.ImplicitVRLittleEndian
    );

    expect(() => {
      const pixel = new Pixel(image.getElements(), image.getTransferSyntaxUid());
      ColorPalette.getColorPalettePaletteColor(pixel);
    }).to.throw();
  });
});
