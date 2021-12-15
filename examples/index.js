const dcmjsImaging = require('./../build/dcmjs-imaging.min.js');
const { DicomImage } = dcmjsImaging;

const bmp = require('bmp-js');
const fs = require('fs');

function renderToBmp(dicomFile, bmpFile) {
  const fileBuffer = fs.readFileSync(dicomFile);

  const image = new DicomImage(
    fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength)
  );

  const renderedPixels = Buffer.from(image.render());

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
renderToBmp(args[0], args[1]);