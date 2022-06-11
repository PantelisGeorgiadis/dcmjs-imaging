[![NPM version][npm-version-image]][npm-url] [![build][build-image]][build-url] [![MIT License][license-image]][license-url] 

# dcmjs-imaging
DICOM image and overlay rendering pipeline for Node.js and browser using Steve Pieper's [dcmjs][dcmjs-url] library.
This library was inspired by the rendering pipelines of [fo-dicom][fo-dicom-url] and [mdcm][mdcm-url].

### Note
**This effort is a work-in-progress and should not be used for production or clinical purposes.**

### Install
#### Node.js

	npm install dcmjs-imaging

#### Browser

	<script type="text/javascript" src="https://unpkg.com/dcmjs-imaging"></script>

### Build

	npm install
	npm run build

### Build native decoders WebAssembly

	cd wasm
	./build.sh
[Emscripten SDK (emsdk)][emscripten-sdk-url] is required.

### Supported Transfer Syntaxes
- Implicit VR Little Endian (1.2.840.10008.1.2)
- Explicit VR Little Endian (1.2.840.10008.1.2.1)
- Explicit VR Big Endian (1.2.840.10008.1.2.2)
- RLE Lossless (1.2.840.10008.1.2.5)\*
- JPEG Baseline - Process 1 (1.2.840.10008.1.2.4.50)\*
- JPEG Baseline - Processes 2 & 4 (1.2.840.10008.1.2.4.51)\*
- JPEG Lossless, Nonhierarchical - Processes 14 (1.2.840.10008.1.2.4.57)\*
- JPEG Lossless, Nonhierarchical, First-Order Prediction - Processes 14 [Selection Value 1] (1.2.840.10008.1.2.4.70)\*
- JPEG-LS Lossless Image Compression (1.2.840.10008.1.2.4.80)\*
- JPEG-LS Lossy Image Compression - Near-Lossless (1.2.840.10008.1.2.4.81)\*
- JPEG 2000 Image Compression - Lossless Only (1.2.840.10008.1.2.4.90)\*
- JPEG 2000 Image Compression (1.2.840.10008.1.2.4.91)\*
--------
\*: Syntax is decoded using the native decoders WebAssembly.

### Usage

#### Basic image rendering
```js
// Import objects in Node.js
const dcmjsImaging = require('dcmjs-imaging');
const { DicomImage, NativePixelDecoder } = dcmjsImaging;

// Import objects in Browser
const { DicomImage, NativePixelDecoder } = window.dcmjsImaging;

// Optionally register native decoders WebAssembly.
// If native decoders are not registered, only 
// uncompressed syntaxes would be able to be rendered.
await NativePixelDecoder.initializeAsync();

// Create an ArrayBuffer with the contents of the DICOM P10 byte stream.
const image = new DicomImage(arrayBuffer);

// Render image.
const renderingResult = image.render();

// Rendered pixels in an RGBA ArrayBuffer.
const renderedPixels = renderingResult.pixels;
```

#### Advanced image rendering
```js
// Import objects in Node.js
const dcmjsImaging = require('dcmjs-imaging');
const { DicomImage, WindowLevel, NativePixelDecoder } = dcmjsImaging;
const { StandardColorPalette } = dcmjsImaging.constants;

// Import objects in Browser
const { DicomImage, WindowLevel, NativePixelDecoder } = window.dcmjsImaging;
const { StandardColorPalette } = window.dcmjsImaging.constants;

// Create native decoders WebAssembly initialization options.
const initOpts = {
  // Optionally, provide the path or URL to WebAssembly module.
  // If empty or undefined, the module is trying to be resolved 
  // within the same directory.
  webAssemblyModulePathOrUrl: undefined,
  // Optional flag to enable native decoder message logging.
  // If not provided, the native decoder message logging is disabled.
  logNativeDecodersMessages: false
};
// Optionally register native decoders WebAssembly.
// If native decoders are not registered, only 
// uncompressed syntaxes would be able to be rendered.
await NativePixelDecoder.initializeAsync(initOpts);

// Create an ArrayBuffer with the contents of the DICOM P10 byte stream.
const image = new DicomImage(arrayBuffer);

// Create image rendering options.
const renderingOpts = {
  // Optional frame index, in case of multiframe datasets.
  // If not provided, the first frame is rendered.
  frame: 0,
  // Optional user-provided window/level.
  // If not provided, the rendering pipeline calculates it 
  // from DICOM tag information or pixel values.
  windowLevel: new WindowLevel(windowWidth, windowLevel),
  // Optional flag to indicate whether overlays should be rendered.
  // If not provided, the overlays are rendered.
  renderOverlays: true,
  // Optional flag to indicate whether histograms should be calculated.
  // If not provided, the histograms are not calculated.
  calculateHistograms: false,
  // Optional standard color palette.
  // If not provided, the grayscale palette is used.
  colorPalette: StandardColorPalette.Grayscale
};

// Render image.
const renderingResult = image.render(renderingOpts);

// Rendered pixels in an RGBA ArrayBuffer.
const renderedPixels = renderingResult.pixels;
// Rendered frame index.
const frame = renderingResult.frame;
// Window/level used to render the pixels.
// In case of color images, windowLevel should not be present.
const windowLevel = renderingResult.windowLevel;
// Array of calculated per-channel histograms.
// In case calculateHistograms rendering option is false
// histograms should not be present.
const histograms = renderingResult.histograms;
// Color palette used to render the pixels.
// In case of color images, colorPalette should not be present.
const colorPalette = renderingResult.colorPalette;
```
Please check a live example [here][dcmjs-imaging-live-example-url].

### License
dcmjs-imaging is released under the MIT License.

[npm-url]: https://npmjs.org/package/dcmjs-imaging
[npm-version-image]: https://img.shields.io/npm/v/dcmjs-imaging.svg?style=flat

[build-url]: https://github.com/PantelisGeorgiadis/dcmjs-imaging/actions/workflows/build.yml
[build-image]: https://github.com/PantelisGeorgiadis/dcmjs-imaging/actions/workflows/build.yml/badge.svg?branch=master

[license-image]: https://img.shields.io/badge/license-MIT-blue.svg?style=flat
[license-url]: LICENSE.txt

[dcmjs-url]: https://github.com/dcmjs-org/dcmjs
[fo-dicom-url]: https://github.com/fo-dicom/fo-dicom
[mdcm-url]: https://github.com/fo-dicom/mdcm

[dcmjs-imaging-live-example-url]: https://unpkg.com/dcmjs-imaging@latest/build/index.html

[emscripten-sdk-url]: https://emscripten.org/docs/getting_started/downloads.html
