#include "Exception.h"

#include <emscripten.h>
#include <stdexcept>

using namespace std;

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
EM_JS(void, onNativePixelDecoderException,
      (char const *message, size_t const len), {});

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
void ThrowNativePixelDecoderException(string const &message) {
  onNativePixelDecoderException(message.c_str(), message.length());

  throw runtime_error(message);
}
