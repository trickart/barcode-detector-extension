// Offscreen document: performs the actual barcode detection.
// BarcodeDetector is not available in a service worker, so it runs in this
// document, which has a DOM.

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
  if (!("BarcodeDetector" in globalThis)) {
    throw new Error(
      "The BarcodeDetector API is not available in this browser / OS."
    );
  }

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
