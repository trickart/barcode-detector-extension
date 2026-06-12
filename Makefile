# Makefile for building the Chrome Web Store distribution package.

ZIP := barcode-detector-extension.zip

# Files to include in the distribution package.
SRC := manifest.json background.js offscreen.html offscreen.js popup.html popup.js icon.png

.PHONY: build clean

# Build the distribution zip (excludes macOS .DS_Store files).
build: $(ZIP)

$(ZIP): $(SRC)
	rm -f $@
	zip -r $@ $(SRC) -x '*.DS_Store'

# Remove the generated zip.
clean:
	rm -f $(ZIP)
