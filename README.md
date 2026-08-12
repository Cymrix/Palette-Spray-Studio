Work in progress but it is functional.

Using Claude and Google ai.studio to build a pixel art tool that does some things I haven't been able to find in other apps, and combines existing tools into one app.

Mostly this project started because I couldn't find a spray tool that did what I wanted and was in an app that I was using to author pixel art.  Apps that have something close were larger apps that weren't intended for pixel art.

Download is a zip file with an html file.  Open that file with a browser to run the tool.  Chromium (Chrome, Edge, etc) browsers seem to work the best for local file access.



Palette Spray Studio
A pixel‑oriented editor with layered painting, procedural tools, vector stamping, palette‑restricted workflows, and project‑based asset storage.  Primary workflow centered around spray and path‑based painting.

1. Layered Painting
Multi‑layer stack with opacity, visibility, and blend modes.
Optional “combine opacity if same color” mode to avoid stacking artifacts when repeatedly applying identical colors.
Brush filtering options: nearest‑neighbor or bilinear.
2. Spray & Noise Tools
Adjustable brush size, density, falloff, and flow.
Jitter controls for size, opacity, and rotation.
Grid‑locking for structured spray patterns and tile‑aligned textures.
3. Stamp & Vector System
Supports PNG/JPG image stamps and SVG vector stamps.
Adjustable SVG stroke width and optional fill removal.
Movable pivot origin for placement and rotation alignment.
4. Procedural Path Tools
Path‑based painter for foliage, vines, and simple geometric lines with adjustable thickness and rotation alignment.
Automatic stamp spreading along drawn paths.
5. Color & Palette Management
Gradient generation between selected swatches.
Multi‑color spray selections for blended or randomized palette output.
Palette builder with a strict 256‑color maximum.
Painting uses a replace rule to prevent creation of colors outside the palette.
Layer blending available for additional blend effects.
Recoloring tools for modifying indexed artwork.
Palette extraction, reduction, grouping, and image palettization.
6. Project Handling
Save and load full project state (layers, stamps, palettes, guides, tool settings) as JSON.
7. Animation & Export
Frame‑based animation system.
Export layers as individual images.
Export sprite sheets.
8. Tile & Heightmap Tools
Tools for seamless tile editing.
Heightmap creation and editing with built‑in lighting preview.
Heightmap‑based painting.
Roughness and reflection maps planned for future versions.
9. Additional Tools
Sharpen filter.
