const Histogram = require('./../src/Histogram');
const {
  TransferSyntax,
  PhotometricInterpretation,
  PixelRepresentation,
} = require('./../src/Constants');
const WindowLevel = require('../src/WindowLevel');

const chai = require('chai');
const expect = chai.expect;

const { createImageFromPixelData, getRandomInteger } = require('./utils');

describe('Histogram', () => {
  it('should correctly construct a Histogram', () => {
    const random = getRandomInteger(0, 65537);
    const histogram = new Histogram('gray', -random, random);

    expect(histogram.getIdentifier()).to.be.eq('gray');
    expect(histogram.getMinimum()).to.be.eq(-random);
    expect(histogram.getMaximum()).to.be.eq(random);
  });

  it('should correctly return histogram values', () => {
    const histogram = new Histogram('red', -1, 1);
    histogram.add(0);
    histogram.add(1);
    histogram.add(1);

    expect(histogram.getIdentifier()).to.be.eq('red');
    expect(histogram.get(-1)).to.be.eq(0);
    expect(histogram.get(0)).to.be.eq(1);
    expect(histogram.get(1)).to.be.eq(2);
  });

  it('should correctly clear histogram values', () => {
    const histogram = new Histogram('green', -1, 1);
    histogram.add(-1);
    histogram.add(-1);
    histogram.add(0);
    histogram.add(1);
    histogram.add(1);
    histogram.clear(1);

    expect(histogram.getIdentifier()).to.be.eq('green');
    expect(histogram.get(-1)).to.be.eq(2);
    expect(histogram.get(0)).to.be.eq(1);
    expect(histogram.get(1)).to.be.eq(0);
  });

  it('should return undefined for out-of-bounds histogram values', () => {
    const histogram = new Histogram('blue', 0, 1);
    histogram.add(0);
    histogram.add(1);
    histogram.add(1);

    expect(histogram.getIdentifier()).to.be.eq('blue');
    expect(histogram.get(0)).to.be.eq(1);
    expect(histogram.get(1)).to.be.eq(2);
    expect(histogram.get(2)).to.be.undefined;
  });

  it('should correctly calculate histogram for 8-bit grayscale frame', () => {
    const width = 3;
    const height = 3;
    // prettier-ignore
    const pixels = Uint8Array.from([
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
      calculateHistograms: true,
    });
    expect(renderingResult.histograms).not.to.be.undefined;
    expect(renderingResult.histograms.length).to.be.eq(1);

    const histogram = renderingResult.histograms[0];
    expect(histogram.getIdentifier()).to.be.eq('gray');
    expect(histogram.get(0x00)).to.be.eq(5);
    expect(histogram.get(0x7f)).to.be.eq(2);
    expect(histogram.get(0xff)).to.be.eq(2);
  });

  it('should correctly calculate histogram for little endian unsigned 16-bit grayscale frame', () => {
    const width = 3;
    const height = 3;
    // prettier-ignore
    const pixels = Uint8Array.from([
      0x00, 0x00,   0xff, 0xff,   0x00, 0x00,
      0xff, 0xff,   0x00, 0x00,   0xff, 0xff,
      0x00, 0x00,   0xff, 0xff,   0x00, 0x00,
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
    const renderingResult = monoImage.render({ calculateHistograms: true });
    expect(renderingResult.histograms).not.to.be.undefined;
    expect(renderingResult.histograms.length).to.be.eq(1);

    const histogram = renderingResult.histograms[0];
    expect(histogram.getIdentifier()).to.be.eq('gray');
    expect(histogram.get(0x0000)).to.be.eq(5);
    expect(histogram.get(0xffff)).to.be.eq(4);
  });

  it('should correctly calculate histogram for RGB color frame', () => {
    const width = 2;
    const height = 2;
    // prettier-ignore
    const pixels = Uint8Array.from([
      0x01, 0x02, 0x03,   0x01, 0x03, 0x04,
      0xff, 0xff, 0xff,   0x00, 0x00, 0x00,
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
    const renderingResult = rgbImage.render({ calculateHistograms: true });
    expect(renderingResult.histograms).not.to.be.undefined;
    expect(renderingResult.histograms.length).to.be.eq(3);

    const redHistogram = renderingResult.histograms[0];
    expect(redHistogram.getIdentifier()).to.be.eq('red');
    expect(redHistogram.get(0x00)).to.be.eq(1);
    expect(redHistogram.get(0x01)).to.be.eq(2);
    expect(redHistogram.get(0xff)).to.be.eq(1);

    const greenHistogram = renderingResult.histograms[1];
    expect(greenHistogram.getIdentifier()).to.be.eq('green');
    expect(greenHistogram.get(0x00)).to.be.eq(1);
    expect(greenHistogram.get(0x02)).to.be.eq(1);
    expect(greenHistogram.get(0x03)).to.be.eq(1);
    expect(greenHistogram.get(0xff)).to.be.eq(1);

    const blueHistogram = renderingResult.histograms[2];
    expect(blueHistogram.getIdentifier()).to.be.eq('blue');
    expect(blueHistogram.get(0x00)).to.be.eq(1);
    expect(blueHistogram.get(0x03)).to.be.eq(1);
    expect(blueHistogram.get(0x04)).to.be.eq(1);
    expect(blueHistogram.get(0xff)).to.be.eq(1);
  });
});
