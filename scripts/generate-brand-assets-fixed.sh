#!/bin/bash

# AptlySaid Asset Generation Script (Fixed Version)
# This script helps generate various image assets from the SVG logo

echo "AptlySaid Asset Generation"
echo "========================="

# Check if ImageMagick is installed
if ! command -v magick &> /dev/null; then
    echo "ImageMagick is required but not installed."
    echo "Install it with: brew install imagemagick (macOS) or apt-get install imagemagick (Linux)"
    exit 1
fi

# Create assets directory if it doesn't exist
mkdir -p static/images/brand

# Generate Favicon PNG
echo "Generating favicon.png..."
magick -density 512 -background "#F8F9FA" static/favicon.svg -resize 512x512 static/favicon.png

# Generate various sizes for web
echo "Generating web icons..."
for size in 16 32 64 128 256 512; do
    magick -density 512 -background "#F8F9FA" static/favicon.svg -resize ${size}x${size} static/images/brand/icon-${size}.png
done

# Generate Apple Touch Icons
echo "Generating Apple touch icons..."
magick -density 512 -background "#F8F9FA" static/favicon.svg -resize 180x180 static/apple-touch-icon.png

# Generate social media assets
echo "Generating social media assets..."

# Open Graph image (1200x630)
magick -size 1200x630 xc:"#F8F9FA" \
    -draw "image over 100,165 300,300 'static/aptlysaid-icon-large.svg'" \
    -font "Lora-Bold" -pointsize 72 -fill "#1A2A4F" \
    -annotate +450+315 "AptlySaid" \
    -font "Inter-Regular" -pointsize 36 -fill "#848A96" \
    -annotate +450+380 "Your brand's voice, perfected." \
    static/images/brand/og-image.png

# Twitter header (1500x500)
magick -size 1500x500 xc:"#1A2A4F" \
    -draw "image over 575,100 300,300 'static/aptlysaid-logo.svg'" \
    static/images/brand/twitter-header.png

echo "Asset generation complete!"
echo ""
echo "Generated files:"
echo "- static/favicon.png"
echo "- static/apple-touch-icon.png"
echo "- static/images/brand/icon-*.png (multiple sizes)"
echo "- static/images/brand/og-image.png"
echo "- static/images/brand/twitter-header.png"
echo ""
echo "Note: Lora and Inter fonts have been installed via Homebrew."
