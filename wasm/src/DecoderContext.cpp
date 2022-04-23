#include "DecoderContext.h"

extern "C" {
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
EMSCRIPTEN_KEEPALIVE DecoderContext *CreateDecoderContext(void) {
  return new DecoderContext;
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
EMSCRIPTEN_KEEPALIVE void ReleaseDecoderContext(DecoderContext const *ctx) {
  if (ctx) {
    delete ctx;
  }
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
EMSCRIPTEN_KEEPALIVE size_t GetColumns(DecoderContext const *ctx) {
  return ctx->Columns;
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
EMSCRIPTEN_KEEPALIVE void SetColumns(DecoderContext *ctx,
                                     size_t const columns) {
  ctx->Columns = columns;
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
EMSCRIPTEN_KEEPALIVE size_t GetRows(DecoderContext const *ctx) {
  return ctx->Rows;
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
EMSCRIPTEN_KEEPALIVE void SetRows(DecoderContext *ctx, size_t const rows) {
  ctx->Rows = rows;
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
EMSCRIPTEN_KEEPALIVE size_t GetBitsAllocated(DecoderContext const *ctx) {
  return ctx->BitsAllocated;
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
EMSCRIPTEN_KEEPALIVE void SetBitsAllocated(DecoderContext *ctx,
                                           size_t const bitsAllocated) {
  ctx->BitsAllocated = bitsAllocated;
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
EMSCRIPTEN_KEEPALIVE size_t GetBitsStored(DecoderContext const *ctx) {
  return ctx->BitsStored;
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
EMSCRIPTEN_KEEPALIVE void SetBitsStored(DecoderContext *ctx,
                                        size_t const bitsStored) {
  ctx->BitsStored = bitsStored;
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
EMSCRIPTEN_KEEPALIVE size_t GetSamplesPerPixel(DecoderContext const *ctx) {
  return ctx->SamplesPerPixel;
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
EMSCRIPTEN_KEEPALIVE void SetSamplesPerPixel(DecoderContext *ctx,
                                             size_t const samplesPerPixel) {
  ctx->SamplesPerPixel = samplesPerPixel;
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
EMSCRIPTEN_KEEPALIVE size_t GetPixelRepresentation(DecoderContext const *ctx) {
  return ctx->PixelRepresentation;
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
EMSCRIPTEN_KEEPALIVE void
SetPixelRepresentation(DecoderContext *ctx, size_t const pixelRepresentation) {
  ctx->PixelRepresentation = pixelRepresentation;
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
EMSCRIPTEN_KEEPALIVE size_t GetPlanarConfiguration(DecoderContext const *ctx) {
  return ctx->PlanarConfiguration;
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
EMSCRIPTEN_KEEPALIVE void
SetPlanarConfiguration(DecoderContext *ctx, size_t const planarConfiguration) {
  ctx->PlanarConfiguration = planarConfiguration;
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
EMSCRIPTEN_KEEPALIVE size_t
GetPhotometricInterpretation(DecoderContext const *ctx) {
  return ctx->PhotometricInterpretation;
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
EMSCRIPTEN_KEEPALIVE void
SetPhotometricInterpretation(DecoderContext *ctx,
                             size_t const photometricInterpretation) {
  ctx->PhotometricInterpretation = photometricInterpretation;
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
EMSCRIPTEN_KEEPALIVE uint8_t *GetEncodedBuffer(DecoderContext const *ctx) {
  return ctx->EncodedBuffer.GetData();
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
EMSCRIPTEN_KEEPALIVE size_t GetEncodedBufferSize(DecoderContext const *ctx) {
  return ctx->EncodedBuffer.GetSize();
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
EMSCRIPTEN_KEEPALIVE void
SetEncodedBuffer(DecoderContext *ctx, uint8_t const *data, size_t const size) {
  ctx->EncodedBuffer.Reset(size);
  memcpy(ctx->EncodedBuffer.GetData(), data, size);
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
EMSCRIPTEN_KEEPALIVE void SetEncodedBufferSize(DecoderContext *ctx,
                                               size_t const size) {
  ctx->EncodedBuffer.Reset(size);
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
EMSCRIPTEN_KEEPALIVE uint8_t *GetDecodedBuffer(DecoderContext const *ctx) {
  return ctx->DecodedBuffer.GetData();
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
EMSCRIPTEN_KEEPALIVE size_t GetDecodedBufferSize(DecoderContext const *ctx) {
  return ctx->DecodedBuffer.GetSize();
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
EMSCRIPTEN_KEEPALIVE void
SetDecodedBuffer(DecoderContext *ctx, uint8_t const *data, size_t const size) {
  ctx->DecodedBuffer.Reset(size);
  memcpy(ctx->DecodedBuffer.GetData(), data, size);
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
EMSCRIPTEN_KEEPALIVE void SetDecodedBufferSize(DecoderContext *ctx,
                                               size_t const size) {
  ctx->DecodedBuffer.Reset(size);
}
}
