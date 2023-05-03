const {
  PhotometricInterpretation,
  PixelRepresentation,
  PlanarConfiguration,
  StandardColorPalette,
  TransferSyntax,
} = require('./Constants');
const DicomImage = require('./DicomImage');
const NativePixelDecoder = require('./NativePixelDecoder');
const WindowLevel = require('./WindowLevel');
const Histogram = require('./Histogram');
const log = require('./log');
const version = require('./version');

//#region constants
const constants = {
  PhotometricInterpretation,
  PixelRepresentation,
  PlanarConfiguration,
  StandardColorPalette,
  TransferSyntax,
};
//#endregion

const DcmjsImaging = {
  constants,
  DicomImage,
  Histogram,
  log,
  NativePixelDecoder,
  version,
  WindowLevel,
};

//#region Exports
module.exports = DcmjsImaging;
//#endregion
