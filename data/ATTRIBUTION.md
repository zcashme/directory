# World cities data

`world-cities.json` is derived from [SimpleMaps World Cities Basic v1.91.4](https://simplemaps.com/data/world-cities)
(refreshed 2026-08-30). Each row includes `lat`, `lng`, and SimpleMaps `id`.

License: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/).

`world-cities-legacy-map.json` maps display labels from `world-cities-json@1.0.1`
onto this dump (SimpleMaps id first, then iso2+name, then nearest city within 25km).
`database/20261101_remap_cities.sql` applies label changes to `zcasher.nearest_city_name`.

To refresh:

1. Download the Basic database zip from https://simplemaps.com/data/world-cities
2. Extract `worldcities.csv`
3. Run `node scripts/generate-world-cities.mjs path/to/worldcities.csv`
4. Run `node scripts/map-legacy-cities.mjs path/to/world-cities-json-1.0.1-cities.json`
