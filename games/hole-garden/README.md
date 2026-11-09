# Little Void Garden v0.4

A static Three.js browser game. Upload the files in this folder to GitHub Pages; no server-side processing is needed.

## Changes in v0.4

- Deliberately generated towers of 2–5 objects in most clusters.
- Towers consist exclusively of upright boxes or flat-ended hexagonal prisms. Spheres, gems, and bombs never serve as tower blocks.
- Planar collision handling for flat objects so towers settle with flat faces against each other instead of being separated by oversized spherical bounds.
- Loose objects and large growth-gated objects remain scattered throughout the map.
- Gravity, camera following, drag steering, timed/relaxed modes, and save data remain in place.

## Running locally

Run `python -m http.server 8000` in this directory, then open http://localhost:8000. On GitHub Pages, upload these files to a directory and navigate to its URL. Three.js loads from a public CDN, so an initial internet connection is required.

## Note

The collision system is still a lightweight approximation, not a complete rigid-body physics engine. Dense piles may still occasionally shift or jitter.
