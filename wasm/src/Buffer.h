#pragma once
#include <memory>

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
struct Buffer {
  Buffer() {}
  virtual ~Buffer() {}

  uint8_t *GetData() const { return buffer_.get(); }
  size_t GetSize() const { return size_; }
  void Reset(size_t const size) {
    buffer_.reset(new uint8_t[size]);
    memset(GetData(), 0, size);
    size_ = size;
  }

  Buffer(Buffer const &) = delete;
  Buffer &operator=(Buffer const &) = delete;

private:
  std::unique_ptr<uint8_t[]> buffer_;
  size_t size_ = 0;
};
