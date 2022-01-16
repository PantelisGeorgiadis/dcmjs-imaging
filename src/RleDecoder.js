//#region RleDecoder
class RleDecoder {
  /**
   * Creates an instance of RleDecoder.
   * @constructor
   * @param {Uint8Array} data - RLE encoded data.
   */
  constructor(data) {
    const view = new DataView(data.buffer);
    this.numberOfSegments = view.getInt32(0, true);

    this.offsets = [];
    for (let i = 0; i < 15; ++i) {
      this.offsets[i] = view.getInt32(Int32Array.BYTES_PER_ELEMENT * (i + 1), true);
    }

    this.data = data;
  }

  /**
   * Gets number of segments.
   * @method
   * @returns {number} Number of segments.
   */
  getNumberOfSegments() {
    return this.numberOfSegments;
  }

  /**
   * Gets segment offset.
   * @method
   * @param {number} segment - Segment index.
   * @returns {number} Segment offset.
   */
  getSegmentOffset(segment) {
    return this.offsets[segment];
  }

  /**
   * Gets segment length.
   * @method
   * @param {number} segment - Segment index.
   * @returns {number} Segment length.
   */
  getSegmentLength(segment) {
    const offset = this.getSegmentOffset(segment);
    if (segment < this.getNumberOfSegments() - 1) {
      const next = this.getSegmentOffset(segment + 1);
      return next - offset;
    }

    return this.data.length - offset;
  }

  /**
   * Decodes a segment.
   * @method
   * @param {number} segment - Segment index.
   * @param {Uint8Array} decodedData - Decoded data.
   * @param {number} start - Decoded data start index.
   * @param {number} sampleOffset - Decoded data sample offset.
   */
  decodeSegment(segment, decodedData, start, sampleOffset) {
    if (segment < 0 || segment >= this.getNumberOfSegments()) {
      throw new Error('Segment number out of range');
    }
    const offset = this.getSegmentOffset(segment);
    const length = this.getSegmentLength(segment);
    this._decode(decodedData, start, sampleOffset, this.data, offset, length);
  }

  /**
   * Converts value to signed integer.
   * @method
   * @private
   * @param {number} val - Value.
   * @param {number} bitwidth - Bit width.
   */
  _uncomplement(val, bitwidth) {
    const isNegative = val & (1 << (bitwidth - 1));
    const boundary = 1 << bitwidth;
    const minval = -boundary;
    const mask = boundary - 1;

    return isNegative ? minval + (val & mask) : val;
  }

  /**
   * Performs the actual segment decoding.
   * @method
   * @private
   * @param {Uint8Array} decodedData - Decoded data.
   * @param {number} start - Decoded data start index.
   * @param {number} sampleOffset - Decoded data sample offset.
   * @param {Uint8Array} data - RLE encoded data.
   * @param {number} offset - RLE encoded data offset.
   * @param {number} count - RLE encoded data count.
   */
  _decode(buffer, start, sampleOffset, rleData, offset, count) {
    let pos = start;
    const end = offset + count;
    const bufferLength = buffer.length;

    for (let i = offset; i < end && pos < bufferLength; ) {
      const control = this._uncomplement(rleData[i++], 8);
      if (control >= 0) {
        let length = control + 1;
        if (end - i < length) {
          throw new Error('RLE literal run exceeds input buffer length');
        }
        if (pos + (length - 1) * sampleOffset >= bufferLength) {
          throw new Error('RLE literal run exceeds output buffer length');
        }
        if (sampleOffset === 1) {
          for (let j = 0; j < length; ++j, ++i, ++pos) {
            buffer[pos] = rleData[i];
          }
        } else {
          while (length-- > 0) {
            buffer[pos] = rleData[i++];
            pos += sampleOffset;
          }
        }
      } else if (control >= -127) {
        let length = -control;
        if (pos + (length - 1) * sampleOffset >= bufferLength) {
          throw new Error('RLE repeat run exceeds output buffer length');
        }
        const b = rleData[i++];
        if (sampleOffset === 1) {
          while (length-- >= 0) {
            buffer[pos++] = b;
          }
        } else {
          while (length-- >= 0) {
            buffer[pos] = b;
            pos += sampleOffset;
          }
        }
      }
      if (i + 1 >= end) {
        break;
      }
    }
  }
}

//#region Exports
module.exports = RleDecoder;
//#endregion
