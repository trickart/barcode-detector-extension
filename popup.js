// Popup: displays the detection result stored in storage.session

const content = document.getElementById("content");

// Clear the badge (!) if it is showing
chrome.action.setBadgeText({ text: "" });

// Initial render
chrome.storage.session.get("barcodeResult").then(({ barcodeResult }) => {
  render(barcodeResult);
});

// Watch for result changes (e.g. detection completion) and re-render
chrome.storage.session.onChanged.addListener((changes) => {
  if (changes.barcodeResult) render(changes.barcodeResult.newValue);
});

function render(result) {
  content.innerHTML = "";

  if (!result) {
    content.className = "status";
    content.textContent =
      'Right-click an image and choose "Show barcode content".';
    return;
  }

  if (result.status === "loading") {
    content.className = "status";
    content.textContent = "Detecting…";
    return;
  }

  if (result.status === "error") {
    content.className = "error";
    content.textContent = "Error: " + (result.error || "Unknown error");
    return;
  }

  const barcodes = result.barcodes || [];
  if (barcodes.length === 0) {
    content.className = "status";
    content.textContent = "No barcode could be detected.";
    return;
  }

  content.className = "";
  for (const b of barcodes) {
    content.appendChild(renderItem(b));
  }
}

function renderItem(b) {
  const item = document.createElement("div");
  item.className = "item";

  const format = document.createElement("span");
  format.className = "format";
  format.textContent = b.format || "unknown";
  item.appendChild(format);

  const value = document.createElement("div");
  value.className = "value";
  value.textContent = b.rawValue;
  item.appendChild(value);

  const row = document.createElement("div");
  row.className = "row";

  // Copy button
  const copyBtn = document.createElement("button");
  copyBtn.textContent = "Copy";
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(b.rawValue);
      copyBtn.textContent = "Copied";
      setTimeout(() => (copyBtn.textContent = "Copy"), 1200);
    } catch {
      copyBtn.textContent = "Failed";
    }
  });
  row.appendChild(copyBtn);

  // If the content looks like a URL, add an open button
  if (/^https?:\/\//i.test(b.rawValue.trim())) {
    const openBtn = document.createElement("button");
    openBtn.textContent = "Open link";
    openBtn.addEventListener("click", () => {
      chrome.tabs.create({ url: b.rawValue.trim() });
    });
    row.appendChild(openBtn);
  }

  item.appendChild(row);
  return item;
}
