const {
  ColorPixelPipeline,
  GrayscalePixelPipeline,
  Pixel,
  PixelConverter,
  PixelPipeline,
} = require('./../src/Pixel');
const {
  PhotometricInterpretation,
  PixelRepresentation,
  PlanarConfiguration,
  TransferSyntax,
} = require('./../src/Constants');
const DicomImage = require('./../src/DicomImage');

const chai = require('chai');
const expect = chai.expect;

describe('Pixel internals', () => {
  describe('_getFrameFragments', () => {
    it('should get frame fragments for single frame with single buffer', () => {
      const image = new DicomImage(
        {
          Rows: 2,
          Columns: 2,
          BitsStored: 8,
          BitsAllocated: 8,
          SamplesPerPixel: 1,
          PhotometricInterpretation: PhotometricInterpretation.Monochrome2,
          PixelData: [Uint8Array.from([1, 2, 3, 4]).buffer],
        },
        TransferSyntax.ImplicitVRLittleEndian
      );
      const pixel = new Pixel(image.getElements(), image.getTransferSyntaxUid());

      // Access private method for testing
      const frameFragments = pixel._getFrameFragments(pixel.getPixelData(), 0);

      expect(frameFragments).to.be.instanceof(Uint8Array);
      expect(frameFragments.length).to.equal(4);
      expect(Array.from(frameFragments)).to.deep.equal([1, 2, 3, 4]);
    });

    it('should get frame fragments for single frame with multiple buffers', () => {
      const image = new DicomImage(
        {
          Rows: 2,
          Columns: 2,
          BitsStored: 8,
          BitsAllocated: 8,
          SamplesPerPixel: 1,
          PhotometricInterpretation: PhotometricInterpretation.Monochrome2,
          PixelData: [Uint8Array.from([1, 2]).buffer, Uint8Array.from([3, 4]).buffer],
        },
        TransferSyntax.ImplicitVRLittleEndian
      );
      const pixel = new Pixel(image.getElements(), image.getTransferSyntaxUid());

      // Access private method for testing
      const frameFragments = pixel._getFrameFragments(pixel.getPixelData(), 0);

      expect(frameFragments).to.be.instanceof(Uint8Array);
      expect(frameFragments.length).to.equal(4);
      expect(Array.from(frameFragments)).to.deep.equal([1, 2, 3, 4]);
    });

    it('should get frame fragments for multiple frames with one buffer per frame', () => {
      const image = new DicomImage(
        {
          Rows: 2,
          Columns: 2,
          BitsStored: 8,
          BitsAllocated: 8,
          SamplesPerPixel: 1,
          NumberOfFrames: 2,
          PhotometricInterpretation: PhotometricInterpretation.Monochrome2,
          PixelData: [Uint8Array.from([1, 2, 3, 4]).buffer, Uint8Array.from([5, 6, 7, 8]).buffer],
        },
        TransferSyntax.ImplicitVRLittleEndian
      );
      const pixel = new Pixel(image.getElements(), image.getTransferSyntaxUid());

      // Test first frame
      const frameFragments0 = pixel._getFrameFragments(pixel.getPixelData(), 0);
      expect(frameFragments0).to.be.instanceof(Uint8Array);
      expect(Array.from(frameFragments0)).to.deep.equal([1, 2, 3, 4]);

      // Test second frame
      const frameFragments1 = pixel._getFrameFragments(pixel.getPixelData(), 1);
      expect(frameFragments1).to.be.instanceof(Uint8Array);
      expect(Array.from(frameFragments1)).to.deep.equal([5, 6, 7, 8]);
    });

    it('should throw error when getting frame fragments with no pixel data', () => {
      const image = new DicomImage(
        {
          Rows: 2,
          Columns: 2,
          BitsStored: 8,
          BitsAllocated: 8,
          SamplesPerPixel: 1,
          PhotometricInterpretation: PhotometricInterpretation.Monochrome2,
          PixelData: [],
        },
        TransferSyntax.ImplicitVRLittleEndian
      );
      const pixel = new Pixel(image.getElements(), image.getTransferSyntaxUid());

      expect(() => {
        pixel._getFrameFragments(pixel.getPixelData(), 0);
      }).to.throw('No fragmented pixel data');
    });

    it('should throw error when getting frame fragments with frame out of range', () => {
      const image = new DicomImage(
        {
          Rows: 2,
          Columns: 2,
          BitsStored: 8,
          BitsAllocated: 8,
          SamplesPerPixel: 1,
          PhotometricInterpretation: PhotometricInterpretation.Monochrome2,
          PixelData: [Uint8Array.from([1, 2, 3, 4]).buffer],
        },
        TransferSyntax.ImplicitVRLittleEndian
      );
      const pixel = new Pixel(image.getElements(), image.getTransferSyntaxUid());

      expect(() => {
        pixel._getFrameFragments(pixel.getPixelData(), 1);
      }).to.throw('Requested frame is larger or equal to the pixel fragments number');
    });
  });

  describe('_setFrameFragments', () => {
    it('should set frame fragments for single frame', () => {
      const image = new DicomImage(
        {
          Rows: 2,
          Columns: 2,
          BitsStored: 8,
          BitsAllocated: 8,
          SamplesPerPixel: 1,
          PhotometricInterpretation: PhotometricInterpretation.Monochrome2,
          PixelData: [Uint8Array.from([1, 2, 3, 4]).buffer],
        },
        TransferSyntax.ImplicitVRLittleEndian
      );
      const pixel = new Pixel(image.getElements(), image.getTransferSyntaxUid());

      const newFrameData = new Uint8Array([10, 20, 30, 40]);
      const pixelBuffers = pixel.getPixelData();

      // Set frame fragments
      pixel._setFrameFragments(pixelBuffers, 0, newFrameData);

      // Verify the data was set correctly
      const retrievedData = new Uint8Array(pixelBuffers[0]);
      expect(Array.from(retrievedData)).to.deep.equal([10, 20, 30, 40]);
    });

    it('should set frame fragments for multiple frames', () => {
      const image = new DicomImage(
        {
          Rows: 2,
          Columns: 2,
          BitsStored: 16,
          BitsAllocated: 16,
          SamplesPerPixel: 1,
          NumberOfFrames: 2,
          PhotometricInterpretation: PhotometricInterpretation.Monochrome2,
          PixelData: [new Uint16Array([1, 2, 3, 4]).buffer, new Uint16Array([5, 6, 7, 8]).buffer],
        },
        TransferSyntax.ImplicitVRLittleEndian
      );
      const pixel = new Pixel(image.getElements(), image.getTransferSyntaxUid());

      const newFrameData = new Uint8Array(new Uint16Array([100, 200, 300, 400]).buffer);
      const pixelBuffers = pixel.getPixelData();

      // Set second frame fragments
      pixel._setFrameFragments(pixelBuffers, 1, newFrameData);

      // Verify the data was set correctly
      const retrievedData = new Uint16Array(pixelBuffers[1]);
      expect(Array.from(retrievedData)).to.deep.equal([100, 200, 300, 400]);

      // Verify first frame was not affected
      const firstFrameData = new Uint16Array(pixelBuffers[0]);
      expect(Array.from(firstFrameData)).to.deep.equal([1, 2, 3, 4]);
    });

    it('should throw error when setting frame fragments with invalid data', () => {
      const image = new DicomImage(
        {
          Rows: 2,
          Columns: 2,
          BitsStored: 8,
          BitsAllocated: 8,
          SamplesPerPixel: 1,
          PhotometricInterpretation: PhotometricInterpretation.Monochrome2,
          PixelData: [Uint8Array.from([1, 2, 3, 4]).buffer],
        },
        TransferSyntax.ImplicitVRLittleEndian
      );
      const pixel = new Pixel(image.getElements(), image.getTransferSyntaxUid());
      const pixelBuffers = pixel.getPixelData();

      expect(() => {
        pixel._setFrameFragments(pixelBuffers, 0, null);
      }).to.throw('Frame data must be a Uint8Array');

      expect(() => {
        pixel._setFrameFragments(pixelBuffers, 0, 'invalid');
      }).to.throw('Frame data must be a Uint8Array');
    });
  });

  describe('_getFrameFragments & _setFrameFragments roundtrip ', () => {
    it('should roundtrip frame fragments data correctly', () => {
      // Use pre-generated random pixel data for realistic but deterministic testing
      const initialFrame0Data = new Uint8Array([142, 73, 201, 89, 156, 34, 178, 251, 67]);
      const initialFrame1Data = new Uint8Array([198, 45, 112, 233, 87, 159, 24, 203, 146]);

      const image = new DicomImage(
        {
          Rows: 3,
          Columns: 3,
          BitsStored: 8,
          BitsAllocated: 8,
          SamplesPerPixel: 1,
          NumberOfFrames: 2,
          PhotometricInterpretation: PhotometricInterpretation.Monochrome2,
          PixelData: [initialFrame0Data.buffer, initialFrame1Data.buffer],
        },
        TransferSyntax.ImplicitVRLittleEndian
      );
      const pixel = new Pixel(image.getElements(), image.getTransferSyntaxUid());
      const pixelBuffers = pixel.getPixelData();

      // Get original frame data
      const originalFrame0 = pixel._getFrameFragments(pixelBuffers, 0);
      const originalFrame1 = pixel._getFrameFragments(pixelBuffers, 1);

      // Create new random frame data
      const newFrame0Data = new Uint8Array([88, 215, 129, 56, 234, 91, 167, 42, 183]);
      const newFrame1Data = new Uint8Array([77, 194, 38, 152, 219, 103, 241, 65, 128]);

      // Set the new frame data
      pixel._setFrameFragments(pixelBuffers, 0, newFrame0Data);
      pixel._setFrameFragments(pixelBuffers, 1, newFrame1Data);

      // Get the data back
      const retrievedFrame0 = pixel._getFrameFragments(pixelBuffers, 0);
      const retrievedFrame1 = pixel._getFrameFragments(pixelBuffers, 1);

      // Verify roundtrip worked
      expect(Array.from(retrievedFrame0)).to.deep.equal(Array.from(newFrame0Data));
      expect(Array.from(retrievedFrame1)).to.deep.equal(Array.from(newFrame1Data));

      // Verify original data is different
      expect(Array.from(retrievedFrame0)).to.not.deep.equal(Array.from(originalFrame0));
      expect(Array.from(retrievedFrame1)).to.not.deep.equal(Array.from(originalFrame1));
    });

    it('should handle roundtrip for single frame with multiple buffers', () => {
      const image = new DicomImage(
        {
          Rows: 2,
          Columns: 2,
          BitsStored: 8,
          BitsAllocated: 8,
          SamplesPerPixel: 1,
          PhotometricInterpretation: PhotometricInterpretation.Monochrome2,
          PixelData: [Uint8Array.from([1, 2]).buffer, Uint8Array.from([3, 4]).buffer],
        },
        TransferSyntax.ImplicitVRLittleEndian
      );
      const pixel = new Pixel(image.getElements(), image.getTransferSyntaxUid());
      const pixelBuffers = pixel.getPixelData();

      // Get original concatenated frame data
      const originalFrame = pixel._getFrameFragments(pixelBuffers, 0);
      expect(Array.from(originalFrame)).to.deep.equal([1, 2, 3, 4]);

      // Create new frame data
      const newFrameData = new Uint8Array([10, 20, 30, 40]);

      // Set the new frame data
      pixel._setFrameFragments(pixelBuffers, 0, newFrameData);

      // Get the data back
      const retrievedFrame = pixel._getFrameFragments(pixelBuffers, 0);

      // Verify roundtrip worked
      expect(Array.from(retrievedFrame)).to.deep.equal(Array.from(newFrameData));
      expect(Array.from(retrievedFrame)).to.not.deep.equal(Array.from(originalFrame));
    });
  });

  describe('_getFrameBuffer', () => {
    it('should get frame buffer for uncompressed single frame', () => {
      const image = new DicomImage(
        {
          Rows: 2,
          Columns: 2,
          BitsStored: 8,
          BitsAllocated: 8,
          SamplesPerPixel: 1,
          PhotometricInterpretation: PhotometricInterpretation.Monochrome2,
          PixelData: [Uint8Array.from([1, 2, 3, 4]).buffer],
        },
        TransferSyntax.ImplicitVRLittleEndian
      );
      const pixel = new Pixel(image.getElements(), image.getTransferSyntaxUid());

      const frameBuffer = pixel._getFrameBuffer(0);

      expect(frameBuffer).to.be.instanceof(Uint8Array);
      expect(frameBuffer.length).to.equal(4);
      expect(Array.from(frameBuffer)).to.deep.equal([1, 2, 3, 4]);
    });

    it('should get frame buffer for uncompressed multiple frames', () => {
      const image = new DicomImage(
        {
          Rows: 2,
          Columns: 2,
          BitsStored: 8,
          BitsAllocated: 8,
          SamplesPerPixel: 1,
          NumberOfFrames: 2,
          PhotometricInterpretation: PhotometricInterpretation.Monochrome2,
          PixelData: [Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]).buffer],
        },
        TransferSyntax.ImplicitVRLittleEndian
      );
      const pixel = new Pixel(image.getElements(), image.getTransferSyntaxUid());

      // Test first frame
      const frameBuffer0 = pixel._getFrameBuffer(0);
      expect(frameBuffer0).to.be.instanceof(Uint8Array);
      expect(Array.from(frameBuffer0)).to.deep.equal([1, 2, 3, 4]);

      // Test second frame
      const frameBuffer1 = pixel._getFrameBuffer(1);
      expect(frameBuffer1).to.be.instanceof(Uint8Array);
      expect(Array.from(frameBuffer1)).to.deep.equal([5, 6, 7, 8]);
    });

    it('should get frame buffer for 16-bit uncompressed data', () => {
      const image = new DicomImage(
        {
          Rows: 2,
          Columns: 2,
          BitsStored: 16,
          BitsAllocated: 16,
          SamplesPerPixel: 1,
          PhotometricInterpretation: PhotometricInterpretation.Monochrome2,
          PixelData: [new Uint16Array([1000, 2000, 3000, 4000]).buffer],
        },
        TransferSyntax.ImplicitVRLittleEndian
      );
      const pixel = new Pixel(image.getElements(), image.getTransferSyntaxUid());

      const frameBuffer = pixel._getFrameBuffer(0);

      expect(frameBuffer).to.be.instanceof(Uint8Array);
      expect(frameBuffer.length).to.equal(8); // 4 pixels * 2 bytes per pixel

      // Convert back to 16-bit to verify
      const uint16View = new Uint16Array(
        frameBuffer.buffer,
        frameBuffer.byteOffset,
        frameBuffer.byteLength / 2
      );
      expect(Array.from(uint16View)).to.deep.equal([1000, 2000, 3000, 4000]);
    });

    it('should throw error when getting frame buffer with invalid parameters', () => {
      const image = new DicomImage(
        {
          Rows: 2,
          Columns: 2,
          BitsStored: 8,
          BitsAllocated: 8,
          SamplesPerPixel: 1,
          PhotometricInterpretation: PhotometricInterpretation.Monochrome2,
          PixelData: [Uint8Array.from([1, 2, 3, 4]).buffer],
        },
        TransferSyntax.ImplicitVRLittleEndian
      );
      const pixel = new Pixel(image.getElements(), image.getTransferSyntaxUid());

      // Test frame out of range
      expect(() => {
        pixel._getFrameBuffer(-1);
      }).to.throw('Requested frame is out of range');

      expect(() => {
        pixel._getFrameBuffer(1);
      }).to.throw('Requested frame is out of range');
    });

    it('should throw error when getting frame buffer with missing pixel data', () => {
      const image = new DicomImage(
        {
          Rows: 2,
          Columns: 2,
          BitsStored: 8,
          BitsAllocated: 8,
          SamplesPerPixel: 1,
          PhotometricInterpretation: PhotometricInterpretation.Monochrome2,
          PixelData: [],
        },
        TransferSyntax.ImplicitVRLittleEndian
      );
      const pixel = new Pixel(image.getElements(), image.getTransferSyntaxUid());

      expect(() => {
        pixel._getFrameBuffer(0);
      }).to.throw('Could not extract pixel data');
    });
  });
  describe('_setFrameBuffer', () => {
    it('should set frame buffer for uncompressed single frame', () => {
      const image = new DicomImage(
        {
          Rows: 2,
          Columns: 2,
          BitsStored: 8,
          BitsAllocated: 8,
          SamplesPerPixel: 1,
          PhotometricInterpretation: PhotometricInterpretation.Monochrome2,
          PixelData: [Uint8Array.from([1, 2, 3, 4]).buffer],
        },
        TransferSyntax.ImplicitVRLittleEndian
      );
      const pixel = new Pixel(image.getElements(), image.getTransferSyntaxUid());

      const newFrameData = new Uint8Array([10, 20, 30, 40]);
      pixel._setFrameBuffer(0, newFrameData);

      // Verify the data was set correctly by getting it back
      const retrievedFrameBuffer = pixel._getFrameBuffer(0);
      expect(Array.from(retrievedFrameBuffer)).to.deep.equal([10, 20, 30, 40]);
    });

    it('should set frame buffer for uncompressed multiple frames', () => {
      const image = new DicomImage(
        {
          Rows: 2,
          Columns: 2,
          BitsStored: 8,
          BitsAllocated: 8,
          SamplesPerPixel: 1,
          NumberOfFrames: 2,
          PhotometricInterpretation: PhotometricInterpretation.Monochrome2,
          PixelData: [Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]).buffer],
        },
        TransferSyntax.ImplicitVRLittleEndian
      );
      const pixel = new Pixel(image.getElements(), image.getTransferSyntaxUid());

      // Set second frame - using 8-bit values (0-255)
      const newFrameData = new Uint8Array([100, 200, 150, 250]);
      pixel._setFrameBuffer(1, newFrameData);

      // Verify the second frame was set correctly
      const retrievedFrame1 = pixel._getFrameBuffer(1);
      expect(Array.from(retrievedFrame1)).to.deep.equal([100, 200, 150, 250]);

      // Verify the first frame was not affected
      const retrievedFrame0 = pixel._getFrameBuffer(0);
      expect(Array.from(retrievedFrame0)).to.deep.equal([1, 2, 3, 4]);
    });

    it('should set frame buffer for 16-bit uncompressed data', () => {
      const image = new DicomImage(
        {
          Rows: 2,
          Columns: 2,
          BitsStored: 16,
          BitsAllocated: 16,
          SamplesPerPixel: 1,
          PhotometricInterpretation: PhotometricInterpretation.Monochrome2,
          PixelData: [new Uint16Array([1000, 2000, 3000, 4000]).buffer],
        },
        TransferSyntax.ImplicitVRLittleEndian
      );
      const pixel = new Pixel(image.getElements(), image.getTransferSyntaxUid());

      // Create new frame data as bytes
      const newFrameData = new Uint8Array(new Uint16Array([5000, 6000, 7000, 8000]).buffer);
      pixel._setFrameBuffer(0, newFrameData);

      // Verify the data was set correctly
      const retrievedFrameBuffer = pixel._getFrameBuffer(0);
      const uint16View = new Uint16Array(
        retrievedFrameBuffer.buffer,
        retrievedFrameBuffer.byteOffset,
        retrievedFrameBuffer.byteLength / 2
      );
      expect(Array.from(uint16View)).to.deep.equal([5000, 6000, 7000, 8000]);
    });

    it('should throw error when setting frame buffer with invalid parameters', () => {
      const image = new DicomImage(
        {
          Rows: 2,
          Columns: 2,
          BitsStored: 8,
          BitsAllocated: 8,
          SamplesPerPixel: 1,
          PhotometricInterpretation: PhotometricInterpretation.Monochrome2,
          PixelData: [Uint8Array.from([1, 2, 3, 4]).buffer],
        },
        TransferSyntax.ImplicitVRLittleEndian
      );
      const pixel = new Pixel(image.getElements(), image.getTransferSyntaxUid());

      const validFrameData = new Uint8Array([10, 20, 30, 40]);

      // Test frame out of range
      expect(() => {
        pixel._setFrameBuffer(-1, validFrameData);
      }).to.throw('Requested frame is out of range');

      expect(() => {
        pixel._setFrameBuffer(1, validFrameData);
      }).to.throw('Requested frame is out of range');

      // Test invalid frame data
      expect(() => {
        pixel._setFrameBuffer(0, null);
      }).to.throw('Frame data must be a Uint8Array');

      expect(() => {
        pixel._setFrameBuffer(0, 'invalid');
      }).to.throw('Frame data must be a Uint8Array');
    });

    it('should handle big endian byte swapping correctly', () => {
      const image = new DicomImage(
        {
          Rows: 2,
          Columns: 2,
          BitsStored: 16,
          BitsAllocated: 16,
          SamplesPerPixel: 1,
          PhotometricInterpretation: PhotometricInterpretation.Monochrome2,
          PixelData: [new Uint16Array([0x1234, 0x5678, 0x9abc, 0xdef0]).buffer],
        },
        TransferSyntax.ExplicitVRBigEndian
      );
      const pixel = new Pixel(image.getElements(), image.getTransferSyntaxUid());

      // Create new frame data
      const newData = new Uint16Array([0x1111, 0x2222, 0x3333, 0x4444]);
      const newFrameData = new Uint8Array(newData.buffer);

      // Set the new frame data
      pixel._setFrameBuffer(0, newFrameData);

      // Get the data back and verify
      const retrievedFrameBuffer = pixel._getFrameBuffer(0);
      const uint16View = new Uint16Array(
        retrievedFrameBuffer.buffer,
        retrievedFrameBuffer.byteOffset,
        retrievedFrameBuffer.byteLength / 2
      );
      expect(Array.from(uint16View)).to.deep.equal([0x1111, 0x2222, 0x3333, 0x4444]);
    });
  });

  describe('_getFrameBuffer & _setFrameBuffer roundtrip', () => {
    it('should perform complete roundtrip for uncompressed data', () => {
      // Test with various bit depths and configurations
      const testCases = [
        {
          name: '8-bit grayscale',
          config: {
            Rows: 3,
            Columns: 3,
            BitsStored: 8,
            BitsAllocated: 8,
            SamplesPerPixel: 1,
            PhotometricInterpretation: PhotometricInterpretation.Monochrome2,
            PixelData: [new Uint8Array([11, 22, 33, 44, 55, 66, 77, 88, 99]).buffer],
          },
          syntax: TransferSyntax.ImplicitVRLittleEndian,
          newData: new Uint8Array([111, 122, 133, 144, 155, 166, 177, 188, 199]),
        },
        {
          name: '16-bit grayscale',
          config: {
            Rows: 2,
            Columns: 2,
            BitsStored: 16,
            BitsAllocated: 16,
            SamplesPerPixel: 1,
            PhotometricInterpretation: PhotometricInterpretation.Monochrome2,
            PixelData: [new Uint16Array([1000, 2000, 3000, 4000]).buffer],
          },
          syntax: TransferSyntax.ExplicitVRLittleEndian,
          newData: new Uint8Array(new Uint16Array([5555, 6666, 7777, 8888]).buffer),
        },
        {
          name: '8-bit RGB',
          config: {
            Rows: 2,
            Columns: 2,
            BitsStored: 8,
            BitsAllocated: 8,
            SamplesPerPixel: 3,
            PhotometricInterpretation: PhotometricInterpretation.Rgb,
            PixelData: [new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255]).buffer],
          },
          syntax: TransferSyntax.ExplicitVRLittleEndian,
          newData: new Uint8Array([128, 64, 32, 16, 8, 4, 2, 1, 200, 100, 50, 25]),
        },
      ];

      testCases.forEach(({ name, config, syntax, newData }) => {
        const image = new DicomImage(config, syntax);
        const pixel = new Pixel(image.getElements(), image.getTransferSyntaxUid());

        // Get original frame buffer
        const originalFrameBuffer = pixel._getFrameBuffer(0);

        // Set new frame data
        pixel._setFrameBuffer(0, newData);

        // Get the data back
        const retrievedFrameBuffer = pixel._getFrameBuffer(0);

        // Verify roundtrip worked
        expect(Array.from(retrievedFrameBuffer)).to.deep.equal(
          Array.from(newData),
          `Failed for ${name}`
        );

        // Verify original data is different (unless by coincidence)
        if (originalFrameBuffer.length === newData.length) {
          const originalArray = Array.from(originalFrameBuffer);
          const newArray = Array.from(newData);
          expect(originalArray).to.not.deep.equal(
            newArray,
            `Original and new data should be different for ${name}`
          );
        }
      });
    });

    it('should handle multi-frame roundtrip correctly', () => {
      const image = new DicomImage(
        {
          Rows: 2,
          Columns: 2,
          BitsStored: 8,
          BitsAllocated: 8,
          SamplesPerPixel: 1,
          NumberOfFrames: 3,
          PhotometricInterpretation: PhotometricInterpretation.Monochrome2,
          PixelData: [
            new Uint8Array([
              // Frame 0
              1, 2, 3, 4,
              // Frame 1
              5, 6, 7, 8,
              // Frame 2
              9, 10, 11, 12,
            ]).buffer,
          ],
        },
        TransferSyntax.ImplicitVRLittleEndian
      );
      const pixel = new Pixel(image.getElements(), image.getTransferSyntaxUid());

      // Get original frame buffers
      const originalFrame0 = pixel._getFrameBuffer(0);
      const originalFrame1 = pixel._getFrameBuffer(1);
      const originalFrame2 = pixel._getFrameBuffer(2);

      // Create new frame data - using 8-bit values (0-255)
      const newFrame0Data = new Uint8Array([100, 101, 102, 103]);
      const newFrame1Data = new Uint8Array([200, 201, 202, 203]);
      const newFrame2Data = new Uint8Array([240, 241, 242, 243]);

      // Set new frame data
      pixel._setFrameBuffer(0, newFrame0Data);
      pixel._setFrameBuffer(1, newFrame1Data);
      pixel._setFrameBuffer(2, newFrame2Data);

      // Get the data back
      const retrievedFrame0 = pixel._getFrameBuffer(0);
      const retrievedFrame1 = pixel._getFrameBuffer(1);
      const retrievedFrame2 = pixel._getFrameBuffer(2);

      // Verify roundtrip worked for all frames
      expect(Array.from(retrievedFrame0)).to.deep.equal([100, 101, 102, 103]);
      expect(Array.from(retrievedFrame1)).to.deep.equal([200, 201, 202, 203]);
      expect(Array.from(retrievedFrame2)).to.deep.equal([240, 241, 242, 243]);

      // Verify original data is different
      expect(Array.from(retrievedFrame0)).to.not.deep.equal(Array.from(originalFrame0));
      expect(Array.from(retrievedFrame1)).to.not.deep.equal(Array.from(originalFrame1));
      expect(Array.from(retrievedFrame2)).to.not.deep.equal(Array.from(originalFrame2));
    });

    it('should handle frame buffer operations with pixel padding', () => {
      const image = new DicomImage(
        {
          Rows: 2,
          Columns: 2,
          BitsStored: 16,
          BitsAllocated: 16,
          SamplesPerPixel: 1,
          PhotometricInterpretation: PhotometricInterpretation.Monochrome2,
          PixelPaddingValue: 0,
          PixelData: [new Uint16Array([1000, 0, 3000, 0]).buffer],
        },
        TransferSyntax.ImplicitVRLittleEndian
      );
      const pixel = new Pixel(image.getElements(), image.getTransferSyntaxUid());

      // Get original frame buffer
      const originalFrameBuffer = pixel._getFrameBuffer(0);
      const originalUint16View = new Uint16Array(
        originalFrameBuffer.buffer,
        originalFrameBuffer.byteOffset,
        originalFrameBuffer.byteLength / 2
      );
      expect(Array.from(originalUint16View)).to.deep.equal([1000, 0, 3000, 0]);

      // Set new frame data with different padding
      const newData = new Uint16Array([2000, 65535, 4000, 65535]);
      const newFrameData = new Uint8Array(newData.buffer);
      pixel._setFrameBuffer(0, newFrameData);

      // Get the data back
      const retrievedFrameBuffer = pixel._getFrameBuffer(0);
      const retrievedUint16View = new Uint16Array(
        retrievedFrameBuffer.buffer,
        retrievedFrameBuffer.byteOffset,
        retrievedFrameBuffer.byteLength / 2
      );
      expect(Array.from(retrievedUint16View)).to.deep.equal([2000, 65535, 4000, 65535]);
    });
  });
});
