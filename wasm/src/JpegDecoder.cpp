#include "JpegDecoder.h"

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
uint16_t ReadUint16(uint8_t const *data) {
  return static_cast<uint16_t>(static_cast<uint16_t>(*data) << 8) |
         static_cast<uint16_t>(*(data + 1));
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
size_t ScanJpegDataForBitDepth(uint8_t const *data, size_t const nBytes) {
  if (data == nullptr || nBytes == 0) {
    return 0;
  }

  size_t offset = 0;
  while ((offset + 4) < nBytes) {
    switch (ReadUint16(data + offset)) {
    case 0xffc0:
      return data[offset + 4];
    case 0xffc1:
      return data[offset + 4];
    case 0xffc2:
      return data[offset + 4];
    case 0xffc3:
      return data[offset + 4];
    case 0xffc5:
      return data[offset + 4];
    case 0xffc6:
      return data[offset + 4];
    case 0xffc7:
      return data[offset + 4];
    case 0xffc8:
      offset += ReadUint16(data + offset + 2) + 2;
      break;
    case 0xffc9:
      return data[offset + 4];
    case 0xffca:
      return data[offset + 4];
    case 0xffcb:
      return data[offset + 4];
    case 0xffcd:
      return data[offset + 4];
    case 0xffce:
      return data[offset + 4];
    case 0xffcf:
      return data[offset + 4];
    case 0xffc4:
      offset += ReadUint16(data + offset + 2) + 2;
      break;
    case 0xffcc:
      offset += ReadUint16(data + offset + 2) + 2;
      break;
    case 0xffd0:
    case 0xffd1:
    case 0xffd2:
    case 0xffd3:
    case 0xffd4:
    case 0xffd5:
    case 0xffd6:
    case 0xffd7:
      offset += 2;
      break;
    case 0xffd8:
      offset += 2;
      break;
    case 0xffd9:
      offset += 2;
      break;
    case 0xffda:
      offset += ReadUint16(data + offset + 2) + 2;
      break;
    case 0xffdb:
      offset += ReadUint16(data + offset + 2) + 2;
      break;
    case 0xffdc:
      offset += ReadUint16(data + offset + 2) + 2;
      break;
    case 0xffdd:
      offset += ReadUint16(data + offset + 2) + 2;
      break;
    case 0xffde:
      offset += ReadUint16(data + offset + 2) + 2;
      break;
    case 0xffdf:
      offset += ReadUint16(data + offset + 2) + 2;
      break;
    case 0xffe0:
    case 0xffe1:
    case 0xffe2:
    case 0xffe3:
    case 0xffe4:
    case 0xffe5:
    case 0xffe6:
    case 0xffe7:
    case 0xffe8:
    case 0xffe9:
    case 0xffea:
    case 0xffeb:
    case 0xffec:
    case 0xffed:
    case 0xffee:
    case 0xffef:
      offset += ReadUint16(data + offset + 2) + 2;
      break;
    case 0xfff0:
    case 0xfff1:
    case 0xfff2:
    case 0xfff3:
    case 0xfff4:
    case 0xfff5:
    case 0xfff6:
    case 0xfff7:
    case 0xfff8:
    case 0xfff9:
    case 0xfffa:
    case 0xfffb:
    case 0xfffc:
    case 0xfffd:
      offset += ReadUint16(data + offset + 2) + 2;
      break;
    case 0xfffe:
      offset += ReadUint16(data + offset + 2) + 2;
      break;
    case 0xffff:
      offset += 1;
      break;
    case 0xff01:
      break;
    default:
      if ((data[offset] == 0xff) && (data[offset + 1] > 2) &&
          (data[offset + 1] <= 0xbf)) {
        offset += 2;
      } else {
        return 0;
      }
      break;
    }
  }

  return 0;
}
