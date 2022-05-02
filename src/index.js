const DicomImage = require('./DicomImage');
const NativePixelDecoder = require('./NativePixelDecoder');
const WindowLevel = require('./WindowLevel');
const Histogram = require('./Histogram');
const {
  TransferSyntax,
  PhotometricInterpretation,
  PlanarConfiguration,
  PixelRepresentation,
  StandardColorPalette,
} = require('./Constants');
const log = require('./log');
const version = require('./version');

//#region constants
const constants = {
  TransferSyntax,
  PhotometricInterpretation,
  PlanarConfiguration,
  PixelRepresentation,
  StandardColorPalette,
};
//#endregion

const DcmjsImaging = {
  DicomImage,
  NativePixelDecoder,
  WindowLevel,
  Histogram,
  constants,
  log,
  version,
};

//#region Exports
module.exports = DcmjsImaging;
//#endregion
