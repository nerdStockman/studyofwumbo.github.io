Earth Gravity Simulator v8

Open index.html directly in a browser; no server or internet required.

The bundled gravity-grid.js is derived from the supplied ICGEM EGM2008 gravity_disturbance GDF (WGS84, 1-degree grid, 0 m ellipsoidal height, 65,341 samples). Values are rounded to 0.001 mGal (1 microgal), negligible relative to grid spatial resolution. Bilinear interpolation is used.

Normal gravity and elevation use WGS84 approximations. The EGM2008 disturbance is evaluated at the ellipsoid and applied at the selected elevation without vertical continuation; this is a regional approximation, NOT site-specific gravity. City elevations are approximate heights above sea level rather than ellipsoidal heights.

The scale reading is relative to WGS84 normal gravity at the North Pole (9.83218494 m/s²); EGM2008 disturbance is an additive correction, not re-zeroed to the actual North Pole disturbance. The decomposition of rotation versus shape is illustrative rather than a unique physical decomposition.

Heatmap toggle displays interpolated EGM2008 gravity disturbance. The optional importer can override the bundled grid. Disable correction removes the grid until page reload.

Source: ICGEM EGM2008 gravity_disturbance GDF supplied by user; tide system tide_free; zero degree term included.

v9: Added location selection guidance and changed the apparent-weight percentage to signed deviation from 100% (e.g. 99.5 g of 100 g = -0.5%).

Version 10: heatmap enabled by default; contribution card followed by primary result immediately above globe; local gravity grid controls moved below latitude plot.
