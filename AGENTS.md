# AGENTS.md — Project Instructions & Conventions

## Version Bumping Rule
- **CRITICAL**: Every time code changes or enhancements are made to this project, you MUST increment the version number `APP_VERSION` in `index.html` (e.g., from `v0.134` to `v0.135`).

## README Rule
- **CRITICAL**: Do NOT edit or update the `README.md` file under any circumstances. The user manages this file manually.

## Painting System & Hole-Punching Rule (v0.300+)
- **CRITICAL**: The default paint mode (`paintNoBlend` and `applyDabToCanvas` fallback) MUST ALWAYS use exact pixel replacement (hole-punching). Every pixel from a dab replaces the target layer pixel unconditionally using raw 32-bit integer manipulation (`real32[i] = (sA << 24) | (sB << 16) | (sG << 8) | sR`). 
- Do NOT add standard canvas alpha blending (`drawDabFn(targetCtx)`) as a fallback for 100% opacity in normal mode. If the dab edge has 50% opacity, it punches a 50% opacity hole straight through the layer.
- **Performance Requirement**: All layer, height, and roughness canvases MUST be created with `getContext('2d', { willReadFrequently: true })`. This prevents massive GPU readback stalls during `getImageData`/`putImageData`.
- **Memory Management**: The hidden scratch canvases (e.g. `noBlendScratchCanvas`) must shrink back down if they exceed `reqW * 2` or `reqH * 2`. Do not allow giant scratch canvases from stamps to persist when switching back to small brushes.
