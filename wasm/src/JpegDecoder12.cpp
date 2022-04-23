#include "JpegDecoder12.h"
#include "DecoderContext.h"
#include "Exception.h"
#include "Message.h"

#include <setjmp.h>

#include <jerror12.h>
#include <jpeglib12.h>

#include <algorithm>
#include <cstdio>
#include <string>
#include <vector>

using namespace std;

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
void JpegInitSource12(j_decompress_ptr dinfo) {}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
boolean JpegFillInputBuffer12(j_decompress_ptr dinfo) {
  static uint8_t buf[4] = {0xff, 0xd9, 0, 0};
  dinfo->src->next_input_byte = buf;
  dinfo->src->bytes_in_buffer = 2;

  return TRUE;
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
void JpegSkipInputData12(j_decompress_ptr dinfo, long nBytes) {
  auto &src = *dinfo->src;
  if (nBytes > 0) {
    while (nBytes > static_cast<long>(src.bytes_in_buffer)) {
      nBytes -= static_cast<long>(src.bytes_in_buffer);
      (*src.fill_input_buffer)(dinfo);
    }
    src.next_input_byte += nBytes;
    src.bytes_in_buffer -= nBytes;
  }
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
void JpegTermSource12(j_decompress_ptr dinfo) {}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
void ErrorExit12(j_common_ptr dinfo) {
  char buf[JMSG_LENGTH_MAX];
  (*dinfo->err->format_message)(dinfo, buf);
  ThrowNativePixelDecoderException("JpegDecoder12::ErrorExit12::" +
                                   string(buf));
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
void OutputMessage12(j_common_ptr dinfo) {
  char buf[JMSG_LENGTH_MAX];
  (*dinfo->err->format_message)(dinfo, buf);
  OutputNativePixelDecoderMessage("JpegDecoder12::OutputMessage12::" +
                                  string(buf));
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
void EmitMessage12(j_common_ptr dinfo, int messageLevel) {
  char buf[JMSG_LENGTH_MAX];
  (*dinfo->err->format_message)(dinfo, buf);
  OutputNativePixelDecoderMessage("JpegDecoder12::EmitMessage12::" +
                                  string(buf));
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
void DecodeJpeg12(DecoderContext *ctx, DecoderParameters *params) {
  jpeg_error_mgr jerr;

  jpeg_decompress_struct dinfo;
  dinfo.err = jpeg_std_error(&jerr);
  dinfo.err->error_exit = ErrorExit12;
  dinfo.err->output_message = OutputMessage12;
  dinfo.err->emit_message = EmitMessage12;
  jpeg_create_decompress(&dinfo);

  jpeg_source_mgr src;
  memset(&src, 0, sizeof(src));

  src.init_source = JpegInitSource12;
  src.fill_input_buffer = JpegFillInputBuffer12;
  src.skip_input_data = JpegSkipInputData12;
  src.resync_to_restart = jpeg_resync_to_restart;
  src.term_source = JpegTermSource12;
  src.bytes_in_buffer = GetEncodedBufferSize(ctx);
  src.next_input_byte = GetEncodedBuffer(ctx);
  dinfo.src = &src;

  if (jpeg_read_header(&dinfo, TRUE) == JPEG_SUSPENDED) {
    ThrowNativePixelDecoderException(
        "JpegDecoder12::DecodeJpeg12::jpeg_read_header::Suspended");
  }

  if (params->ConvertColorspaceToRgb && (dinfo.out_color_space == JCS_YCbCr ||
                                         dinfo.out_color_space == JCS_RGB)) {
    if (GetPixelRepresentation(ctx) == 1) {
      ThrowNativePixelDecoderException("JpegDecoder12::DecodeJpeg12::JPEG "
                                       "codec unable to perform colorspace "
                                       "conversion on signed pixel data");
    }
    dinfo.out_color_space = JCS_RGB;
  } else {
    dinfo.jpeg_color_space = JCS_UNKNOWN;
    dinfo.out_color_space = JCS_UNKNOWN;
  }

  auto const bytesAllocated =
      (GetBitsAllocated(ctx) / 8) + ((GetBitsAllocated(ctx) % 8 == 0) ? 0 : 1);
  auto const decodedBufferSize = dinfo.image_width * dinfo.image_height *
                                 bytesAllocated * dinfo.num_components;
  SetDecodedBufferSize(ctx, decodedBufferSize);

  jpeg_start_decompress(&dinfo);

  vector<JSAMPLE *> rows;
  auto const scanlineBytes =
      dinfo.image_width * bytesAllocated * dinfo.num_components;
  auto pDecodedBuffer = GetDecodedBuffer(ctx);
  while (dinfo.output_scanline < dinfo.output_height) {
    auto const height = min<size_t>(dinfo.output_height - dinfo.output_scanline,
                                    dinfo.rec_outbuf_height);
    rows.resize(height);
    auto ptr = pDecodedBuffer;
    for (auto i = 0u; i < height; ++i, ptr += scanlineBytes) {
      rows[i] = reinterpret_cast<JSAMPLE *>(ptr);
    }
    auto const n =
        jpeg_read_scanlines(&dinfo, &rows[0], dinfo.rec_outbuf_height);
    pDecodedBuffer += scanlineBytes * n;
  }

  jpeg_finish_decompress(&dinfo);
  jpeg_destroy_decompress(&dinfo);
}
