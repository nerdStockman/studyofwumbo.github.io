# Little Void Garden v0.7

A static Three.js game designed for Android Chrome and GitHub Pages. No backend, build step, accounts, purchases or server-side processing.

## New in v0.7

- Eight distinct, dense object neighborhoods with clear gaps between them.
- Gradual object-size progression: small near the start, medium farther away, and giant landmarks toward the corners.
- Two specific color-and-shape collection objectives per level, displayed in the HUD.
- All collected objects grow the hole, even if they aren't part of the objective.
- Deliberate towers of 4–11 identical cubes or upright hexagonal prisms (same geometry, size, color); loose spheres/gems never intentionally stacked.
- Preserved camera-following joystick controls, custom gravity, and collision logic from v0.6.
- Version number shown on the home screen; CSS and JS references use v0.7 cache busting.

## Deploy

Upload the contents of this folder to a GitHub Pages subdirectory, such as `/games/void-garden/`. Visit its URL and refresh. The home screen should display **v0.7**.

## Test locally

From this directory run `python -m http.server 8000` and visit `http://localhost:8000`.

Three.js is loaded from a public CDN, so an initial internet connection is required. Game logic runs entirely in the browser. Saved level and mode use localStorage.

## Known limitations

Physics is a lightweight approximation, not a full rigid-body engine. Target goals and placements are procedurally generated, not formally playtested for every seed. Large levels may be slower on older Android devices.
