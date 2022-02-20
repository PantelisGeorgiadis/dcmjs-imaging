const DicomImage = require('./DicomImage');
const WindowLevel = require('./WindowLevel');
const Histogram = require('./Histogram');
const version = require('./version');

const DcmjsImaging = {
  DicomImage,
  WindowLevel,
  Histogram,
  version,
};

//#region Exports
module.exports = DcmjsImaging;
//#endregion
