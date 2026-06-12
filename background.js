// Background (service worker) for the barcode detection extension
// - Registers the right-click menu for images
// - On click, asks the offscreen document to run detection
// - Saves the result to chrome.storage.session and opens the popup

const CONTEXT_MENU_ID = "detect-barcode";
const OFFSCREEN_PATH = "offscreen.html";

// Register the menu (on install / update)
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: "Show barcode content",
    contexts: ["image"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== CONTEXT_MENU_ID || !info.srcUrl) return;

  // Save the "detecting" state
  await chrome.storage.session.set({
    barcodeResult: { status: "loading", srcUrl: info.srcUrl }
  });

  // Open the popup while the user gesture is still active.
  // (Detection is async, so the popup watches storage changes and updates.)
  chrome.action.openPopup().catch(() => {
    // If openPopup is unsupported / fails, notify with a badge
    chrome.action.setBadgeBackgroundColor({ color: "#d93025" });
    chrome.action.setBadgeText({ text: "!" });
  });

  try {
    const barcodes = await detectFromUrl(info.srcUrl);
    await chrome.storage.session.set({
      barcodeResult: { status: "done", srcUrl: info.srcUrl, barcodes }
    });
  } catch (e) {
    await chrome.storage.session.set({
      barcodeResult: {
        status: "error",
        srcUrl: info.srcUrl,
        error: String((e && e.message) || e)
      }
    });
  }
});

// Ask the offscreen document to run detection
async function detectFromUrl(srcUrl) {
  await ensureOffscreen();
  const response = await chrome.runtime.sendMessage({
    target: "offscreen",
    type: "detect",
    srcUrl
  });
  if (!response) throw new Error("Detection failed (no response from offscreen)");
  if (response.error) throw new Error(response.error);
  return response.barcodes;
}

// Create the offscreen document if it does not exist
let creating = null;
async function ensureOffscreen() {
  const existing = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_PATH)]
  });
  if (existing.length > 0) return;

  if (creating) {
    await creating;
    return;
  }
  creating = chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: ["DOM_SCRAPING"],
    justification: "Uses BarcodeDetector to detect barcodes from images."
  });
  try {
    await creating;
  } finally {
    creating = null;
  }
}
