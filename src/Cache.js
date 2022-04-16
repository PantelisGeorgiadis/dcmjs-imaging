const { PixelPipeline } = require('./Pixel');
const { LutPipeline } = require('./Lut');

//#region LruCache
class LruCache {
  /**
   * Creates an instance of LruCache.
   * @constructor
   * @param {number} max - Maximum items to hold.
   */
  constructor(max) {
    this.max = max;
    this.cache = new Map();
  }

  /**
   * Gets an item from the cache.
   * @method
   * @returns {Object|undefined} The cached object or undefined.
   */
  get(key) {
    const item = this.cache.get(key);
    if (item) {
      this.cache.delete(key);
      this.cache.set(key, item);
    }

    return item;
  }

  /**
   * Sets an item to the cache.
   * @method
   * @param {Object} key - The item's key.
   * @param {Object} value - The item's value.
   */
  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size === this.max) {
      this.cache.delete(this.cache.keys().next().value);
    }
    this.cache.set(key, value);
  }
}
//#endregion

//#region PixelPipelineCache
class PixelPipelineCache extends LruCache {
  /**
   * Creates an instance of PixelPipelineCache.
   * @constructor
   * @param {number} maxPipelines - Maximum pipelines to hold.
   */
  constructor(maxPipelines) {
    super(maxPipelines);
  }

  /**
   * Gets from the cache or creates a new pixel pipeline.
   * @method
   * @param {Pixel} pixel - Pixel object.
   * @param {number} [frame] - Frame index.
   * @returns {PixelPipeline} Pixel pipeline object.
   */
  getOrCreate(pixel, frame) {
    const cachedPipeline = this.get(frame);
    if (cachedPipeline !== undefined) {
      return cachedPipeline;
    }

    const pipeline = PixelPipeline.create(pixel, frame);
    this.set(frame, pipeline);

    return pipeline;
  }
}
//#endregion

//#region LutPipelineCache
class LutPipelineCache extends LruCache {
  /**
   * Creates an instance of LutPipelineCache.
   * @constructor
   * @param {number} maxPipelines - Maximum pipelines to hold.
   */
  constructor(maxPipelines) {
    super(maxPipelines);
  }

  /**
   * Gets from the cache or creates a new LUT pipeline.
   * @method
   * @param {Pixel} pixel - Pixel object.
   * @param {WindowLevel} windowLevel - User provided window/level.
   * @param {number} frame - Frame index.
   * @param {StandardColorPalette} [colorPalette] - Color palette.
   * @returns {LutPipeline} LUT pipeline object.
   */
  getOrCreate(pixel, windowLevel, frame, colorPalette) {
    if (!windowLevel) {
      return LutPipeline.create(pixel, windowLevel, frame, colorPalette);
    }

    const key = this._createCacheKey(windowLevel, frame);
    const cachedPipeline = this.get(key);
    if (cachedPipeline !== undefined) {
      return cachedPipeline;
    }

    const pipeline = LutPipeline.create(pixel, windowLevel, frame, colorPalette);
    this.set(key, pipeline);

    return pipeline;
  }

  //#region Private Methods
  /**
   * Creates the cache key.
   * @method
   * @private
   * @param {WindowLevel} windowLevel - Window/level.
   * @param {number} frame - Frame index.
   * @returns {string} Cache key.
   */
  _createCacheKey(windowLevel, frame) {
    return `${frame}_${windowLevel.getWindow()}_${windowLevel.getLevel()}`;
  }
  //#endregion
}
//#endregion

//#region Exports
module.exports = { PixelPipelineCache, LutPipelineCache };
//#endregion
