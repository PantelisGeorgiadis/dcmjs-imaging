//#region Shape
class Shape {
  /**
   * Draws a colored polyline.
   * @method
   * @static
   * @param {Int32Array} renderedPixels - Rendered ABGR image to be updated with the overlay.
   * @param {number} width - Rendered image width.
   * @param {number} height - Rendered image height.
   * @param {Array<number>} points - The points of the polyline in x and y pairs.
   * @param {number} color - Overlay color packed in an integer.
   */
  static drawPolyline(renderedPixels, width, height, points, color) {
    let x1 = points[0];
    let y1 = points[1];

    for (let i = 2; i < points.length; i += 2) {
      const x2 = points[i];
      const y2 = points[i + 1];

      this._drawLine(renderedPixels, width, height, x1, y1, x2, y2, color);
      x1 = x2;
      y1 = y2;
    }
  }

  //#region Private Methods
  /**
   * Draws a colored line by connecting two points using the Bresenham algorithm.
   * @method
   * @static
   * @private
   * @param {Int32Array} renderedPixels - Rendered ABGR image to be updated with the overlay.
   * @param {number} width - Rendered image width.
   * @param {number} height - Rendered image height.
   * @param {number} x1 - The x-coordinate of the start point.
   * @param {number} y1 - The y-coordinate of the start point.
   * @param {number} x2 - The x-coordinate of the end point.
   * @param {number} y2 - The y-coordinate of the end point.
   * @param {number} color - Overlay color packed in an integer.
   */
  static _drawLine(renderedPixels, width, height, x1, y1, x2, y2, color) {
    const clipX1 = 0;
    const clipX2 = width;
    const clipY1 = 0;
    const clipY2 = height;

    let dx = x2 - x1;
    let dy = y2 - y1;

    const incX = dx < 0 ? -1 : 1;
    dx = dx < 0 ? -dx : dx;

    const incY = dy < 0 ? -1 : 1;
    dy = dy < 0 ? -dy : dy;

    const pdx = dx > dy ? incX : 0;
    const pdy = dx > dy ? 0 : incY;
    const odx = incX;
    const ody = incY;
    const es = dx > dy ? dy : dx;
    const el = dx > dy ? dx : dy;

    let x = x1;
    let y = y1;
    let error = el >> 1;
    if (y < clipY2 && y >= clipY1 && x < clipX2 && x >= clipX1) {
      renderedPixels[y * width + x] |= color;
    }

    for (let i = 0; i < el; i++) {
      error -= es;

      if (error < 0) {
        error += el;
        x += odx;
        y += ody;
      } else {
        x += pdx;
        y += pdy;
      }

      if (y < clipY2 && y >= clipY1 && x < clipX2 && x >= clipX1) {
        renderedPixels[y * width + x] |= color;
      }
    }
  }
}
//#endregion

//#region Exports
module.exports = Shape;
//#endregion
