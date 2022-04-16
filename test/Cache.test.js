const { PixelPipelineCache, LutPipelineCache } = require('./../src/Cache');
const { Pixel } = require('./../src/Pixel');
const {
  TransferSyntax,
  PhotometricInterpretation,
  PixelRepresentation,
} = require('./../src/Constants');
const WindowLevel = require('../src/WindowLevel');

const { createImageFromPixelData } = require('./utils');

const chai = require('chai');
const expect = chai.expect;

describe('Cache', () => {
  it('should correctly cache pixel pipelines', () => {
    const width = 3;
    const height = 3;
    // prettier-ignore
    const pixels = Uint8Array.from([
      // Frame 1
      0x00, 0xff, 0x00,
      0xff, 0x7f, 0xff,
      0x00, 0xff, 0x00,
      // Frame 2
      0x00, 0xff, 0x00,
      0xff, 0x7f, 0xff,
      0x00, 0xff, 0x00,
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
    monoImage.setElement('NumberOfFrames', 2);
    const pixel = new Pixel(monoImage);

    const pixelPipelineCache = new PixelPipelineCache(1);
    const pixelPipeline1 = pixelPipelineCache.getOrCreate(pixel, 0);
    const pixelPipeline2 = pixelPipelineCache.getOrCreate(pixel, 0);
    const pixelPipeline3 = pixelPipelineCache.getOrCreate(pixel, 1);
    const pixelPipeline4 = pixelPipelineCache.getOrCreate(pixel, 0);
    const pixelPipeline5 = pixelPipelineCache.getOrCreate(pixel, 1);

    expect(pixelPipeline1 === pixelPipeline2).to.be.true;
    expect(pixelPipeline1 === pixelPipeline3).to.be.false;
    expect(pixelPipeline1 === pixelPipeline4).to.be.false;
    expect(pixelPipeline3 === pixelPipeline5).to.be.false;
  });

  it('should correctly cache LUT pipelines', () => {
    const width = 3;
    const height = 3;
    // prettier-ignore
    const pixels = Uint8Array.from([
      // Frame 1
      0x00, 0xff, 0x00,
      0xff, 0x7f, 0xff,
      0x00, 0xff, 0x00,
      // Frame 2
      0x00, 0xff, 0x00,
      0xff, 0x7f, 0xff,
      0x00, 0xff, 0x00,
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
    monoImage.setElement('NumberOfFrames', 2);
    const pixel = new Pixel(monoImage);

    const wl1 = new WindowLevel(20, 30);
    const wl2 = new WindowLevel(30, 40);

    const lutPipelineCache = new LutPipelineCache(1);
    const lutPipeline1 = lutPipelineCache.getOrCreate(pixel, wl1, 0);
    const lutPipeline2 = lutPipelineCache.getOrCreate(pixel, wl1, 0);
    const lutPipeline3 = lutPipelineCache.getOrCreate(pixel, wl2, 0);
    const lutPipeline4 = lutPipelineCache.getOrCreate(pixel, wl2, 1);
    const lutPipeline5 = lutPipelineCache.getOrCreate(pixel, wl1, 0);

    expect(lutPipeline1 === lutPipeline2).to.be.true;
    expect(lutPipeline1 === lutPipeline3).to.be.false;
    expect(lutPipeline3 === lutPipeline4).to.be.false;
    expect(lutPipeline1 === lutPipeline5).to.be.false;
  });
});
