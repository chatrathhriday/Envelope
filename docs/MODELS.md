# MODELS.md — Envelope model specification

Moved from HANDOVER.md Appendix A in Phase 0 and adapted to the **construction-phase-only scope**
(DECISIONS.md D-003). This file is the source of truth for every formula in `packages/models`. When a formula
changes, update this file and its unit test in the same commit.

All models are **screening-level (Tier 1–2)**. They are not regulatory dispersion models (e.g. AERMOD), and results
are indicative. Every default parameter has a source. Anything marked **[verify]** is a reasonable default whose
source must be confirmed or replaced before the demo; its uncertainty is shown in the Assumptions panel.

Status column in the parameter registers: `cited` = checked against the source; `[verify]` = default from the build
brief, still to be checked; `to source` = value not set yet, to be chosen from the named source when the module is built.

---

## A.0 Assessment scope (construction phase)

- **Period:** the construction programme only. Default 24 months: excavation 3, structure 12, finishing 9
  (HANDOVER A.2.1, editable). The finished building's operation is out of scope.
- **Weather year:** hourly ERA5 data for the last complete calendar year is the typical-year proxy. Construction
  month *m* maps to calendar month ((start month + m − 2) mod 12) + 1 of that year. Default start month: January.
- **Building state by month:** excavation, then floors rising linearly through the structure phase
  (floors built = ceil(n_floors × month-in-structure / structure months)), then the full height through finishing.
- **Working hours:** 08:00–20:00 local (HANDOVER A.2.1 default, editable). Emissions from site activity occur only in
  working hours; wind erosion of exposed surfaces occurs at any hour.
- **Time modes:** *Worst dust day* (the day with the highest 24 h site increment at the worst receptor), *Hottest day*
  (P99 of daily max temperature), *Live* (next 5 days, Open-Meteo forecast), *Whole construction period* (statistics
  over the 24-month programme).
- **Mitigated vs baseline:** baseline = no mitigation measures; mitigated = the enabled set. Both are always computed.

## A.1 Shared inputs and geometry

- **Site:** lat, lon, elevation, timezone (Asia/Kolkata). **Domain:** square, default 1,200 m, centred on the
  building. **Grids:** 10 m for single-hour layers; 20 m for period statistics. Local ENU tangent plane.
- **Weather (hourly):** Open-Meteo Archive (ERA5) and Forecast. Variables: temperature_2m, relative_humidity_2m,
  dew_point_2m, surface_pressure, wind_speed_10m (m/s), wind_direction_10m, wind_gusts_10m, cloud_cover,
  precipitation, shortwave_radiation, direct_radiation, diffuse_radiation, direct_normal_irradiance,
  soil_moisture_0_to_7cm (archive) / soil_moisture_0_to_1cm (forecast), boundary_layer_height when available
  (else estimated from stability class).
- **Air quality (hourly):** Open-Meteo Air Quality (CAMS global): pm10, pm2_5, dust, aerosol_optical_depth.
- **Sun position:** NOAA algorithm (SunCalc acceptable if within 0.5° of NOAA).
- **Open-Meteo tilted-irradiance azimuth:** 0 = south, −90 = east, 90 = west, ±180 = north.
  Conversion from compass azimuth A (0 = north, clockwise): `om = ((A − 180 + 540) mod 360) − 180`.
  Test: compass 0° (north) → 180 (or −180); compass 90° (east) → −90; compass 180° → 0.
- **Building geometry** from `fixtures/demo/building.json`: footprint polygon → local ENU; per edge: length,
  outward normal azimuth (compass), facade area = length × height, window area = facade area × WWR(orientation).
  Roof area = footprint area. GFA = footprint area × floors. Volume = footprint area × total height.
- **Neighbours:** OSM buildings within the domain; height = `height` tag, else `building:levels` × 3.2 m, else 9 m
  **[verify per city]**. Used for shadows, sky view factor and roughness.
- **Land cover raster:** rasterise OSM polygons (building, landuse, natural, leisure=park, water, amenity=parking)
  and buffered roads (lanes × 3.5 m). Unknown cells = "urban mixed paved". The project plot is "bare soil /
  construction site" during the programme; its **pre-development** class comes from OSM or, if absent, "grass".

Surface classes (defaults **[verify]** against Oke et al. 2017, *Urban Climates*):

| Class | Albedo α | Emissivity ε | Evaporative fraction EF | Storage coeff. c_G | Roughness z0 (m) | Erodible |
|---|---|---|---|---|---|---|
| Asphalt / road | 0.10 | 0.95 | 0.00 | 0.40 | 0.05 | No |
| Concrete paving | 0.25 | 0.92 | 0.00 | 0.35 | 0.05 | No |
| Roof, conventional | 0.20 | 0.90 | 0.00 | 0.20 | — | No |
| Bare soil / construction site | 0.25 | 0.93 | 0.10 (varies with soil moisture) | 0.30 | 0.01 | Yes |
| Grass | 0.23 | 0.96 | 0.50 | 0.15 | 0.03 | No |
| Trees | 0.15 | 0.97 | 0.60 | 0.10 | 1.0 | No |
| Water | 0.08 | 0.97 | 0.90 | 0.50 | 0.001 | No |
| Urban mixed paved | 0.15 | 0.94 | 0.05 | 0.35 | 0.5 | No |

(The urban mixed paved row is an Envelope default **[verify]**, not from the build brief.)

## A.2 Dust module

Outputs: (1) **site emissions and their dispersion**, (2) **background exposure** from regional dust (CAMS),
(3) **dust susceptibility index** of the site.

### A.2.1 Emission sources (hourly, PM10 and PM2.5)

Each construction phase sets active area, exposed area, material throughput, haul trips per day and working hours.

1. **General construction activity** (WRAP Fugitive Dust Handbook, 2006): PM10 = 0.11 short tons/acre/month for
   general construction, 0.42 for active large-scale earthmoving **[verify]**. Conversion: 1 short ton/acre/month
   = 2.2417 Mg/ha/month. Spread evenly over working hours. PM2.5 = 0.10 × PM10 **[verify]**.
2. **Wind erosion of exposed soil and stockpiles:**
   - Friction velocity (neutral log law): u* = κ·U10 / ln(10/z0), κ = 0.4, z0 from land cover.
   - Dry threshold u*t0 by material (AP-42 13.2.5, Table 13.2.5-2); default 0.30 m/s for disturbed soil **[verify]**.
   - Moisture correction (Fécan et al., 1999): w′ = 0.0014·clay² + 0.17·clay (clay in %, w′ in % gravimetric);
     w = 100·θv·ρw/ρb (θv from soil moisture, ρb = 1.5 g/cm³ default; SoilGrids deferred);
     if w > w′: u*t = u*t0·[1 + 1.21·(w − w′)^0.68]^0.5, else u*t = u*t0.
   - Horizontal saltation flux (White, 1979): Q = C·(ρa/g)·u*³·(1 + u*t/u*)·(1 − (u*t/u*)²) for u* > u*t, else 0;
     C = 2.61, ρa = p/(R_d·T).
   - Vertical dust flux (Marticorena & Bergametti, 1995): F = α·Q, α (cm⁻¹) = 10^(0.134·clay% − 6); ×100 for m⁻¹.
   - PM10 = f_PM10 × F, default f_PM10 = 0.5 **[verify]**; PM2.5 = 0.15 × PM10 **[verify]**.
   - Emission = F × exposed area × (1 − control efficiency). Zero when precipitation in the hour > 0.25 mm.
   - Default soil clay content 20% **[verify]** (SoilGrids lookup deferred; editable in Assumptions).
3. **Material handling** (AP-42 13.2.4, eq. 1): E (kg/Mg) = k × 0.0016 × (U/2.2)^1.3 / (M/2)^1.4;
   k_PM10 = 0.35, k_PM2.5 = 0.053; U = wind speed (m/s); M = material moisture (%, default 2).
   Throughput from concrete and aggregate quantities (A.4.1) over the structure phase.
4. **Haul traffic on unpaved roads** (AP-42 13.2.2, eq. 1a, industrial roads): E (lb/VMT) = k·(s/12)^a·(W/3)^b;
   PM10: k = 1.5, a = 0.9, b = 0.45; PM2.5: k = 0.15, a = 0.9, b = 0.45. s = silt % (default 8.5 **[verify]**),
   W = mean vehicle weight (tons). 1 lb/VMT = 281.9 g/VKT. Zero in hours with rain > 0.25 mm.

### A.2.2 Dispersion (steady-state Gaussian plume)

- Area sources split into sub-squares ≤ 10 m, treated as virtual point sources with initial σy0 = side/4.3,
  σz0 = release height/2.15. Release height default 1–3 m by source.
- C(x, y, z) = Q / (2π·u·σy·σz) · exp(−y²/2σy²) · [exp(−(z−H)²/2σz²) + exp(−(z+H)²/2σz²)]; receptor z = 1.5 m;
  only x > 0 (downwind) contributes.
- **Stability class** (Pasquill–Turner): day by incoming solar radiation (strong > 600 W/m², moderate 300–600,
  slight < 300); night by cloud cover (≥ 4/8 → E/D, ≤ 3/8 → F/E); overcast → D.

| U10 (m/s) | Strong | Moderate | Slight | Night ≥ 4/8 cloud | Night ≤ 3/8 |
|---|---|---|---|---|---|
| < 2 | A | A–B | B | E | F |
| 2–3 | A–B | B | C | E | F |
| 3–5 | B | B–C | C | D | E |
| 5–6 | C | C–D | D | D | D |
| > 6 | C | D | D | D | D |

- **Dispersion coefficients** (Briggs urban, x in m):
  A–B: σy = 0.32x(1 + 0.0004x)^−0.5, σz = 0.24x(1 + 0.001x)^0.5 ·
  C: σy = 0.22x(1 + 0.0004x)^−0.5, σz = 0.20x ·
  D: σy = 0.16x(1 + 0.0004x)^−0.5, σz = 0.14x(1 + 0.0003x)^−0.5 ·
  E–F: σy = 0.11x(1 + 0.0004x)^−0.5, σz = 0.08x(1 + 0.0015x)^−0.5.
  Initial σ added in quadrature.
- **Wind at release height:** power law with urban exponents (A/B 0.15, C 0.20, D 0.25, E/F 0.30); floor 1.0 m/s.
  Calm hours (U10 < 0.5 m/s) are flagged and use u = 0.5 m/s; their count is reported.
- **Mixing height:** if σz > 1.6·h_mix, use C = Q/(√(2π)·u·σy·h_mix)·exp(−y²/2σy²).
- **Period statistics:** bin hours by (16 directions × 6 speeds × 6 stabilities); compute a unit-emission field per
  occupied bin once; each hour = emission(h) × field(bin(h)). Accumulate daily means per cell, then period mean,
  max 24 h and P98 of 24 h means.
- **Total concentration** = CAMS background (pm10/pm2_5 at the site hour) + site increment.
- **Thresholds:** NAAQS 2009: PM10 100 µg/m³ (24 h), 60 (annual); PM2.5 60 (24 h), 40 (annual). WHO 2021: PM10
  45 / 15; PM2.5 15 / 5. Both are reported; comparison is indicative, never "compliant".
- **Sensitive receptors:** OSM schools, hospitals, clinics, kindergartens and residential areas within 500 m; table of
  increment and total at each.

**Reference test (hand-checked):** Briggs urban class D, Q = 1 g/s, u = 1 m/s, x = 100 m, ground-level source and
receptor on the centreline: σy = 0.16·100·(1.04)^−0.5 = 15.69 m, σz = 0.14·100·(1.03)^−0.5 = 13.79 m,
C = Q/(π·u·σy·σz) = 1/(π·15.69·13.79) g/m³ = 1,471 µg/m³.

### A.2.3 Dust susceptibility index (DSI, 0–100, transparent heuristic)

DSI = 35% × min(1, period-mean background PM10 / 60) + 25% × min(1, dust-event hours / 500) + 20% × share of hours
with u* > u*t on upwind erodible land + 20% × share of dry days (precip < 1 mm). Weights editable; labelled
"heuristic" in the UI and report. Dust-event hour: CAMS `dust` > 100 µg/m³ **[verify threshold]**.

### A.2.4 PV soiling

Dropped: there is no PV during construction (D-003).

## A.3 Heat module (construction site)

Outputs: surface temperature Ts (°C) across the domain, ΔTs of the cleared site vs its pre-development land cover,
**worker heat stress** as UTCI (°C and stress category) at 1.1 m on and around the site, and **working hours at
heat-stress risk** (working hours with UTCI > 32 °C, i.e. strong heat stress or worse) over the programme.

1. **Shadows:** for each cell centre, ray toward the sun against building prisms (our building at its height for the
   selected construction month + OSM neighbours, 2.5D). Shaded cells receive no direct beam.
2. **Sky view factor:** 36 azimuth rays, max obstruction elevation β_i within 200 m; SVF = 1 − (1/36)·Σ sin²β_i.
3. **Downwelling longwave:** e_a (hPa) from dew point; ε_clear = 1.24·(e_a/Ta)^(1/7) (Brutsaert, Ta in K);
   ε_sky = min(1, ε_clear·(1 + 0.22·c²)), c = cloud fraction; L↓ = SVF·ε_sky·σTa⁴ + (1 − SVF)·σ(Ta + 2)⁴
   **[verify wall term]**.
4. **Surface energy balance per cell** (steady state, Newton–Raphson):
   K* = (1 − α)·(I_dir·cos θ·(1 − shade) + I_dif·SVF + α_env·K↓·(1 − SVF));
   R_n = K* + ε·L↓ − εσTs⁴; G = c_G·R_n; λE = EF·max(0, R_n − G); H = h_c·(Ts − Ta), h_c = 5.7 + 3.8·u_local
   (u_local = 0.5·U10 near ground **[verify]**); solve R_n − G − λE − H = 0 for Ts.
5. **Mean radiant temperature at 1.1 m** (SOLWEIG-style simplification): absorbed shortwave from direct
   (projected-area factor for a standing person, f_p ≈ 0.308·cos(h·(1 − h²/48402)), sun altitude h in degrees),
   diffuse (·SVF) and ground-reflected (α_ground·K↓); longwave from sky (L↓), ground (εσTs⁴) and walls;
   a_k = 0.70, ε_p = 0.97; Tmrt = [S_str/(ε_p·σ)]^0.25 − 273.15.
6. **UTCI:** `utci(tdb, tr, v, rh)` from jsthermalcomfort (CBE port of pythermalcomfort); pedestrian wind v10 = U10
   scaled for urban roughness, clamped to 0.5–17 m/s; validity ranges enforced, out-of-range cells flagged.
   Categories: > 46 extreme, 38–46 very strong, 32–38 strong, 26–32 moderate heat stress, 9–26 no thermal stress.
   **Reference test:** UTCI(Ta 25 °C, Tmrt 25 °C, v 1.0 m/s, RH 50%) ≈ 24.6 °C (pythermalcomfort documentation).
7. **Working hours at risk:** count of working hours (A.0) over the programme with UTCI > 32 °C at the site
   worker zone (cells inside the site boundary, excluding the building footprint).
8. **Dropped from the brief:** anthropogenic heat from building cooling and the operational energy link (D-003).

**Heat mitigations** act through parameters: shade nets over worker zones (direct-beam transmittance τ_net,
default 0.5 for "50% shade net" **[verify]**), sprinkling of exposed soil (EF of bare soil raised in sprinkled hours
**[verify]**), retaining existing trees (cells keep the tree class), and rescheduling heavy work out of 12:00–15:00
(changes exposure hours, not UTCI).

## A.4 Greenhouse-gas module (construction stage, EN 15978 modules A1–A5)

Boundary: emissions caused by constructing the building, reported in tCO2e for the whole programme and per month.

- **Scope mapping (for BRSR-style reporting by the developer):** Scope 1 = diesel burnt on site (DG sets,
  equipment); Scope 2 = grid electricity used on site; Scope 3 = materials (A1–A3), transport (A4) and waste.

1. **Material quantities (A1–A3 basis)** per m² GFA by structure type (RCC frame defaults from HANDOVER A.4
   **[verify]**): concrete 0.45 m³/m², rebar 45 kg/m², masonry by opaque wall area, glass = window area × 10 mm ×
   2,500 kg/m³, aluminium frames **to source**.
2. **A1–A3 embodied carbon:** Σ quantity × emission factor. Factors **to source** from ICE v3 (Hammond & Jones,
   University of Bath) or India-specific sources (e.g. IFC EDGE India data), preferring India data for cement and
   steel. No factor ships without a citation.
3. **A4 transport:** Σ mass × distance × road-freight factor (kgCO2e/t·km) **to source**; default distances per
   material **[verify]**.
4. **A5 construction-site energy:** diesel litres per month by phase × 2.68 kgCO2/L **[verify]**; site grid
   electricity kWh per month by phase × 0.710 tCO2/MWh (CEA CO2 Baseline Database v21.0, FY 2024-25, editable).
5. **A5 waste:** wastage rate per material × its A1–A3 factor (wasted material must be produced too) **to source**.
6. **Envelope colouring:** each facade and roof surface coloured by its embodied kgCO2e per m² of surface
   (structure share by area + glazing + frames + masonry).
7. **GHG mitigations:** low-carbon concrete (GGBS / fly-ash replacement %, concrete factor −20% to −40%
   **[verify]**), recycled-content rebar, grid connection instead of DG, solar-hybrid DG, local sourcing (shorter A4
   distances), waste reduction (lower wastage rates).
8. **Dropped from the brief (D-003):** ISO 13790 5R1C hourly energy model, operational electricity and EPI, rooftop PV,
   refrigerant leakage, operational Scope 1/2.

---

## Parameter register

Every default in `packages/models` has a row here and a `// src:` comment in code. Rows are added as modules are
built (checkpoint 2 dust, checkpoint 3 heat and GHG).

| Parameter | Default | Unit | Source | Status |
|---|---|---|---|---|
| Construction programme | 3 + 12 + 9 | months | HANDOVER A.2.1 | [verify] (editable) |
| Working hours | 08:00–20:00 | local time | HANDOVER A.2.1 | [verify] (editable) |
| CEA grid emission factor | 0.710 | tCO2/MWh | CEA CO2 Baseline Database v21.0, FY 2024-25 | [verify] |
| NAAQS 2009 PM10 / PM2.5 limits | 100, 60 / 60, 40 | µg/m³ | CPCB NAAQS 2009 | [verify] |
| WHO 2021 PM10 / PM2.5 guidelines | 45, 15 / 15, 5 | µg/m³ | WHO AQG 2021 | [verify] |

## A.5 Quantities, programme and vehicle movement (D-020)

1. **Quantities from geometry:** GFA = footprint × floors; concrete = 0.45 m³/m² × GFA (HANDOVER A.4 **[verify]**);
   rebar = 45 kg/m² × GFA (HANDOVER A.4 **[verify]**); masonry = opaque facade area × wall thickness; glass = window
   area × 10 mm × 2,500 kg/m³ (HANDOVER A.4 **[verify]**); excavation (bank) = footprint × basements × basement
   storey depth; loose spoil = bank × bulking factor.
2. **Auto programme:** excavation months = ceil(bank volume ÷ daily excavation rate ÷ working days per month);
   structure months = ceil((floors + basements) × floor cycle days ÷ working days per month); finishing months =
   ceil(structure months × finishing share). **User override:** total or per phase; if only the total changes,
   phases scale proportionally (rounded, with the remainder added to structure). Values ≤ 0 are rejected; values
   below 50% of auto raise a warning.
3. **Vehicle movement:** loaded loads = quantity ÷ vehicle capacity (rounded up); one-way trips = 2 × loads (empty
   return); trips/day = trips ÷ (phase months × working days per month); on-site VKT/day = trips/day × haul route
   length (site gate to footprint centroid, from geometry); off-site t·km = mass × transport distance (A4).
   Spoil → excavation phase; concrete and rebar → structure phase; masonry and glass → finishing phase.

| Parameter | Default | Unit | Source | Status |
|---|---|---|---|---|
| Basements | 1 | storeys | Envelope demo default | [verify] (editable) |
| Basement storey depth | 3.6 | m | Equal to floor-to-floor (D-004) | [verify] |
| Bulking factor, excavated soil | to source | – | Earthworks swell factor tables | to source |
| Transit mixer capacity | to source | m³ | Indian RMC practice | to source |
| Tipper capacity (spoil) | to source | m³ loose | Indian practice | to source |
| Materials truck payload | to source | t | Indian practice | to source |
| Daily excavation rate | to source | m³/day | Contractor practice | to source |
| RCC floor cycle time | to source | days/floor | Contractor practice | to source |
| Finishing share of structure | 0.75 | – | HANDOVER A.2.1 ratio (9 ÷ 12 months) | [verify] |
| Working days per month | to source | days | 6-day week practice | to source |
| Transport distances (concrete, steel, aggregate, masonry, glass) | to source | km | Site-specific | to source |
