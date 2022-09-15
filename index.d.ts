import log = require('loglevel');

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
}

declare class Histogram {
  constructor(identifier: string, min: number, max: number);
  getIdentifier(): string;
  getMinimum(): number;
  getMaximum(): number;
  add(bin: number): void;
  clear(bin: number): void;
  get(bin: number): number | undefined;
  toString(): string;
}

declare class WindowLevel {
  constructor(window: number, level: number, description?: string);
  getWindow(): number;
  setWindow(value: number): void;
  getLevel(): number;
  setLevel(value: number): void;
  getDescription(): string | undefined;
  setDescription(description: string): void;
  static fromDicomImage(image: DicomImage): Array<WindowLevel>;
  toString(): string;
}

declare class NativePixelDecoder {
  static initializeAsync(opts?: {
    webAssemblyModulePathOrUrl?: string;
    logNativeDecodersMessages?: boolean;
  }): Promise<void>;
}

declare class DicomImage {
  constructor(
    elementsOrBuffer?: Record<string, unknown> | ArrayBuffer,
    transferSyntaxUid?: string,
    opts?: {
      pixelPipelineCacheSize?: number;
      lutPipelineCacheSize?: number;
    }
  );
  getElement(tag: string): string;
  setElement(tag: string, value: string): void;
  getElements(): Record<string, unknown>;
  getTransferSyntaxUid(): string;
  setTransferSyntaxUid(transferSyntaxUid: string): void;
  getDenaturalizedDataset(): ArrayBuffer;
  getWidth(): number;
  getHeight(): number;
  getNumberOfFrames(): number;
  render(opts?: {
    frame?: number;
    windowLevel?: WindowLevel;
    renderOverlays?: boolean;
    calculateHistograms?: boolean;
    colorPalette?: number;
  }): {
    frame: number;
    pixels: ArrayBuffer;
    windowLevel?: WindowLevel;
    histograms?: Array<Histogram>;
    colorPalette?: number;
  };
  toString(): string;
}

declare const version: string;

export namespace constants {
  export { StandardColorPalette };
  export { TransferSyntax };
}

export { DicomImage, NativePixelDecoder, WindowLevel, Histogram, log, version };
