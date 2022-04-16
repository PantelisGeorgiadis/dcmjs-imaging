#include "RleDecoder.h"
#include "Exception.h"

#include <string>

using namespace std;

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
struct ByteReader {
public:
  ByteReader(uint8_t const *data, size_t const size)
      : data_(data), size_(size), pointer_(0) {}
  virtual ~ByteReader() {}

  uint32_t ReadUInt32() {
    uint32_t ret;
    auto dst = reinterpret_cast<uint8_t *>(&ret);
    auto src = const_cast<uint8_t *>(&data_[pointer_]);
    memcpy(dst, src, sizeof(uint32_t));
    pointer_ += sizeof(uint32_t);

    return ret;
  }

  int32_t ReadInt32() {
    int32_t ret;
    auto dst = reinterpret_cast<uint8_t *>(&ret);
    auto src = const_cast<uint8_t *>(&data_[pointer_]);
    memcpy(dst, src, sizeof(int32_t));
    pointer_ += sizeof(int32_t);

    return ret;
  }

  ByteReader(ByteReader const &) = delete;
  ByteReader &operator=(ByteReader const &) = delete;

private:
  uint8_t const *data_;
  size_t size_;
  uint64_t pointer_;
};

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
RleDecoder::RleDecoder(uint8_t const *data, size_t const size)
    : data_(data), size_(size), segmentCount_(0), offsets_(nullptr) {
  ByteReader reader(data, size);
  segmentCount_ = reader.ReadUInt32();
  offsets_ = new int32_t[15];
  for (auto i = 0; i < 15; i++) {
    offsets_[i] = reader.ReadInt32();
  }
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
RleDecoder::~RleDecoder() { delete offsets_; }

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
void RleDecoder::DecodeSegment(int32_t segment, uint8_t *buffer, size_t size,
                               int32_t start, int32_t sampleOffset) {
  if (segment < 0 || segment >= segmentCount_) {
    ThrowNativePixelDecoderException(
        "RleDecoder::DecodeSegment::Segment number out of range (" +
        to_string(segment) + ")");
  }
  auto const offset = GetSegmentOffset(segment);
  auto const length = GetSegmentLength(segment);
  Decode(buffer, size, start, sampleOffset, data_, offset, length);
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
void RleDecoder::Decode(uint8_t *buffer, size_t size, int32_t start,
                        int32_t sampleOffset, uint8_t const *rleData,
                        int32_t offset, int32_t count) {
  auto pos = start;
  auto const end = offset + count;
  auto const bufferLength = size;

  for (auto i = offset; i < end && pos < bufferLength;) {
    auto const control = static_cast<int8_t>(rleData[i++]);
    if (control >= 0) {
      auto length = control + 1;
      if ((end - i) < length) {
        ThrowNativePixelDecoderException(
            "RleDecoder::Decode::RLE literal run exceeds input buffer length");
      }
      if ((pos + ((length - 1) * sampleOffset)) >= bufferLength) {
        ThrowNativePixelDecoderException(
            "RleDecoder::Decode::RLE literal run exceeds output buffer length");
      }
      if (sampleOffset == 1) {
        memcpy(&buffer[pos], &rleData[i], length);
        pos += length;
        i += length;
      } else {
        while (length-- > 0) {
          buffer[pos] = rleData[i++];
          pos += sampleOffset;
        }
      }
    } else if (control >= -127) {
      auto length = -control;
      if ((pos + ((length - 1) * sampleOffset)) >= bufferLength) {
        ThrowNativePixelDecoderException(
            "RleDecoder::Decode::RLE repeat run exceeds output buffer length.");
      }
      auto const b = rleData[i++];
      if (sampleOffset == 1) {
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
    if ((i + 1) >= end) {
      break;
    }
  }
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
int32_t RleDecoder::GetSegmentOffset(int32_t segment) const {
  return offsets_[segment];
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
int32_t RleDecoder::GetSegmentLength(int32_t segment) const {
  auto const offset = GetSegmentOffset(segment);
  if (segment < (segmentCount_ - 1)) {
    auto const next = GetSegmentOffset(segment + 1);
    return next - offset;
  }

  return size_ - offset;
}
