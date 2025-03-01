import { expectType, expectError } from 'tsd';
import { DicomImage, NativePixelDecoder, WindowLevel, Histogram, log, version, constants } from '.';
const { StandardColorPalette, TransferSyntax } = constants;

// log
expectType<void>(log.error('error'));

// version
expectType<string>(version);

// NativePixelDecoder
expectError(NativePixelDecoder.initializeAsync('string'));
expectType<boolean>(NativePixelDecoder.isInitialized());
expectType<Promise<void>>(
  NativePixelDecoder.initializeAsync({
    logNativeDecodersMessages: true,
    webAssemblyModulePathOrUrl: '',
  })
);
expectType<Promise<void>>(NativePixelDecoder.initializeAsync());
expectType<void>(NativePixelDecoder.release());

// WindowLevel
expectError(new WindowLevel());
expectError(new WindowLevel(1));
expectError(new WindowLevel('1', '2'));

const windowLevel = new WindowLevel(100, 200, 'WW/WL');
expectError(windowLevel.setWindow('1'));
expectError(windowLevel.setLevel('1'));
expectError(windowLevel.setDescription(1));
expectType<number>(windowLevel.getWindow());
expectType<number>(windowLevel.getLevel());
expectType<string | undefined>(windowLevel.getDescription());
expectType<string>(windowLevel.toString());
expectType<WindowLevel[]>(
  WindowLevel.fromDicomImageElements(
    new DicomImage({}, TransferSyntax.ImplicitVRLittleEndian).getElements()
  )
);

// Histogram
expectError(new Histogram());
expectError(new Histogram(123));
expectError(new Histogram('HISTOGRAM', '1', 2));
expectError(new Histogram('HISTOGRAM', '1', '2'));

const histogram = new Histogram('HISTOGRAM', 0, 5);
expectError(histogram.add('1'));
expectError(histogram.clear('1'));
expectType<number | undefined>(histogram.get(0));
expectType<string>(histogram.getIdentifier());
expectType<number>(histogram.getMinimum());
expectType<number>(histogram.getMaximum());
expectType<string>(histogram.toString());

// DicomImage
expectError(new DicomImage(1));
expectError(new DicomImage('image'));

const pixels = Uint8Array.from([0x00, 0x7f, 0x00, 0xff, 0x00, 0xff, 0x00, 0x7f, 0x00]);
const dicomImage = new DicomImage(
  {
    Rows: 3,
    Columns: 3,
    BitsStored: 8,
    BitsAllocated: 8,
    SamplesPerPixel: 1,
    PixelRepresentation: 0,
    PhotometricInterpretation: 'MONOCHROME2',
    PixelData: [pixels],
  },
  TransferSyntax.ImplicitVRLittleEndian
);
expectError(dicomImage.setTransferSyntaxUid(12345));
expectError(dicomImage.setElement(1, 2));
expectType<string>(dicomImage.getTransferSyntaxUid());
expectType<number>(dicomImage.getWidth());
expectType<number>(dicomImage.getHeight());
expectType<number>(dicomImage.getNumberOfFrames());

expectError(
  dicomImage.render({
    frame: '1',
    windowLevel: 'WW/WL',
    renderOverlays: 1,
    calculateHistograms: 0,
  })
);
expectError(dicomImage.renderIcon({ frame: 1 }));
expectType<{
  frame: number;
  width: number;
  height: number;
  pixels: ArrayBuffer;
  windowLevel?: WindowLevel;
  histograms?: Array<Histogram>;
  colorPalette?: number;
}>(
  dicomImage.render({
    frame: 0,
    renderOverlays: true,
    calculateHistograms: true,
    colorPalette: StandardColorPalette.HotIron,
  })
);
expectType<{
  frame: number;
  width: number;
  height: number;
  pixels: ArrayBuffer;
  windowLevel?: WindowLevel;
  histograms?: Array<Histogram>;
  colorPalette?: number;
}>(dicomImage.renderIcon());
expectType<string>(dicomImage.toString());
