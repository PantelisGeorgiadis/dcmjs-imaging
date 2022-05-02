const dcmjsImaging = require('./../src');
const { DicomImage, NativePixelDecoder } = dcmjsImaging;

const path = require('path');
const bmp = require('bmp-js');
const fs = require('fs');

async function renderToBmp(dicomFile, bmpFile) {
  // Register native decoders
  // Optionally, provide the path to WebAssembly module.
  // If not provided, the module is trying to be resolved within the same directory.
  await NativePixelDecoder.initializeAsync({
    webAssemblyModulePathOrUrl: path.resolve(__dirname, '../wasm/bin/native-pixel-decoder.wasm'),
  });

  const fileBuffer = fs.readFileSync(dicomFile);
  const image = new DicomImage(
    fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength)
  );

  const renderingResult = image.render();
  const renderedPixels = Buffer.from(renderingResult.pixels);

  // BMP lib expects ABGR and the rendering output is RGBA
  const argbPixels = Buffer.alloc(4 * image.getWidth() * image.getHeight());
  for (let i = 0; i < 4 * image.getWidth() * image.getHeight(); i += 4) {
    argbPixels[i] = renderedPixels[i + 3];
    argbPixels[i + 1] = renderedPixels[i + 2];
    argbPixels[i + 2] = renderedPixels[i + 1];
    argbPixels[i + 3] = renderedPixels[i];
  }

  const encodedBmp = bmp.encode({
    data: argbPixels,
    width: image.getWidth(),
    height: image.getHeight(),
  });

  fs.writeFileSync(bmpFile, encodedBmp.data);
}

const args = process.argv.slice(2);
(async () => {
  await renderToBmp(args[0], args[1]);
})();
