#pragma once
#include "Buffer.h"

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
struct DecoderContext {
  size_t Columns = 0;
  size_t Rows = 0;
  size_t BitsAllocated = 0;
  size_t BitsStored = 0;
  size_t SamplesPerPixel = 0;
  size_t PixelRepresentation = 0;
  size_t PlanarConfiguration = 0;
  size_t PhotometricInterpretation = 0;

  Buffer EncodedBuffer;
  Buffer DecodedBuffer;
};
