Work in progress but it is functional.

Using Claude and Google ai.studio to build a pixel art tool that does some things I haven't been able to find in other apps, and combines existing tools into one app.

Mostly this project started because I couldn't find a spray tool that did what I wanted and was in an app that I was using to author pixel art.  Apps that have something close were larger apps that weren't intended for pixel art.

Palette Spray Studio is an advanced, browser-based pixel art editor built from the ground up for indie game developers, texture artists, and visual designers. Far beyond standard pixel art programs, it bridges traditional 2D sprite work with dynamic, modern game-dev requirements—featuring real-time 2.5D normal and bump mapping, algorithmic seamless texture generation, smart color replacement, and robust procedural brush scattering.
Whether you are designing a robust RPG tileset, painting seamless ground textures, testing bump-mapped lighting scenarios, or designing animated character sprites, Palette Spray Studio gives you instant visual feedback in a fluid, distraction-free interface.
🎨 Core Features
🌟 Next-Gen Pixels & 2.5D Lighting
Real-time 2.5D Lighting Sandbox: Paint height maps and roughness maps directly on your layers, and view dynamic, bump-mapped specular lighting instantly. Test how your tiles will react to light engines before exporting them.
Smart Roughness Map Generation: Don't want to paint roughness by hand? Auto-generate roughness data dynamically from your color layers based on luminance values.
Algorithmic Seamless Textures: Automatically project, fade, and stitch the edges of your canvas to generate perfectly tileable textures on the fly.
Live Seamless Preview: A toggleable visualizer that tiles your canvas in a 3×3 grid so you can paint on the center tile and instantly see how the pattern flows across edges.
🖌️ Advanced Brush Engine & Tools
Procedural Spray & Vine Scatter Brushes: Break away from static pixels with randomized, jittered spray paths, algorithmic organic "vines," and dynamic geometric shapes. Adjust density, offshoots, and rotation jitter.
Shape & Path Overlays: Draw crisp, rasterized paths, filled boxes, outlines, and geometric shapes.
Smart Colorization & Erasers: Replace entire color ranges or hues non-destructively without spilling out of your linework boundaries using the target-colorization brush mode.
Pixel-Perfect Logic: Advanced pathing ensures single-pixel line drawing avoids jagged, overlapping "L" shapes when drawing curves or diagonals.
🧩 Tileset Tester & Studio Workspace
Integrated Tileset Composer: Slice your main canvas into custom grid sizes (16x16, 32x32, 64x64, etc.).
Live Map Painter: Left-click to pick up tiles from your sprite sheet and paint them onto a testing grid to instantly see how they chain together.
Multi-Channel Tile Rendering: View your painted tileset in standard flat color, or toggle the viewport to render real-time height, roughness, or full 2.5D lighting dynamically across your painted tile map.
🎬 Animation & Sprites
Frame-by-Frame Animation: Manage animation frames fluidly with duplicating, reordering, and playback timing controls.
Onion Skinning: See translucent overlays of previous and next frames (customizable opacity) to nail your animation arcs.
Export Anything: Export your frames as a combined Sprite Sheet (PNG), a compiled Animated GIF, or simply save your raw project data to continue editing later.
⚙️ Professional Color & Image Control
Extract & Index Palettes: Import an existing image and automatically extract an optimized pixel-art palette.
Reduce & Quantize Colors: Instantly posterize and compress down your artwork to strict 16-color or 8-color limitations.
Hue/Tint Shifting & Swaps: Swap specific hexadecimal values globally, or slide Hue/Saturation limits safely across your entire canvas.
Bilinear Scaling & Sharpening: Resize your canvas or selected regions dynamically. Need crispness? Run the Unsharp Mask filter to clarify muddy pixel boundaries.
Hardware-Accelerated Core: Built on PixiJS and WebGL, providing buttery-smooth panning and zooming up to 3200% zoom without performance drops on massive canvases.
Works completely offline once loaded. Installable as a Progressive Web App (PWA) to your desktop or device directly from your browser!
