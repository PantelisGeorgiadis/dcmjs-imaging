#include "Jpeg2000EncodedBuffer.h"
#include "Exception.h"
#include "Message.h"

#include <algorithm>
#include <limits>

using namespace std;

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
OPJ_SIZE_T OpjReadFromMemory(void *pBuffer, OPJ_SIZE_T nBytes,
                             Jpeg2000EncodedBuffer *pEncodedBuffer) {
  if (!pEncodedBuffer || !pEncodedBuffer->SrcData ||
      pEncodedBuffer->SrcSize == 0) {
    return -1;
  }
  if (pEncodedBuffer->Offset >= pEncodedBuffer->SrcSize) {
    return -1;
  }

  auto const bufferLength = pEncodedBuffer->SrcSize - pEncodedBuffer->Offset;
  auto const readlength = nBytes < bufferLength ? nBytes : bufferLength;
  memcpy(pBuffer, &pEncodedBuffer->SrcData[pEncodedBuffer->Offset], readlength);
  pEncodedBuffer->Offset += readlength;

  return readlength;
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
OPJ_SIZE_T OpjWriteToMemory(void *pBuffer, OPJ_SIZE_T nBytes,
                            Jpeg2000EncodedBuffer *pEncodedBuffer) {
  if (!pEncodedBuffer || !pEncodedBuffer->SrcData ||
      pEncodedBuffer->SrcSize == 0) {
    return -1;
  }
  if (pEncodedBuffer->Offset >= pEncodedBuffer->SrcSize) {
    return -1;
  }

  auto const bufferLength = pEncodedBuffer->SrcSize - pEncodedBuffer->Offset;
  auto const writeLength = nBytes < bufferLength ? nBytes : bufferLength;
  memcpy(&pEncodedBuffer->SrcData[pEncodedBuffer->Offset], pBuffer,
         writeLength);
  pEncodedBuffer->Offset += writeLength;

  return writeLength;
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
OPJ_OFF_T OpjSkipFromMemory(OPJ_OFF_T nBytes,
                            Jpeg2000EncodedBuffer *pEncodedBuffer) {
  if (!pEncodedBuffer || !pEncodedBuffer->SrcData ||
      pEncodedBuffer->SrcSize == 0) {
    return -1;
  }
  if (nBytes < 0) {
    return -1;
  }
  if (pEncodedBuffer->Offset > numeric_limits<OPJ_SIZE_T>::max() - nBytes) {
    return -1;
  }

  auto const newoffset = pEncodedBuffer->Offset + nBytes;
  if (newoffset > pEncodedBuffer->SrcSize) {
    nBytes = pEncodedBuffer->SrcSize - pEncodedBuffer->Offset;
    pEncodedBuffer->Offset = pEncodedBuffer->SrcSize;
  } else {
    pEncodedBuffer->Offset = newoffset;
  }

  return nBytes;
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
OPJ_BOOL OpjSeekFromMemory(OPJ_OFF_T nBytes,
                           Jpeg2000EncodedBuffer *pEncodedBuffer) {
  if (!pEncodedBuffer || !pEncodedBuffer->SrcData ||
      pEncodedBuffer->SrcSize == 0) {
    return OPJ_FALSE;
  }
  if (nBytes < 0) {
    return OPJ_FALSE;
  }

  pEncodedBuffer->Offset =
      min(static_cast<OPJ_SIZE_T>(nBytes), pEncodedBuffer->SrcSize);

  return OPJ_TRUE;
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
opj_stream_t *OPJ_CALLCONV
OpjCreateMemoryStream(Jpeg2000EncodedBuffer *pEncodedBuffer,
                      OPJ_UINT32 const size, bool const isReadStream) {
  if (!pEncodedBuffer) {
    return nullptr;
  }

  auto pStream = opj_stream_create(size, isReadStream);
  if (!pStream) {
    return nullptr;
  }

  opj_stream_set_user_data(pStream, pEncodedBuffer, nullptr);
  opj_stream_set_user_data_length(pStream, pEncodedBuffer->SrcSize);
  opj_stream_set_read_function(
      pStream, reinterpret_cast<opj_stream_read_fn>(OpjReadFromMemory));
  opj_stream_set_write_function(
      pStream, reinterpret_cast<opj_stream_write_fn>(OpjWriteToMemory));
  opj_stream_set_skip_function(
      pStream, reinterpret_cast<opj_stream_skip_fn>(OpjSkipFromMemory));
  opj_stream_set_seek_function(
      pStream, reinterpret_cast<opj_stream_seek_fn>(OpjSeekFromMemory));

  return pStream;
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
void OpjMessageCallbackInfo(char const *msg, void *unused) {
  OutputNativePixelDecoderMessage(
      "Jpeg2000EncodedBuffer::OpjMessageCallbackInfo::" + string(msg));
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
void OpjMessageCallbackWarning(char const *msg, void *unused) {
  OutputNativePixelDecoderMessage(
      "Jpeg2000EncodedBuffer::OpjMessageCallbackWarning::" + string(msg));
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
void OpjMessageCallbackError(char const *msg, void *unused) {
  ThrowNativePixelDecoderException(
      "Jpeg2000EncodedBuffer::OpjMessageCallbackError::" + string(msg));
}
