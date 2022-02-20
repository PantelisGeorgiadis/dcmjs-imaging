const Overlay = require('./../src/Overlay');
const DicomImage = require('./../src/DicomImage');
const {
  TransferSyntax,
  PhotometricInterpretation,
  PixelRepresentation,
} = require('./../src/Constants');

const { arrayBuffersAreEqual } = require('./utils');

const chai = require('chai');
const expect = chai.expect;

describe('Overlay', () => {
  it('should correctly construct an Overlay from DicomImage', () => {
    const overlayData = [Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 0]).buffer];
    const image = new DicomImage(
      {
        60000010: 256,
        60000011: 512,
        60000040: 'TYPE',
        60000050: [10, 20],
        60000100: 16,
        60000102: 8,
        60000102: 8,
        60000022: 'DESCRIPTION',
        60000045: 'SUBTYPE',
        60001500: 'LABEL',
        60000015: 2,
        60000051: 5,
        60003000: overlayData,
      },
      TransferSyntax.ImplicitVRLittleEndian
    );
    const overlay = new Overlay(image, 0x6000);

    expect(overlay.getGroup()).to.be.eq(0x6000);
    expect(overlay.getHeight()).to.be.eq(256);
    expect(overlay.getWidth()).to.be.eq(512);
    expect(overlay.getType()).to.be.eq('TYPE');
    expect(overlay.getOriginX()).to.be.eq(10);
    expect(overlay.getOriginY()).to.be.eq(20);
    expect(overlay.getBitsAllocated()).to.be.eq(16);
    expect(overlay.getBitPosition()).to.be.eq(8);
    expect(overlay.getDescription()).to.be.eq('DESCRIPTION');
    expect(overlay.getSubtype()).to.be.eq('SUBTYPE');
    expect(overlay.getLabel()).to.be.eq('LABEL');
    expect(overlay.getNumberOfFrames()).to.be.eq(2);
    expect(overlay.getFrameOrigin()).to.be.eq(5);
    expect(arrayBuffersAreEqual(overlay.getData()[0], overlayData[0])).to.be.true;
  });

  it('should correctly discover overlays in DicomImage', () => {
    const overlayData = [Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 0]).buffer];
    const image = new DicomImage(
      {
        60000010: 256,
        60000011: 512,
        60000040: 'TYPE',
        60000050: [10, 20],
        60000100: 16,
        60000102: 8,
        60000022: 'DESCRIPTION',
        60000045: 'SUBTYPE',
        60001500: 'LABEL',
        60000015: 2,
        60000051: 5,
        60003000: overlayData,
        '60F00010': 256,
        '60F00011': 512,
        '60F00040': 'TYPE',
        '60F00050': [10, 20],
        '60F00100': 16,
        '60F00102': 8,
        '60F00022': 'DESCRIPTION',
        '60F00045': 'SUBTYPE',
        '60F01500': 'LABEL',
        '60F00015': 2,
        '60F00051': 5,
        '60F03000': overlayData,
      },
      TransferSyntax.ImplicitVRLittleEndian
    );
    const overlays = Overlay.fromDicomImage(image);
    expect(overlays.length).to.be.eq(2);

    const image2 = new DicomImage(
      {
        NumberOfFrames: 1,
        PixelData: [Uint8Array.from([1, 2, 3, 4, 5]).buffer],
      },
      TransferSyntax.ImplicitVRLittleEndian
    );
    const overlays2 = Overlay.fromDicomImage(image2);
    expect(overlays2.length).to.be.eq(0);
  });

  it('should not throw for missing overlay parameters', () => {
    const image = new DicomImage(
      {
        '60F00010': 256,
      },
      TransferSyntax.ImplicitVRLittleEndian
    );
    const overlays = Overlay.fromDicomImage(image);
    expect(overlays.length).to.be.eq(1);
    const firstOverlay = overlays[0];
    expect(() => {
      firstOverlay.render(undefined, 0, 0);
    }).to.not.throw();

    const image2 = new DicomImage(
      {
        '60F00010': 256,
        '60F03000': [Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 0]).buffer],
      },
      TransferSyntax.ImplicitVRLittleEndian
    );
    const overlays2 = Overlay.fromDicomImage(image2);
    expect(overlays2.length).to.be.eq(1);
    const firstOverlay2 = overlays2[0];
    expect(() => {
      firstOverlay2.render(undefined, 0, 0);
    }).to.not.throw();
  });

  it('should correctly render an overlay', () => {
    const width = 4;
    const height = 4;
    // prettier-ignore
    const pixels = Uint8Array.from([
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
    ]);
    const overlayData = new Uint8Array((width * height) / 8);
    const overlayDataIndexes = [0, 3, 12, 15];
    for (let i = 0; i < overlayDataIndexes.length; i++) {
      const overlayDataIndex = overlayDataIndexes[i];
      const byteIndex = Math.floor(overlayDataIndex / 8);
      const bitIndex = overlayDataIndex - 8 * byteIndex;
      const byteValue = overlayData[byteIndex];
      const maskValue = 0x01 << bitIndex;
      overlayData[byteIndex] = byteValue | maskValue;
    }
    // prettier-ignore
    const expectedRenderedPixels = Uint8Array.from([
      0xff, 0x00, 0xff,   0x00, 0x00, 0x00,   0x00, 0x00, 0x00,   0xff, 0x00, 0xff,
      0x00, 0x00, 0x00,   0x00, 0x00, 0x00,   0x00, 0x00, 0x00,   0x00, 0x00, 0x00,
      0x00, 0x00, 0x00,   0x00, 0x00, 0x00,   0x00, 0x00, 0x00,   0x00, 0x00, 0x00,
      0xff, 0x00, 0xff,   0x00, 0x00, 0x00,   0x00, 0x00, 0x00,   0xff, 0x00, 0xff,
    ]);
    const image = new DicomImage(
      {
        Rows: height,
        Columns: width,
        BitsStored: 8,
        BitsAllocated: 8,
        SamplesPerPixel: 1,
        PixelRepresentation: PixelRepresentation.Unsigned,
        PhotometricInterpretation: PhotometricInterpretation.Monochrome2,
        SmallestImagePixelValue: 0,
        LargestImagePixelValue: Math.pow(2, 8) - 1,
        PixelData: [pixels.buffer],
        60000010: height,
        60000011: width,
        60000040: 'TYPE',
        60000050: [1, 1],
        60000100: 1,
        60000102: 0,
        60000022: 'DESCRIPTION',
        60000045: 'SUBTYPE',
        60001500: 'LABEL',
        60000015: 1,
        60000051: 1,
        60003000: [overlayData.buffer],
      },
      TransferSyntax.ImplicitVRLittleEndian
    );

    const renderingResult = image.render();
    const renderedPixels = new Uint8Array(renderingResult.pixels);
    for (let i = 0, p = 0; i < 4 * width * height; i += 4) {
      expect(renderedPixels[i]).to.be.eq(expectedRenderedPixels[p++]);
      expect(renderedPixels[i + 1]).to.be.eq(expectedRenderedPixels[p++]);
      expect(renderedPixels[i + 2]).to.be.eq(expectedRenderedPixels[p++]);
      expect(renderedPixels[i + 3]).to.be.eq(255);
    }
  });
});
