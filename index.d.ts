import log from 'loglevel';

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

/**
 * Version.
 */
declare const version: string;

export namespace constants {
  export { StandardColorPalette };
  export { TransferSyntax };
}

export { DicomImage, NativePixelDecoder, WindowLevel, Histogram, log, version };
