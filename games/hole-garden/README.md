# Little Void Garden v0.5

Static Three.js game for GitHub Pages. Upload the files in this folder; no backend required.

## Changes
- More frequent and taller towers (4–8 blocks), made only from upright boxes or flat-ended hexagonal prisms.
- Tower collision handling keeps tiers aligned while supported, but gravity lets them fall after lower blocks are swallowed.
- More forgiving hole swallowing: tests the horizontal footprint instead of the object’s oversized spherical collision bound.
- Reduced some collision calculations for mobile performance.
- Camera, drag steering, timed/relaxed modes, and local progress saving remain unchanged.

## Local test
Run `python -m http.server 8000` in this folder and open http://localhost:8000. On GitHub Pages, upload all files to a directory. Three.js is loaded from a CDN.

The custom physics remains approximate. Very dense towers may still wobble or shift.
