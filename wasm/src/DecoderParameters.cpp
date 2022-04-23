#include "DecoderParameters.h"

extern "C" {
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
EMSCRIPTEN_KEEPALIVE DecoderParameters *CreateDecoderParameters(void) {
  return new DecoderParameters;
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
EMSCRIPTEN_KEEPALIVE void
ReleaseDecoderParameters(DecoderParameters const *params) {
  if (params) {
    delete params;
  }
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
EMSCRIPTEN_KEEPALIVE bool
GetConvertColorspaceToRgb(DecoderParameters const *params) {
  return params->ConvertColorspaceToRgb;
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
EMSCRIPTEN_KEEPALIVE void
SetConvertColorspaceToRgb(DecoderParameters *params,
                          bool const convertColorspaceToRgb) {
  params->ConvertColorspaceToRgb = convertColorspaceToRgb;
}
}
