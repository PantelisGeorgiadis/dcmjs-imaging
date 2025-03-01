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
  JpegBaselineProcess1: '1.2.840.10008.1.2.4.50',
  JpegBaselineProcess2_4: '1.2.840.10008.1.2.4.51',
  JpegLosslessProcess14: '1.2.840.10008.1.2.4.57',
  JpegLosslessProcess14V1: '1.2.840.10008.1.2.4.70',
  JpegLsLossless: '1.2.840.10008.1.2.4.80',
  JpegLsLossy: '1.2.840.10008.1.2.4.81',
  Jpeg2000Lossless: '1.2.840.10008.1.2.4.90',
  Jpeg2000Lossy: '1.2.840.10008.1.2.4.91',
  JpegXlLossless: '1.2.840.10008.1.2.4.110',
  JpegXlRecompression: '1.2.840.10008.1.2.4.111',
  JpegXl: '1.2.840.10008.1.2.4.112',
  HtJpeg2000Lossless: '1.2.840.10008.1.2.4.201',
  HtJpeg2000LosslessRpcl: '1.2.840.10008.1.2.4.202',
  HtJpeg2000Lossy: '1.2.840.10008.1.2.4.203',
};
Object.freeze(TransferSyntax);
//#endregion

//#region RenderableTransferSyntaxes
/**
 * Transfer syntaxes that can be rendered.
 * @constant {Array<TransferSyntax>}
 */
const RenderableTransferSyntaxes = [
  TransferSyntax.ImplicitVRLittleEndian,
  TransferSyntax.ExplicitVRLittleEndian,
  TransferSyntax.DeflatedExplicitVRLittleEndian,
  TransferSyntax.ExplicitVRBigEndian,
  TransferSyntax.RleLossless,
  TransferSyntax.JpegBaselineProcess1,
  TransferSyntax.JpegBaselineProcess2_4,
  TransferSyntax.JpegLosslessProcess14,
  TransferSyntax.JpegLosslessProcess14V1,
  TransferSyntax.JpegLsLossless,
  TransferSyntax.JpegLsLossy,
  TransferSyntax.Jpeg2000Lossless,
  TransferSyntax.Jpeg2000Lossy,
  TransferSyntax.HtJpeg2000Lossless,
  TransferSyntax.HtJpeg2000LosslessRpcl,
  TransferSyntax.HtJpeg2000Lossy,
];
Object.freeze(RenderableTransferSyntaxes);
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
  Cmyk: 'CMYK',
  Argb: 'ARGB',
  Hsv: 'HSV',
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

//#region StandardColorPalette
/**
 * Standard color palette.
 * @constant {Object}
 */
const StandardColorPalette = {
  Grayscale: 0,
  HotIron: 1,
  Pet: 2,
  HotMetalBlue: 3,
  Pet20Step: 4,
};
Object.freeze(StandardColorPalette);
//#endregion

//#region Overlay color
/**
 * Overlay color.
 * A: 0xff R: 0xff G: 0x00 B: 0xff
 * @constant {number}
 */
const OverlayColor = (0xff << 0x18) | (0xff << 0x10) | (0x00 << 0x08) | 0xff;
Object.freeze(OverlayColor);
//#endregion

//#region Exports
module.exports = {
  OverlayColor,
  PhotometricInterpretation,
  PixelRepresentation,
  PlanarConfiguration,
  RenderableTransferSyntaxes,
  StandardColorPalette,
  TransferSyntax,
};
//#endregion
