#include <emscripten.h>

#include "Buffer.h"
#include "DecoderContext.h"
#include "DecoderParameters.h"
#include "Exception.h"

#include "RleDecoder.h"

#include "JpegDecoder.h"
#include "JpegDecoder12.h"
#include "JpegDecoder16.h"
#include "JpegDecoder8.h"

#include <charls/charls.h>

#include "Jpeg2000EncodedBuffer.h"
#include <opj_includes.h>

using namespace std;
using namespace charls;

#define JP2_RFC3745_MAGIC "\x00\x00\x00\x0c\x6a\x50\x20\x20\x0d\x0a\x87\x0a"
#define JP2_MAGIC "\x0d\x0a\x87\x0a"
#define J2K_CODESTREAM_MAGIC "\xff\x4f\xff\x51"

extern "C" {
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
EMSCRIPTEN_KEEPALIVE void DecodeRle(DecoderContext *ctx,
                                    DecoderParameters *params) {
  RleDecoder decoder(GetEncodedBuffer(ctx), GetEncodedBufferSize(ctx));

  auto const bytesAllocated =
      (GetBitsAllocated(ctx) / 8) + ((GetBitsAllocated(ctx) % 8 == 0) ? 0 : 1);
  auto const pixelCount = GetColumns(ctx) * GetRows(ctx);

  auto const decodedBufferSize =
      pixelCount * bytesAllocated * GetSamplesPerPixel(ctx);
  SetDecodedBufferSize(ctx, decodedBufferSize);
  auto pDest = GetDecodedBuffer(ctx);

  for (auto s = 0; s < decoder.GetNumberOfSegments(); s++) {
    auto const sample = s / bytesAllocated;
    auto const sabyte = s % bytesAllocated;

    auto pos = GetPlanarConfiguration(ctx) == 0
                   ? sample * bytesAllocated
                   : sample * bytesAllocated * pixelCount;
    pos += bytesAllocated - sabyte - 1;
    auto const offset = GetPlanarConfiguration(ctx) == 0
                            ? GetSamplesPerPixel(ctx) * bytesAllocated
                            : bytesAllocated;

    decoder.DecodeSegment(s, pDest, decodedBufferSize, pos, offset);
  }
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
EMSCRIPTEN_KEEPALIVE void DecodeJpeg(DecoderContext *ctx,
                                     DecoderParameters *params) {
  auto jpegBitDepth =
      ScanJpegDataForBitDepth(GetEncodedBuffer(ctx), GetEncodedBufferSize(ctx));
  if (jpegBitDepth == 0) {
    jpegBitDepth = GetBitsStored(ctx);
  }
  if (jpegBitDepth == 0) {
    ThrowNativePixelDecoderException("DecodeJpeg::Jpeg bit depth is 0");
  }

  if (jpegBitDepth <= 8) {
    DecodeJpeg8(ctx, params);
  } else if (jpegBitDepth <= 12) {
    DecodeJpeg12(ctx, params);
  } else if (jpegBitDepth <= 16) {
    DecodeJpeg16(ctx, params);
  } else {
    ThrowNativePixelDecoderException(
        "DecodeJpeg::Unsupported Jpeg bit depth (" + to_string(jpegBitDepth) +
        ")");
  }
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
EMSCRIPTEN_KEEPALIVE void DecodeJpegLs(DecoderContext *ctx,
                                       DecoderParameters *params) {
  JlsParameters jlsParams;
  memset(&jlsParams, 0, sizeof(jlsParams));

  char errorMsg[256 + 1] = {'\0'};
  auto retCode = JpegLsReadHeader(
      GetEncodedBuffer(ctx), GetEncodedBufferSize(ctx), &jlsParams, errorMsg);
  if (retCode != ApiResult::OK) {
    ThrowNativePixelDecoderException("DecodeJpegLs::JpegLsReadHeader::" +
                                     string(errorMsg));
  }
  jlsParams.outputBgr = false;

  auto const bytesPerSample = (jlsParams.bitsPerSample / 8) +
                              (jlsParams.bitsPerSample % 8 == 0 ? 0 : 1);
  SetDecodedBufferSize(ctx, jlsParams.width * jlsParams.height *
                                jlsParams.components * bytesPerSample);

  retCode = JpegLsDecode(GetDecodedBuffer(ctx), GetDecodedBufferSize(ctx),
                         GetEncodedBuffer(ctx), GetEncodedBufferSize(ctx),
                         &jlsParams, errorMsg);
  if (retCode != ApiResult::OK) {
    ThrowNativePixelDecoderException("DecodeJpegLs::JpegLsDecode::" +
                                     string(errorMsg));
  }
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
EMSCRIPTEN_KEEPALIVE void DecodeJpeg2000(DecoderContext *ctx,
                                         DecoderParameters *params) {
  Jpeg2000EncodedBuffer sourceBuffer(GetEncodedBuffer(ctx),
                                     GetEncodedBufferSize(ctx));

  uint8_t buf12[12];
  auto codecFormat = OPJ_CODEC_FORMAT::OPJ_CODEC_UNKNOWN;
  memcpy(buf12, GetEncodedBuffer(ctx), 12 * sizeof(uint8_t));
  if (memcmp(buf12, JP2_RFC3745_MAGIC, 12) == 0 ||
      memcmp(buf12, JP2_MAGIC, 4) == 0) {
    codecFormat = OPJ_CODEC_FORMAT::OPJ_CODEC_JP2;
  } else if (memcmp(buf12, J2K_CODESTREAM_MAGIC, 4) == 0) {
    codecFormat = OPJ_CODEC_FORMAT::OPJ_CODEC_J2K;
  }

  opj_dparameters_t parameters;
  auto pStream =
      OpjCreateMemoryStream(&sourceBuffer, OPJ_J2K_STREAM_CHUNK_SIZE, true);
  if (!pStream) {
    ThrowNativePixelDecoderException(
        "DecodeJpeg2000::OpjCreateMemoryStream::Failed to create stream");
  }

  auto pCodec = opj_create_decompress(codecFormat);
  if (!pCodec) {
    opj_stream_destroy(pStream);
    ThrowNativePixelDecoderException(
        "DecodeJpeg2000::opj_create_decompress::Failed to create codec");
  }

  opj_set_info_handler(pCodec, OpjMessageCallbackInfo, nullptr);
  opj_set_warning_handler(pCodec, OpjMessageCallbackWarning, nullptr);
  opj_set_error_handler(pCodec, OpjMessageCallbackError, nullptr);

  opj_set_default_decoder_parameters(&parameters);
  if (!opj_setup_decoder(pCodec, &parameters)) {
    opj_stream_destroy(pStream);
    opj_destroy_codec(pCodec);
    ThrowNativePixelDecoderException(
        "DecodeJpeg2000::opj_setup_decoder::Failed to setup the decoder");
  }

  opj_image_t *pImage = nullptr;
  if (!opj_read_header(pStream, pCodec, &pImage)) {
    opj_stream_destroy(pStream);
    opj_destroy_codec(pCodec);
    opj_image_destroy(pImage);
    ThrowNativePixelDecoderException(
        "DecodeJpeg2000::opj_read_header::Failed to read the header");
  }

  if (!(opj_decode(pCodec, pStream, pImage) &&
        opj_end_decompress(pCodec, pStream))) {
    opj_stream_destroy(pStream);
    opj_destroy_codec(pCodec);
    opj_image_destroy(pImage);
    ThrowNativePixelDecoderException(
        "DecodeJpeg2000::opj_decode::Failed to decode image");
  }

  auto const depth = (pImage->comps[0].prec + 7) / 8;
  auto const decodedBufferSize =
      GetColumns(ctx) * GetRows(ctx) * pImage->numcomps * depth;
  SetDecodedBufferSize(ctx, decodedBufferSize);

  auto const numPixels = GetColumns(ctx) * GetRows(ctx);
  if (pImage->numcomps == 1) {
    if (pImage->comps[0].prec <= 8) {
      auto pDest = GetDecodedBuffer(ctx);
      auto pSource = pImage->comps[0].data;
      for (auto i = numPixels; i; i--) {
        *pDest++ = *pSource++;
      }
    }
    if (pImage->comps[0].prec > 8) {
      auto pDest = reinterpret_cast<uint16_t *>(GetDecodedBuffer(ctx));
      auto pSource = pImage->comps[0].data;
      for (auto i = numPixels; i; i--) {
        *pDest++ = *pSource++;
      }
    }
  } else if (pImage->numcomps == 3) {
    if (GetPlanarConfiguration(ctx) == 0) {
      auto pDest = GetDecodedBuffer(ctx);
      auto pSourceR = pImage->comps[0].data;
      auto pSourceG = pImage->comps[1].data;
      auto pSourceB = pImage->comps[2].data;
      for (auto i = numPixels; i; i--) {
        *pDest++ = *pSourceR++;
        *pDest++ = *pSourceG++;
        *pDest++ = *pSourceB++;
      }
    } else if (GetPlanarConfiguration(ctx) == 1) {
      auto pDest = GetDecodedBuffer(ctx);
      for (auto j = 0; j < 3; j++) {
        auto pSource = pImage->comps[j].data;
        for (auto i = numPixels; i; i--) {
          *pDest++ = *pSource++;
        }
      }
    }
  }

  opj_stream_destroy(pStream);
  opj_destroy_codec(pCodec);
  opj_image_destroy(pImage);
}
}
