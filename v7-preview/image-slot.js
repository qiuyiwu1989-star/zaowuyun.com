/* image-slot.js — daymug 图片占位元素。
 * 实际渲染逻辑已并入 support.js 的 renderImageSlot()。
 * 这里仅占位，避免 404，并兜底处理「support.js 未介入时」直接出现的 <image-slot>。 */
(function () {
  'use strict';
  if (window.customElements && !customElements.get('image-slot')) {
    try {
      class ImageSlot extends HTMLElement {
        connectedCallback() {
          if (this._done) return;
          // 若已被 support.js 填充则跳过
          if (this.textContent && this.textContent.trim()) return;
          this._done = true;
        }
      }
      customElements.define('image-slot', ImageSlot);
    } catch (e) { /* 已定义则忽略 */ }
  }
})();
