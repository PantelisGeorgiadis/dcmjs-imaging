import log from 'loglevel';

// Namespace constants

declare namespace PhotometricInterpretation {
  const Monochrome1: string;
  const Monochrome2: string;
  const PaletteColor: string;
  const Rgb: string;
  const YbrFull: string;
  const YbrFull422: string;
  const YbrPartial422: string;
  const YbrPartial420: string;
  const YbrIct: string;
  const YbrRct: string;
  const Cmyk: string;
  const Argb: string;
  const Hsv: string;
}

declare namespace PixelRepresentation {
  const Unsigned: number;
  const Signed: number;
}

declare namespace PlanarConfiguration {
  const Interleaved: number;
  const Planar: number;
}

declare namespace StandardColorPalette {
  const Grayscale: number;
  const HotIron: number;
  const Pet: number;
  const HotMetalBlue: number;
  const Pet20Step: number;
}

declare namespace TransferSyntax {
  const ImplicitVRLittleEndian: string;
  const ExplicitVRLittleEndian: string;
  const DeflatedExplicitVRLittleEndian: string;
  const ExplicitVRBigEndian: string;
  const RleLossless: string;
  const JpegBaselineProcess1: string;
  const JpegBaselineProcess2_4: string;
  const JpegLosslessProcess14: string;
  const JpegLosslessProcess14V1: string;
  const JpegLsLossless: string;
  const JpegLsLossy: string;
  const Jpeg2000Lossless: string;
  const Jpeg2000Lossy: string;
  const HtJpeg2000Lossless: string;
  const HtJpeg2000LosslessRpcl: string;
  const HtJpeg2000Lossy: string;
}

// Utility classes
declare class Histogram {
  /**
   * Creates an instance of Histogram.
   */
  constructor(identifier: string, min: number, max: number);

  /**
   * Gets histogram identifier.
   */
  getIdentifier(): string;

  /**
   * Gets minimum value.
   */
  getMinimum(): number;

  /**
   * Gets maximum value.
   */
  getMaximum(): number;

  /**
   * Increments histogram at bin position.
   */
  add(bin: number): void;

  /**
   * Resets histogram at bin position.
   */
  clear(bin: number): void;

  /**
   * Gets the value count at histogram bin.
   */
  get(bin: number): number | undefined;

  /**
   * Gets the histogram description.
   */
  toString(): string;
}

declare class WindowLevel {
  /**
   * Creates an instance of WindowLevel.
   */
  constructor(window: number, level: number, description?: string);

  /**
   * Gets window value.
   */
  getWindow(): number;

  /**
   * Sets window value.
   */
  setWindow(value: number): void;

  /**
   * Gets level value.
   */
  getLevel(): number;

  /**
   * Sets level value.
   */
  setLevel(value: number): void;

  /**
   * Gets description.
   */
  getDescription(): string | undefined;

  /**
   * Sets description.
   */
  setDescription(description: string): void;

  /**
   * Creates an array of window/level objects based on the image elements.
   */
  static fromDicomImageElements(elements: Record<string, unknown>): Array<WindowLevel>;

  /**
   * Gets the window/level description.
   */
  toString(): string;
}

// Core classes
declare class DicomImage {
  /**
   * Creates an instance of DicomImage.
   */
  constructor(
    elementsOrBuffer?: Record<string, unknown> | ArrayBuffer,
    transferSyntaxUid?: string,
    opts?: {
      pixelPipelineCacheSize?: number;
      lutPipelineCacheSize?: number;
    }
  );

  /**
   * Gets element value.
   */
  getElement(tag: string): string | undefined;

  /**
   * Sets element value.
   */
  setElement(tag: string, value: string): void;

  /**
   * Gets all elements.
   */
  getElements(): Record<string, unknown>;

  /**
   * Gets DICOM transfer syntax UID.
   */
  getTransferSyntaxUid(): string;

  /**
   * Sets DICOM transfer syntax UID.
   */
  setTransferSyntaxUid(transferSyntaxUid: string): void;

  /**
   * Gets elements encoded in a DICOM dataset buffer.
   */
  getDenaturalizedDataset(
    writeOptions?: Record<string, unknown>,
    nameMap?: Record<string, unknown>
  ): ArrayBuffer;

  /**
   * Gets the image width.
   */
  getWidth(): number;

  /**
   * Gets the image height.
   */
  getHeight(): number;

  /**
   * Gets the number of frames.
   */
  getNumberOfFrames(): number;

  /**
   * Renders the image.
   */
  render(opts?: {
    frame?: number;
    windowLevel?: WindowLevel;
    renderOverlays?: boolean;
    calculateHistograms?: boolean;
    colorPalette?: number;
  }): {
    frame: number;
    width: number;
    height: number;
    pixels: ArrayBuffer;
    windowLevel?: WindowLevel;
    histograms?: Array<Histogram>;
    colorPalette?: number;
  };

  /**
   * Renders the icon image located within an icon image sequence, if exists.
   */
  renderIcon(): {
    frame: number;
    width: number;
    height: number;
    pixels: ArrayBuffer;
    windowLevel?: WindowLevel;
    histograms?: Array<Histogram>;
    colorPalette?: number;
  };

  /**
   * Gets the image description.
   */
  toString(): string;
}

declare class Pixel {
  /**
   * Creates an instance of Pixel.
   */
  constructor(elements: Record<string, unknown>, transferSyntaxUid: string);

  /**
   * Gets the transfer syntax UID.
   */
  getTransferSyntaxUid(): string;

  /**
   * Gets the number of frames.
   */
  getNumberOfFrames(): number;

  /**
   * Gets the image width.
   */
  getWidth(): number;

  /**
   * Gets the image height.
   */
  getHeight(): number;

  /**
   * Gets bits stored.
   */
  getBitsStored(): number;

  /**
   * Gets bits allocated.
   */
  getBitsAllocated(): number;

  /**
   * Gets bytes allocated.
   */
  getBytesAllocated(): number;

  /**
   * Gets high bit.
   */
  getHighBit(): number;

  /**
   * Gets samples per pixel.
   */
  getSamplesPerPixel(): number;

  /**
   * Gets pixel representation.
   */
  getPixelRepresentation(): number;

  /**
   * Checks if pixel data is signed.
   */
  isSigned(): boolean;

  /**
   * Gets minimum pixel value.
   */
  getMinimumPixelValue(): number;

  /**
   * Gets maximum pixel value.
   */
  getMaximumPixelValue(): number;

  /**
   * Gets planar configuration.
   */
  getPlanarConfiguration(): number;

  /**
   * Checks if pixel data is planar.
   */
  isPlanar(): boolean;

  /**
   * Gets photometric interpretation.
   */
  getPhotometricInterpretation(): string;

  /**
   * Gets uncompressed frame size.
   */
  getUncompressedFrameSize(): number;

  /**
   * Gets rescale slope.
   */
  getRescaleSlope(): number;

  /**
   * Gets rescale intercept.
   */
  getRescaleIntercept(): number;

  /**
   * Gets VOI LUT function.
   */
  getVoiLutFunction(): string;

  /**
   * Gets smallest image pixel value.
   */
  getSmallestImagePixelValue(): number | undefined;

  /**
   * Gets largest image pixel value.
   */
  getLargestImagePixelValue(): number | undefined;

  /**
   * Gets pixel padding value.
   */
  getPixelPaddingValue(): number | undefined;

  /**
   * Gets red palette color lookup table descriptor.
   */
  getRedPaletteColorLookupTableDescriptor(): unknown;

  /**
   * Gets red palette color lookup table data.
   */
  getRedPaletteColorLookupTableData(): unknown;

  /**
   * Gets green palette color lookup table data.
   */
  getGreenPaletteColorLookupTableData(): unknown;

  /**
   * Gets blue palette color lookup table data.
   */
  getBluePaletteColorLookupTableData(): unknown;

  /**
   * Gets pixel data.
   */
  getPixelData(): ArrayBuffer | undefined;

  /**
   * Checks if pixel data is float.
   */
  hasFloatPixelData(): boolean;

  /**
   * Gets frame data as Uint8Array.
   */
  getFrameDataU8(frame: number): Uint8Array;

  /**
   * Sets frame data from Uint8Array.
   */
  setFrameDataU8(frame: number, data: Uint8Array): void;

  /**
   * Gets frame data as Uint16Array.
   */
  getFrameDataU16(frame: number): Uint16Array;

  /**
   * Sets frame data from Uint16Array.
   */
  setFrameDataU16(frame: number, data: Uint16Array): void;

  /**
   * Gets frame data as Int16Array.
   */
  getFrameDataS16(frame: number): Int16Array;

  /**
   * Sets frame data from Int16Array.
   */
  setFrameDataS16(frame: number, data: Int16Array): void;

  /**
   * Gets frame data as Uint32Array.
   */
  getFrameDataU32(frame: number): Uint32Array;

  /**
   * Sets frame data from Uint32Array.
   */
  setFrameDataU32(frame: number, data: Uint32Array): void;

  /**
   * Gets frame data as Int32Array.
   */
  getFrameDataS32(frame: number): Int32Array;

  /**
   * Sets frame data from Int32Array.
   */
  setFrameDataS32(frame: number, data: Int32Array): void;

  /**
   * Gets frame data as Float32Array.
   */
  getFrameDataF32(frame: number): Float32Array;

  /**
   * Sets frame data from Float32Array.
   */
  setFrameDataF32(frame: number, data: Float32Array): void;

  /**
   * Gets frame data in appropriate typed array format.
   */
  getFrameData(
    frame: number
  ): Uint8Array | Uint16Array | Int16Array | Uint32Array | Int32Array | Float32Array;

  /**
   * Sets frame data from appropriate typed array format.
   */
  setFrameData(
    frame: number,
    data: Uint8Array | Uint16Array | Int16Array | Uint32Array | Int32Array | Float32Array
  ): void;

  /**
   * Gets the pixel description.
   */
  toString(): string;
}

declare class NativePixelDecoder {
  /**
   * Initializes native pixel decoder.
   */
  static initializeAsync(opts?: {
    webAssemblyModulePathOrUrl?: string;
    logNativeDecodersMessages?: boolean;
  }): Promise<void>;

  /**
   * Checks if native pixel decoder module is initialized.
   */
  static isInitialized(): boolean;

  /**
   * Releases native pixel decoder module.
   */
  static release(): void;
}

declare class NativePixelEncoder {
  /**
   * Initializes native pixel encoder.
   */
  static initializeAsync(opts?: {
    webAssemblyModulePathOrUrl?: string;
    logNativeEncodersMessages?: boolean;
  }): Promise<void>;

  /**
   * Checks if native pixel encoder module is initialized.
   */
  static isInitialized(): boolean;

  /**
   * Releases native pixel encoder module.
   */
  static release(): void;

  /**
   * Encodes pixel data using RLE compression.
   */
  static encodeRle(
    pixel: Pixel,
    data: ArrayBuffer,
    parameters?: Record<string, unknown>
  ): ArrayBuffer;

  /**
   * Encodes pixel data using JPEG compression.
   */
  static encodeJpeg(
    pixel: Pixel,
    data: ArrayBuffer,
    parameters?: Record<string, unknown>
  ): ArrayBuffer;

  /**
   * Encodes pixel data using JPEG-LS compression.
   */
  static encodeJpegLs(
    pixel: Pixel,
    data: ArrayBuffer,
    parameters?: Record<string, unknown>
  ): ArrayBuffer;

  /**
   * Encodes pixel data using JPEG 2000 compression.
   */
  static encodeJpeg2000(
    pixel: Pixel,
    data: ArrayBuffer,
    parameters?: Record<string, unknown>
  ): ArrayBuffer;
}

// Constants
/**
 * Version.
 */
declare const version: string;

// Exports

export namespace constants {
  export { PhotometricInterpretation };
  export { PixelRepresentation };
  export { PlanarConfiguration };
  export { StandardColorPalette };
  export { TransferSyntax };
}

export {
  DicomImage,
  NativePixelDecoder,
  NativePixelEncoder,
  WindowLevel,
  Histogram,
  Pixel,
  log,
  version,
};
