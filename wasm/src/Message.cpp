#include "Message.h"

#include <emscripten.h>

using namespace std;

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
EM_JS(void, onNativePixelDecoderMessage,
      (char const *message, size_t const len), {});

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
void OutputNativePixelDecoderMessage(string const &message) {
  onNativePixelDecoderMessage(message.c_str(), message.length());
}
