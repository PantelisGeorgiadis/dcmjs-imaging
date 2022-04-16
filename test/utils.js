const DicomImage = require('./../src/DicomImage');

function createImageFromPixelData(
  width,
  height,
  bitsStored,
  bitsAllocated,
  samplesPerPixel,
  pixelRepresentation,
  photometricInterpretation,
  pixels,
  transferSyntax
) {
  return new DicomImage(
    {
      Rows: height,
      Columns: width,
      BitsStored: bitsStored,
      BitsAllocated: bitsAllocated,
      SamplesPerPixel: samplesPerPixel,
      PixelRepresentation: pixelRepresentation,
      PhotometricInterpretation: photometricInterpretation,
      PixelData: [pixels],
    },
    transferSyntax
  );
}

function getRandomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomNumber(min, max) {
  return Math.random() * (max - min) + min;
}

module.exports = {
  createImageFromPixelData,
  getRandomInteger,
  getRandomNumber,
};
