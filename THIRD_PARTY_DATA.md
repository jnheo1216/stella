# Third-party Data Attribution

This project includes derived sky data generated from `d3-celestial` package data files.

## Source package
- Package: `d3-celestial`
- Data directory: `node_modules/d3-celestial/data`
- Referenced files:
  - `stars.6.json`
  - `starnames.json`
  - `constellations.lines.json`
  - `constellations.json`

## License
`d3-celestial` is distributed under a BSD-3-Clause style license.
See: `node_modules/d3-celestial/LICENSE`.

## Derivation
The build script `scripts/build-sky-data.ts` filters and transforms source GeoJSON into app-optimized files in `public/data`:
- `stars.min.json`
- `constellations.min.json`
- `constellation-labels.json`
