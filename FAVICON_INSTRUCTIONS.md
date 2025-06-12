# Favicon.png Generation Instructions

To create the favicon.png file from the favicon.svg:

1. Use any vector graphics editor (Inkscape, Adobe Illustrator, or online tools like CloudConvert)
2. Open `/static/favicon.svg`
3. Export as PNG with these specifications:
   - Size: 512x512 pixels (for high-resolution displays)
   - Background: Transparent or #F8F9FA (off-white)
   - Save as: `/static/favicon.png`

Alternatively, use ImageMagick from command line:
```bash
convert -density 512 -background "#F8F9FA" static/favicon.svg -resize 512x512 static/favicon.png
```

The favicon features:
- Chat bubble in Deep Navy Blue (#1A2A4F)
- Checkmark in Muted Gold (#C5B358)
- Off-white background (#F8F9FA)