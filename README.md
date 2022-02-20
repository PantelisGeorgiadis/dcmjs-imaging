[![NPM version][npm-version-image]][npm-url] [![build][build-image]][build-url] [![MIT License][license-image]][license-url] 

# dcmjs-imaging
DICOM image and overlay rendering pipeline for Node.js and browser using Steve Pieper's [dcmjs][dcmjs-url] library.
This library was inspired by the rendering pipelines of [fo-dicom][fo-dicom-url] and [mdcm][mdcm-url].

### Note
**This effort is a work-in-progress and should not be used for production or clinical purposes.**

### Install

	npm install dcmjs-imaging

### Build

	npm install
	npm run build

### Supported Transfer Syntaxes
- Implicit VR Little Endian (1.2.840.10008.1.2)
- Explicit VR Little Endian (1.2.840.10008.1.2.1)
- Explicit VR Big Endian (1.2.840.10008.1.2.2)
- RLE Lossless (1.2.840.10008.1.2.5)

### Usage

#### Basic image rendering
```js
// Create an ArrayBuffer with the contents of the DICOM P10 byte stream.
const image = new DicomImage(arrayBuffer);

// Render image.
const renderingResult = image.render();

// Rendered pixels in an RGBA ArrayBuffer.
const renderedPixels = renderingResult.pixels;
```

#### Advanced image rendering
```js
// Create an ArrayBuffer with the contents of the DICOM P10 byte stream.
const image = new DicomImage(arrayBuffer);

// Create image rendering options.
const opts = {
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
  calculateHistograms: false
};

// Render image.
const renderingResult = image.render(opts));

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
