# Raw Data Notes

Raw source data is consumed from installed dependency:
- `node_modules/d3-celestial/data/*`

A provenance snapshot is generated at build time:
- `data/raw/sources.json`

To regenerate app datasets:

```bash
npm run build:sky-data
```
