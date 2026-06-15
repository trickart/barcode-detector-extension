# Makefile for building the Chrome Web Store distribution package.

ZIP := barcode-detector-extension.zip
DIST := dist

.PHONY: build dist zip clean

# Build the distribution zip.
build: zip

# Bundle the extension into ./dist (offscreen.js + WASM + static files).
dist:
	npm install
	npm run build

# Package the built ./dist directory into the upload zip.
zip: dist
	rm -f $(ZIP)
	cd $(DIST) && zip -r ../$(ZIP) . -x '*.DS_Store'

# Remove generated artifacts.
clean:
	rm -f $(ZIP)
	rm -rf $(DIST)
