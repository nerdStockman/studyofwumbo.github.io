# Little Void Garden

A free, original, touch-friendly Three.js hole-collecting prototype. No purchases, accounts, or ads.

## Play locally

Because JavaScript modules are used, serve the directory rather than double-clicking `index.html`:

```bash
python -m http.server 8000
```

Open `http://localhost:8000` in a browser.

## Put it on an Android phone

Upload these files to a static HTTPS web host (e.g. a subfolder of your website, GitHub Pages, or Netlify). Open the HTTPS URL in Chrome on Android and choose **Add to Home screen** / **Install app**.

The game uses a CDN for Three.js and therefore requires an internet connection at initial load. Offline support can be added later by bundling Three.js locally and adding a service worker.

## Mechanics

- Drag anywhere to move the hole.
- Swallow colorful objects to grow and fill the progress bar.
- Larger objects require a bigger hole.
- Red bombs cost 18 seconds in timed mode, or two collected points in relaxed mode; they also shrink the hole slightly.
- Timed and relaxed modes.
- Level progression is saved in localStorage.

## License and originality

Original prototype implementation and geometric art. Inspired by a general hole-collection game mechanic, not a copy of another game's assets, branding, or code.

## Version 0.2 changes
- Fixed-position, close-up camera follows the hole around a larger world.
- Drag from anywhere to steer continuously; release to stop.
- Groups of objects with varied sizes and some elevated stacks.
- More generous level time to account for the larger world.

The game runs fully client-side and is suitable for GitHub Pages. No server-side processing is required.
