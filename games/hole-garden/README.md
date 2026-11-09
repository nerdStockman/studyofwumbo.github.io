# Little Void Garden v0.6

Static Three.js web game for GitHub Pages. Upload the contents of this directory.

## Changes
- Version number displayed on the main menu, including after a refresh.
- Many deliberately placed towers, 5–9 objects high (occasionally 12).
- Each tower consists of identical boxes or identical hexagonal prisms: same shape, size, and color.
- Loose spheres, gems, and bombs are spawned away from towers.
- Tower tiers stay aligned while falling; the previous gravity system remains.
- More forgiving swallowing based on visible horizontal footprint and hole center proximity.
- Camera and drag movement unchanged.

## Deployment / caching
Upload all files together. Hard-refresh Chrome if you still see the previous version; the version number on the main menu is the quickest confirmation. Script and stylesheet URLs have a v0.6 cache-busting query.

## Local testing
Run `python -m http.server 8000` and open http://localhost:8000. Three.js loads from a CDN.

Physics is intentionally approximate, not a full rigid-body engine.
