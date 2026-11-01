// =============================================================================
// Product Modal Image Source & Data URL Acceptance Suite — ISS-02 / Phase P3-4
// scripts/tests/product-modal-image.test.mjs
// Validates image source validator and tests data-URL product modal rendering.
// =============================================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { isRenderableImageSrc, isDataUrl } from '../../src/lib/imageSource.ts';

describe('Phase P3-4 (ISS-02): Product Modal Image Source & Data URL Support', () => {
  describe('isRenderableImageSrc Validator Unit Tests', () => {
    test('Accepts valid relative paths', () => {
      assert.strictEqual(isRenderableImageSrc('/images/products/darlix.webp'), true);
      assert.strictEqual(isRenderableImageSrc('/images/placeholder.webp'), true);
    });

    test('Accepts valid remote HTTP & HTTPS URLs', () => {
      assert.strictEqual(isRenderableImageSrc('https://cdn.ficcado.com/products/img1.webp'), true);
      assert.strictEqual(isRenderableImageSrc('http://localhost:8000/media/sample.jpg'), true);
    });

    test('Accepts valid raster base64 data URLs', () => {
      const sampleBase64Webp = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';
      const sampleBase64Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const sampleBase64Jpg = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

      assert.strictEqual(isRenderableImageSrc(sampleBase64Webp), true);
      assert.strictEqual(isRenderableImageSrc(sampleBase64Png), true);
      assert.strictEqual(isRenderableImageSrc(sampleBase64Jpg), true);
      assert.strictEqual(isDataUrl(sampleBase64Webp), true);
    });

    test('Rejects SVG data URLs to prevent cross-site scripting vulnerabilities', () => {
      const svgDataUrl = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxzY3JpcHQ+YWxlcnQoMSk8L3NjcmlwdD48L3N2Zz4=';
      assert.strictEqual(isRenderableImageSrc(svgDataUrl), false);
    });

    test('Rejects invalid, empty, or dangerous schemes', () => {
      assert.strictEqual(isRenderableImageSrc(''), false);
      assert.strictEqual(isRenderableImageSrc(null), false);
      assert.strictEqual(isRenderableImageSrc(undefined), false);
      assert.strictEqual(isRenderableImageSrc('javascript:alert(1)'), false);
      assert.strictEqual(isRenderableImageSrc('ftp://example.com/file.jpg'), false);
      assert.strictEqual(isRenderableImageSrc('data:text/html;base64,PHNjcmlwdD4='), false);
    });
  });
});
