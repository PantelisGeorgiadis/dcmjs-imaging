#pragma once

#include <cstdio>

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
class RleDecoder {
public:
  RleDecoder(uint8_t const *data, size_t const size);
  ~RleDecoder();

  int32_t GetNumberOfSegments() const { return segmentCount_; }
  void DecodeSegment(int32_t segment, uint8_t *buffer, size_t size,
                     int32_t start, int32_t sampleOffset);

  RleDecoder(RleDecoder const &) = delete;
  RleDecoder &operator=(RleDecoder const &) = delete;

private:
  uint8_t const *data_;
  size_t size_;

  int32_t segmentCount_;
  int32_t *offsets_;

  void Decode(uint8_t *buffer, size_t size, int32_t start, int32_t sampleOffset,
              uint8_t const *rleData, int32_t offset, int32_t count);
  int32_t GetSegmentOffset(int32_t segment) const;
  int32_t GetSegmentLength(int32_t segment) const;
};
