// Build script: bundles the extension into ./dist so it can be loaded
// unpacked or zipped for the Chrome Web Store.
//
// - offscreen.js is bundled with esbuild because it imports the
//   barcode-detector polyfill (WASM fallback for browsers without a native
//   BarcodeDetector).
// - All other files are static and copied verbatim.
// - The reader WASM binary is copied to the extension root so it can be
//   loaded via chrome.runtime.getURL("zxing_reader.wasm").

import { build } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, "src");
const dist = join(root, "dist");

// Files copied verbatim from src/ into dist/.
const STATIC_FILES = [
  "manifest.json",
  "background.js",
  "popup.html",
  "popup.js",
  "offscreen.html",
  "icon.png"
];

const WASM_SRC = join(
  root,
  "node_modules",
  "zxing-wasm",
  "dist",
  "reader",
  "zxing_reader.wasm"
);

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

// Bundle the offscreen script (IIFE so offscreen.html can load it as a
// classic <script>).
await build({
  entryPoints: [join(src, "offscreen.js")],
  outfile: join(dist, "offscreen.js"),
  bundle: true,
  format: "iife",
  target: "chrome120",
  legalComments: "none"
});

// Copy static files.
for (const file of STATIC_FILES) {
  await cp(join(src, file), join(dist, file));
}

// Copy the WASM binary to the extension root.
await cp(WASM_SRC, join(dist, "zxing_reader.wasm"));

console.log("Built extension into ./dist");
