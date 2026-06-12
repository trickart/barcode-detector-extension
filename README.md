# Barcode Content Viewer (Chrome Extension)

Right-click a barcode/QR code image on a web page and use the context menu to
read its content and display it in the extension popup.
Detection is powered by the [Barcode Detection API](https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API).

## Usage

1. Open `chrome://extensions`
2. Turn on "Developer mode" in the top right
3. Click "Load unpacked" and select this folder
4. Right-click a barcode image on a web page → "Show barcode content"
5. The result appears in the toolbar popup (with copy / open-URL buttons)

## How it works

- `background.js` … Registers the right-click menu. On click, it asks the
  offscreen document to run detection, saves the result to
  `chrome.storage.session`, and opens the popup.
- `offscreen.html` / `offscreen.js` … Detects via `fetch` → `createImageBitmap`
  → `BarcodeDetector.detect()`. Because `BarcodeDetector` is not available in a
  service worker, detection runs in an offscreen document that has a DOM.
- `popup.html` / `popup.js` … Displays the stored result.
- Cross-origin images can be fetched from the extension side thanks to
  `host_permissions: <all_urls>`, which avoids the tainted-canvas problem.

## Notes

- **Supported environments**: `BarcodeDetector` is OS-dependent. It generally
  works in Chrome on macOS / Windows / Android, but may be unavailable in Chrome
  on Linux. In unsupported environments the popup shows an error to that effect.
- **Detected formats**: Since `formats` is not specified, the browser detects
  all formats it supports (QR, EAN, Code128, Code39, UPC, etc.).
- Some images that the extension cannot `fetch`, such as `blob:` URL images,
  cannot be read.
