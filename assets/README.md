# Assets Directory

This directory contains assets used for building and packaging the MyFinance Dashboard application.

## Required Files

### Icons
- `icon.icns` - macOS icon (512x512 PNG converted to ICNS)
- `icon.ico` - Windows icon (256x256 PNG converted to ICO)
- `icon.png` - Linux icon (512x512 PNG)

### macOS Specific
- `entitlements.mac.plist` - macOS entitlements file
- `dmg-background.png` - DMG installer background (540x380 PNG)

## Creating Icons

### From Existing Images
If you have existing PNG images, you can convert them:

```bash
# macOS icon (requires iconutil)
mkdir icon.iconset
# Add PNG files in various sizes to icon.iconset/
iconutil -c icns icon.iconset

# Windows icon (requires ImageMagick)
convert icon.png -resize 256x256 icon.ico

# Linux icon (just use PNG)
cp icon.png assets/icon.png
```

### Icon Sizes Needed
- **macOS**: 16, 32, 64, 128, 256, 512, 1024 pixels
- **Windows**: 16, 24, 32, 48, 64, 128, 256 pixels
- **Linux**: 16, 24, 32, 48, 64, 128, 256, 512 pixels

## Placeholder Assets

For now, you can use placeholder assets or create simple ones. The build will work without these files, but they improve the user experience.

## Future Enhancements

- [ ] Create professional app icons
- [ ] Design custom DMG background
- [ ] Add app store assets (if publishing to stores)
- [ ] Create splash screens
