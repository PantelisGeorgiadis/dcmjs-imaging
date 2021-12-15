//#region TransferSyntax
/**
 * Transfer syntaxes.
 * @constant {Object}
 */
const TransferSyntax = {
  ImplicitVRLittleEndian: '1.2.840.10008.1.2',
  ExplicitVRLittleEndian: '1.2.840.10008.1.2.1',
  DeflatedExplicitVRLittleEndian: '1.2.840.10008.1.2.1.99',
  ExplicitVRBigEndian: '1.2.840.10008.1.2.2',
  RleLossless: '1.2.840.10008.1.2.5',
  JpegBaseline: '1.2.840.10008.1.2.4.50',
  JpegLossless: '1.2.840.10008.1.2.4.70',
  JpegLsLossless: '1.2.840.10008.1.2.4.80',
  JpegLsLossy: '1.2.840.10008.1.2.4.81',
  Jpeg2000Lossless: '1.2.840.10008.1.2.4.90',
  Jpeg2000Lossy: '1.2.840.10008.1.2.4.91',
};
Object.freeze(TransferSyntax);
//#endregion

//#region RenderableTransferSyntax
/**
 * Transfer syntaxes that can be rendered.
 * @constant {Object}
 */
const RenderableTransferSyntax = {
  ImplicitVRLittleEndian: '1.2.840.10008.1.2',
  ExplicitVRLittleEndian: '1.2.840.10008.1.2.1',
  ExplicitVRBigEndian: '1.2.840.10008.1.2.2',
};
Object.freeze(RenderableTransferSyntax);
//#endregion

//#region PhotometricInterpretation
/**
 * Photometric interpretations.
 * @constant {Object}
 */
const PhotometricInterpretation = {
  Monochrome1: 'MONOCHROME1',
  Monochrome2: 'MONOCHROME2',
  PaletteColor: 'PALETTE COLOR',
  Rgb: 'RGB',
  YbrFull: 'YBR_FULL',
  YbrFull422: 'YBR_FULL_422',
  YbrPartial422: 'YBR_PARTIAL_422',
  YbrPartial420: 'YBR_PARTIAL_420',
  YbrIct: 'YBR_ICT',
  YbrRct: 'YBR_RCT',
};
Object.freeze(PhotometricInterpretation);
//#endregion

//#region PlanarConfiguration
/**
 * Planar configuration.
 * @constant {Object}
 */
const PlanarConfiguration = {
  Interleaved: 0,
  Planar: 1,
};
Object.freeze(PlanarConfiguration);
//#endregion

//#region PixelRepresentation
/**
 * Pixel representation.
 * @constant {Object}
 */
const PixelRepresentation = {
  Unsigned: 0,
  Signed: 1,
};
Object.freeze(PixelRepresentation);
//#endregion

//#region Exports
module.exports = {
  TransferSyntax,
  RenderableTransferSyntax,
  PhotometricInterpretation,
  PlanarConfiguration,
  PixelRepresentation,
};
//#endregion
