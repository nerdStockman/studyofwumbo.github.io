# Little Void Garden v0.3

A static Three.js game. Host the contents of this folder on GitHub Pages (no backend needed).

## Changes in v0.3
- Gravity and contact resolution for objects, including stacked items.
- Floor collision and separation of intersecting objects.
- Removed the old stack-height support detection that left objects floating.
- Preserved camera-following movement, timed/relaxed modes, and local progress.

## Running locally
Run `python -m http.server 8000` from this folder and open http://localhost:8000.

Three.js is loaded from jsDelivr, so an internet connection is required initially.

## Note
This is a lightweight custom physics solver rather than a full rigid-body engine. It uses spherical collision bounds and may still show small gaps between square objects or jitter in dense piles. Test on the target Android phone for performance.
