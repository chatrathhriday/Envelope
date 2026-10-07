# DATA_SOURCES.md — Envelope

Every number in the UI traces back to a source listed here, with a fetch timestamp. All upstream responses go through
the server's file cache (`.cache/`); the committed snapshot in `fixtures/demo/` lets the full flow run offline.
Freshness per source is shown in the status bar: Live, Cached (with date), Unavailable.

## In scope (built in checkpoints 1–2)

| Source | Use | Endpoint | Key | Limits / terms | Attribution |
|---|---|---|---|---|---|
| Open-Meteo Historical Weather (ERA5) | Hourly weather for the last complete calendar year | `https://archive-api.open-meteo.com/v1/archive` | No | Free for non-commercial use, fair use (~10,000 calls/day) | "Weather data by Open-Meteo.com" (CC BY 4.0) |
| Open-Meteo Forecast | Live mode, next 5 days | `https://api.open-meteo.com/v1/forecast` | No | As above | As above |
| Open-Meteo Air Quality (CAMS global, ~45 km) | Background PM10, PM2.5, dust, AOD | `https://air-quality-api.open-meteo.com/v1/air-quality` | No | As above | Open-Meteo.com; CAMS / Copernicus Atmosphere Monitoring Service |
| Open-Meteo Elevation | Site elevation | `https://api.open-meteo.com/v1/elevation` | No | As above | Open-Meteo.com (Copernicus DEM GLO-90) |
| OSM Overpass API | Neighbour buildings, land use, roads, water, green, sensitive receptors | `https://overpass-api.de/api/interpreter` | No | Fair use: few heavy queries; cache everything | © OpenStreetMap contributors (ODbL) |
| Cesium ion: Google Photorealistic 3D Tiles (asset 2275207) | 3D basemap | via `Cesium.createGooglePhotorealistic3DTileset()` | Ion token | Ion free tier; Google root-tile sessions (3 h each); avoid reload loops | Google logo and data attributions shown through Cesium credits |
| Cesium ion: World Terrain + OSM Buildings | Fallback basemap | Cesium ion | Ion token | Ion free tier | Cesium; © OpenStreetMap contributors |
| CEA CO2 Baseline Database v21.0 | Grid emission factor 0.710 tCO2/MWh (FY 2024-25) | Constant | — | — | Central Electricity Authority, Government of India |

### Request parameters (Open-Meteo)

- Common: `latitude`, `longitude`, `timezone=GMT` (stored in UTC; converted to Asia/Kolkata for display),
  `wind_speed_unit=ms`.
- Archive `hourly`: temperature_2m, relative_humidity_2m, dew_point_2m, surface_pressure, wind_speed_10m,
  wind_direction_10m, wind_gusts_10m, cloud_cover, precipitation, shortwave_radiation, direct_radiation,
  diffuse_radiation, direct_normal_irradiance, soil_moisture_0_to_7cm; `start_date`/`end_date` = last complete
  calendar year.
- Forecast `hourly`: the same list with soil_moisture_0_to_1cm and boundary_layer_height; `forecast_days=5`.
- Air quality `hourly`: pm10, pm2_5, dust, aerosol_optical_depth.
- Tilted irradiance azimuth convention: 0 = south, −90 = east, 90 = west, ±180 = north (see MODELS.md A.1).

## Deferred (1-day deadline, D-008)

| Source | Would provide | Replacement used now |
|---|---|---|
| ISRIC SoilGrids v2 | Clay/sand/silt %, bulk density | Clay 20%, bulk density 1.5 g/cm³ (editable, flagged [verify]) |
| OpenAQ v3 (CPCB stations) | Validation of CAMS background | None; methodology states CAMS is unvalidated at this site |
| NASA POWER | Solar climatology cross-check | None |
| ESA WorldCover | Land-cover gap filling | "Urban mixed paved" default class |
