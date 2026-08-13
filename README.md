Work in progress but it is functional.

Using Claude and Google ai.studio to build a pixel art tool that does some things I haven't been able to find in other apps, and combines existing tools into one app.

Mostly this project started because I couldn't find a spray tool that did what I wanted and was in an app that I was using to author pixel art.  Apps that have something close were larger apps that weren't intended for pixel art.

# Palette Spray Studio

Web hosted here:  https://cymrix.github.io/Palette-Spray-Studio/

Palette Spray Studio is a browser-based pixel art editor. It includes tools for standard 2D sprite editing, 2.5D normal and bump mapping, seamless texture generation, and color management.

## Features

### Lighting & Textures
* **2.5D Lighting Preview**: Paint height and roughness maps on individual layers and view bump-mapped specular lighting in real-time.
* **Roughness Map Generation**: Generate roughness data from color layers based on luminance values.
* **Seamless Texture Generation**: Apply edge wrapping and fading to create tileable textures.
* **Seamless Preview**: A toggleable 3×3 grid view for editing repeating patterns across canvas edges.

### Brushes & Tools
* **Scatter & Spray Brushes**: Brushes with adjustable density, rotation jitter, and randomized placement.
* **Path & Shape Tools**: Draw rasterized paths, lines, filled boxes, outlines, and geometric shapes.
* **Target Colorization**: A brush mode that restricts painting or erasing to specific color ranges or hues.
* **Pixel-Perfect Drawing**: A line drawing algorithm that prevents overlapping corner pixels (L-shapes).

### Tileset Tester Workspace
* **Grid Slicing**: Divide the canvas into custom grid dimensions (e.g., 16x16, 32x32).
* **Tile Map Painter**: Select tiles from the canvas and paint them onto a separate testing grid.
* **Multi-Channel Tile Rendering**: Render the test grid in flat color, height map, roughness map, or full 2.5D lighting.

### Animation
* **Frame Management**: Add, duplicate, reorder, and adjust playback timing for animation frames.
* **Onion Skinning**: Display translucent overlays of previous and next frames with adjustable opacity.
* **Export Options**: Export projects as Sprite Sheets (PNG), Animated GIFs, or raw project data.

### Color & Image Processing
* **Palette Extraction**: Generate a color palette from imported images.
* **Color Quantization**: Reduce the image color count to a specific palette size.
* **Color Replacement & Adjustment**: Swap specific hex values or adjust Hue/Saturation canvas-wide.
* **Scaling & Filters**: Resize the canvas or selections, and apply filters like Unsharp Mask.

### Technical Details
* **WebGL Rendering**: Uses PixiJS and WebGL for hardware-accelerated canvas rendering, panning, and zooming.
* **Offline Support**: Functions offline after initial load and can be installed as a Progressive Web App (PWA).

<img width="2736" height="1724" alt="image" src="https://github.com/user-attachments/assets/8f77ce70-3efa-4b84-bc0b-e35e31a7f2bb" />

