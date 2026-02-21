const dcmjsImaging = require('./../src');
const { DicomImage, NativePixelDecoder } = dcmjsImaging;

const bmp = require('bmp-js');
const fs = require('fs');

async function renderToBmp(dicomFile, bmpFile) {
  // Register native decoders
  // Optionally, provide the path to WebAssembly module.
  // If not provided, the module is trying to be resolved within the same directory.
  await NativePixelDecoder.initializeAsync();

  const fileBuffer = fs.readFileSync(dicomFile);
  const image = new DicomImage(
    fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength)
  );

  const renderingResult = image.render();
  const renderedPixels = Buffer.from(renderingResult.pixels);

  // BMP lib expects ABGR and the rendering output is RGBA
  const argbPixels = Buffer.alloc(4 * renderingResult.width * renderingResult.height);
  for (let i = 0; i < 4 * renderingResult.width * renderingResult.height; i += 4) {
    argbPixels[i] = renderedPixels[i + 3];
    argbPixels[i + 1] = renderedPixels[i + 2];
    argbPixels[i + 2] = renderedPixels[i + 1];
    argbPixels[i + 3] = renderedPixels[i];
  }

  const encodedBmp = bmp.encode({
    data: argbPixels,
    width: renderingResult.width,
    height: renderingResult.height,
  });

  fs.writeFileSync(bmpFile, encodedBmp.data);
}

const args = process.argv.slice(2);
(async () => {
  const dicomFile = args[0];
  if (!dicomFile) {
    console.error('Please provide the path to the DICOM file as the first argument.');
    process.exit(1);
  }

  const bmpFile = args[1];
  if (!bmpFile) {
    console.error('Please provide the path to the BMP file as the second argument.');
    process.exit(1);
  }

  await renderToBmp(dicomFile, bmpFile);
})();
