# Barcode Content Viewer (Chrome Extension)

Right-click a barcode/QR code image on a web page and use the context menu to
read its content. The decoded value is shown in the extension's toolbar popup,
where you can copy it or open it as a link.

Detection uses the browser's built-in
[Barcode Detection API](https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API)
when available, and transparently falls back to a bundled WASM decoder
([barcode-detector](https://github.com/Sec-ant/barcode-detector) /
[zxing-wasm](https://github.com/Sec-ant/zxing-wasm)) on platforms where the
native API is missing (e.g. Chrome on Linux), so it works the same everywhere.

## Build

The extension is bundled with [esbuild](https://esbuild.github.io/) because the
offscreen script imports the WASM fallback.

```sh
npm install
npm run build   # outputs the loadable extension into ./dist
```

`make build` does the same and additionally produces the upload zip
(`barcode-detector-extension.zip`).

## Usage

1. Run `npm install && npm run build`
2. Open `chrome://extensions`
3. Turn on "Developer mode" in the top right
4. Click "Load unpacked" and select the generated **`dist/`** folder
5. Right-click a barcode image on a web page → "Show barcode content"
6. The result appears in the toolbar popup (with copy / open-URL buttons)

## How it works

- `src/background.js` … Registers the right-click menu. On click, it asks the
  offscreen document to run detection, saves the result to
  `chrome.storage.session`, and opens the popup.
- `src/offscreen.js` … Detects via `fetch` → `createImageBitmap` →
  `BarcodeDetector.detect()`. Because `BarcodeDetector` is not available in a
  service worker, detection runs in an offscreen document that has a DOM. The
  `barcode-detector/polyfill` import installs a WASM-backed `BarcodeDetector` on
  `globalThis` only when the browser has no native one; the bundled
  `zxing_reader.wasm` is loaded locally via `chrome.runtime.getURL`.
- `src/popup.html` / `src/popup.js` … Displays the stored result.
- Cross-origin images can be fetched from the extension side thanks to
  `host_permissions: <all_urls>`, which avoids the tainted-canvas problem.

## Notes

- **Detected formats**: Since `formats` is not specified, the decoder detects
  all formats it supports (QR, EAN, Code128, Code39, UPC, etc.).
- On platforms with a native `BarcodeDetector` the WASM module is never loaded;
  on others it is loaded lazily on first use.
- Some images that the extension cannot `fetch`, such as `blob:` URL images,
  cannot be read.
