/**
 * Upstream API request builders and normalisers (docs/DATA_SOURCES.md).
 * The server performs the fetches (with cache and snapshot fallback); the browser only
 * ever sees normalised SiteData.
 */

export const WEATHER_VARS = [
  'temperature_2m',
  'relative_humidity_2m',
  'dew_point_2m',
  'surface_pressure',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
  'cloud_cover',
  'precipitation',
  'shortwave_radiation',
  'direct_radiation',
  'diffuse_radiation',
  'direct_normal_irradiance',
  'soil_moisture_0_to_7cm',
  'boundary_layer_height',
] as const;
export type WeatherVar = (typeof WEATHER_VARS)[number];

export const AIR_VARS = ['pm10', 'pm2_5', 'dust', 'aerosol_optical_depth'] as const;
export type AirVar = (typeof AIR_VARS)[number];

/** Hourly series in UTC, one value per hour of the weather year. */
export interface HourlySeries<K extends string> {
  time: string[]; // ISO 8601 UTC, e.g. 2025-01-01T00:00
  values: Record<K, number[]>;
  /** Count of missing values filled by interpolation, per variable. */
  filled: Partial<Record<K, number>>;
}

export interface OsmBuilding {
  id: number;
  ring: [number, number][]; // [lon, lat]
  heightM: number;
  heightSource: 'height' | 'levels' | 'default';
}

export interface OsmArea {
  id: number;
  kind: 'green' | 'water' | 'residential';
  ring: [number, number][];
}

export interface OsmReceptor {
  id: number;
  name: string;
  kind: 'school' | 'hospital' | 'clinic' | 'kindergarten' | 'residential';
  lon: number;
  lat: number;
}

export interface OsmRoad {
  id: number;
  line: [number, number][]; // [lon, lat]
  widthM: number;
}

export interface OsmData {
  buildings: OsmBuilding[];
  /** Absent in snapshots taken before roads were added. */
  roads?: OsmRoad[];
  areas: OsmArea[];
  receptors: OsmReceptor[];
}

export type ProvenanceStatus = 'live' | 'cached' | 'snapshot' | 'unavailable';

export interface Provenance {
  source: string;
  status: ProvenanceStatus;
  fetchedAt: string | null;
  url: string;
  attribution: string;
}

export interface SiteData {
  site: { lat: number; lon: number; elevationM: number | null };
  weatherYear: number;
  weather: HourlySeries<WeatherVar> | null;
  airQuality: HourlySeries<AirVar> | null;
  osm: OsmData | null;
  provenance: Record<'weather' | 'airQuality' | 'osm', Provenance>;
}

export function archiveUrl(lat: number, lon: number, year: number): string {
  const p = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    start_date: `${year}-01-01`,
    end_date: `${year}-12-31`,
    timezone: 'GMT',
    wind_speed_unit: 'ms',
    hourly: WEATHER_VARS.join(','),
  });
  return `https://archive-api.open-meteo.com/v1/archive?${p}`;
}

export function airQualityUrl(lat: number, lon: number, year: number): string {
  const p = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    start_date: `${year}-01-01`,
    end_date: `${year}-12-31`,
    timezone: 'GMT',
    hourly: AIR_VARS.join(','),
  });
  return `https://air-quality-api.open-meteo.com/v1/air-quality?${p}`;
}

export function overpassQuery(lat: number, lon: number, radiusM: number): string {
  const r = Math.round(radiusM);
  return `[out:json][timeout:60];
(
  way["building"](around:${r},${lat},${lon});
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|service)$"](around:${r},${lat},${lon});
  way["leisure"~"park|garden"](around:${r},${lat},${lon});
  way["landuse"~"grass|forest|meadow|recreation_ground|residential"](around:${r},${lat},${lon});
  way["natural"~"wood|scrub|water"](around:${r},${lat},${lon});
  nwr["amenity"~"school|hospital|clinic|kindergarten|college"](around:${r},${lat},${lon});
);
out tags geom;`;
}

/** Fills nulls by linear interpolation (edges hold the nearest value; all-null → 0). */
export function fillGaps(raw: (number | null)[]): { values: number[]; filled: number } {
  const out = new Array<number>(raw.length);
  let filled = 0;
  let last = -1;
  for (let i = 0; i < raw.length; i++) {
    const v = raw[i];
    if (v !== null && v !== undefined && Number.isFinite(v)) {
      if (last === -1 && i > 0) for (let j = 0; j < i; j++) out[j] = v;
      else if (last >= 0 && i - last > 1) {
        const a = out[last]!;
        for (let j = last + 1; j < i; j++) out[j] = a + ((v - a) * (j - last)) / (i - last);
      }
      out[i] = v;
      last = i;
    } else filled++;
  }
  if (last === -1) return { values: raw.map(() => 0), filled };
  for (let j = last + 1; j < raw.length; j++) out[j] = out[last]!;
  return { values: out, filled };
}

export function normaliseHourly<K extends string>(
  body: { hourly?: Record<string, (number | null)[] | string[]> },
  vars: readonly K[],
): HourlySeries<K> {
  const h = body.hourly;
  if (!h || !Array.isArray(h.time)) throw new Error('Open-Meteo response has no hourly.time');
  const time = h.time as string[];
  const values = {} as Record<K, number[]>;
  const filled: Partial<Record<K, number>> = {};
  for (const k of vars) {
    const series = (h[k] as (number | null)[] | undefined) ?? time.map(() => null);
    const r = fillGaps(series);
    values[k] = r.values;
    if (r.filled) filled[k] = r.filled;
  }
  return { time, values, filled };
}

const LEVEL_HEIGHT_M = 3.2; // src: HANDOVER A.1 (building:levels × 3.2 m) [verify]
const DEFAULT_HEIGHT_M = 9; // src: HANDOVER A.1 default when untagged [verify per city]
const LANE_WIDTH_M = 3.5; // src: HANDOVER A.1 (buffered roads, lanes × 3.5 m)
/** Default lanes when untagged, by highway class [verify]. */
const DEFAULT_LANES: Record<string, number> = {
  motorway: 4,
  trunk: 4,
  primary: 2,
  secondary: 2,
  tertiary: 2,
  unclassified: 2,
  residential: 1.5,
  service: 1,
};

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  geometry?: { lat: number; lon: number }[];
  bounds?: { minlat: number; minlon: number; maxlat: number; maxlon: number };
  tags?: Record<string, string>;
}

function centreOf(el: OverpassElement): { lat: number; lon: number } | null {
  if (el.lat !== undefined && el.lon !== undefined) return { lat: el.lat, lon: el.lon };
  if (el.center) return el.center;
  if (el.geometry?.length) {
    const g = el.geometry;
    return {
      lat: g.reduce((s, p) => s + p.lat, 0) / g.length,
      lon: g.reduce((s, p) => s + p.lon, 0) / g.length,
    };
  }
  if (el.bounds)
    return { lat: (el.bounds.minlat + el.bounds.maxlat) / 2, lon: (el.bounds.minlon + el.bounds.maxlon) / 2 };
  return null;
}

export function normaliseOverpass(body: { elements?: OverpassElement[] }): OsmData {
  const buildings: OsmBuilding[] = [];
  const areas: OsmArea[] = [];
  const receptors: OsmReceptor[] = [];
  const roads: OsmRoad[] = [];
  for (const el of body.elements ?? []) {
    const t = el.tags ?? {};
    const ring = el.geometry?.map((p) => [p.lon, p.lat] as [number, number]);
    const amenity = t.amenity;
    if (amenity && /^(school|hospital|clinic|kindergarten|college)$/.test(amenity)) {
      const c = centreOf(el);
      if (c)
        receptors.push({
          id: el.id,
          name: t.name ?? t['name:en'] ?? amenity,
          kind: amenity === 'college' ? 'school' : (amenity as OsmReceptor['kind']),
          lat: c.lat,
          lon: c.lon,
        });
      if (!t.building) continue;
    }
    if (t.highway && ring && ring.length >= 2) {
      const lanes = parseFloat(t.lanes ?? '') || DEFAULT_LANES[t.highway] || 1;
      roads.push({ id: el.id, line: ring, widthM: lanes * LANE_WIDTH_M });
      continue;
    }
    if (!ring || ring.length < 4) continue;
    if (t.building) {
      const h = parseFloat(t.height ?? '');
      const lv = parseFloat(t['building:levels'] ?? '');
      if (Number.isFinite(h) && h > 0)
        buildings.push({ id: el.id, ring, heightM: h, heightSource: 'height' });
      else if (Number.isFinite(lv) && lv > 0)
        buildings.push({ id: el.id, ring, heightM: lv * LEVEL_HEIGHT_M, heightSource: 'levels' });
      else buildings.push({ id: el.id, ring, heightM: DEFAULT_HEIGHT_M, heightSource: 'default' });
    } else if (t.landuse === 'residential') {
      areas.push({ id: el.id, kind: 'residential', ring });
      const c = centreOf(el);
      if (c) receptors.push({ id: el.id, name: t.name ?? 'Residential area', kind: 'residential', ...c });
    } else if (t.natural === 'water') areas.push({ id: el.id, kind: 'water', ring });
    else areas.push({ id: el.id, kind: 'green', ring });
  }
  return { buildings, roads, areas, receptors };
}
