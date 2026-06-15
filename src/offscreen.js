// Offscreen document: performs the actual barcode detection.
// BarcodeDetector is not available in a service worker, so it runs in this
// document, which has a DOM.
//
// We import the barcode-detector polyfill, which installs a WASM-backed
// BarcodeDetector on globalThis ONLY when the browser has no native one
// (e.g. Chrome on Linux). On platforms with a native BarcodeDetector
// (macOS / Windows / Android) the native implementation is used as-is and
// the WASM module is never loaded.
import { setZXingModuleOverrides } from "barcode-detector/polyfill";

// When the WASM fallback is used, load the .wasm bundled inside the extension
// instead of fetching it from the network (which is not possible here).
setZXingModuleOverrides({
  locateFile: (path, prefix) =>
    path.endsWith(".wasm") ? chrome.runtime.getURL(path) : prefix + path
});

let detector = null;

function getDetector() {
  // Not specifying formats = detect every format the browser supports
  if (!detector) detector = new BarcodeDetector();
  return detector;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.target !== "offscreen" || message.type !== "detect") {
    return; // Ignore messages not addressed to us
  }
  detect(message.srcUrl)
    .then((barcodes) => sendResponse({ barcodes }))
    .catch((e) => sendResponse({ error: String((e && e.message) || e) }));
  return true; // sendResponse is called asynchronously
});

async function detect(srcUrl) {
  // BarcodeDetector is guaranteed to exist here: either the browser's native
  // implementation, or the WASM-backed polyfill installed on import above.

  // Thanks to host_permissions, the extension page can fetch cross-origin images
  const res = await fetch(srcUrl);
  if (!res.ok) {
    throw new Error("Failed to fetch the image (HTTP " + res.status + ")");
  }
  const blob = await res.blob();

  let bitmap;
  try {
    bitmap = await createImageBitmap(blob);
  } catch (e) {
    throw new Error("Failed to decode the image (possibly an unsupported format)");
  }

  try {
    // Transparent-PNG workaround: detecting on a transparent background treats
    // transparent areas as black and fails, so composite onto a white-filled
    // canvas before detecting.
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);

    const barcodes = await getDetector().detect(canvas);
    return barcodes.map((b) => ({
      rawValue: b.rawValue,
      format: b.format,
      boundingBox: b.boundingBox
        ? {
            x: b.boundingBox.x,
            y: b.boundingBox.y,
            width: b.boundingBox.width,
            height: b.boundingBox.height
          }
        : null
    }));
  } finally {
    bitmap.close();
  }
}
