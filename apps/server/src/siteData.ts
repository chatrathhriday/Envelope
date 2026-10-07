import type { AirVar, OsmData, Provenance, SiteData, WeatherVar } from '@envelope/data';
import {
  AIR_VARS,
  WEATHER_VARS,
  airQualityUrl,
  archiveUrl,
  normaliseHourly,
  normaliseOverpass,
  overpassQuery,
} from '@envelope/data';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { CacheEntry } from './cache';
import { FileCache } from './cache';
import { env, repoRoot } from './env';

const cache = new FileCache(env.cacheDir);
const SNAPSHOT_DIR = resolve(repoRoot, 'fixtures/demo');
const FRESH_MS = 24 * 3600_000;
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
// Public mirrors, tried in order when the main instance is overloaded (frequent 504s).
const OVERPASS_MIRRORS = [
  OVERPASS_URL,
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

// Overpass is often overloaded; remember a failure for 10 minutes so it never stalls page loads.
let overpassDownUntil = 0;

async function fetchOverpass(q: string): Promise<unknown> {
  if (Date.now() < overpassDownUntil) throw new Error('Overpass marked unavailable (recent failure)');
  let lastErr: unknown;
  for (const url of OVERPASS_MIRRORS.slice(0, 2)) {
    try {
      return await fetchJson(
        url,
        {
          method: 'POST',
          body: new URLSearchParams({ data: q }),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
        12_000,
      );
    } catch (err) {
      lastErr = err;
    }
  }
  overpassDownUntil = Date.now() + 10 * 60_000;
  throw lastErr;
}
const OSM_RADIUS_M = 700;

const ATTR = {
  weather: 'Weather data by Open-Meteo.com (CC BY 4.0), ERA5 reanalysis',
  airQuality: 'Open-Meteo.com; CAMS global atmospheric composition (Copernicus)',
  osm: '© OpenStreetMap contributors (ODbL), via Overpass API',
};

async function fetchJson(url: string, init?: RequestInit, timeoutMs = 45_000): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Envelope/0.1 (hackathon demo)', ...(init?.headers ?? {}) },
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

async function readSnapshot<T>(name: string): Promise<CacheEntry<T> | null> {
  try {
    return JSON.parse(await readFile(resolve(SNAPSHOT_DIR, `${name}.json`), 'utf8')) as CacheEntry<T>;
  } catch {
    return null;
  }
}

async function writeSnapshot<T>(name: string, entry: CacheEntry<T>): Promise<void> {
  await mkdir(SNAPSHOT_DIR, { recursive: true });
  await writeFile(resolve(SNAPSHOT_DIR, `${name}.json`), JSON.stringify(entry), 'utf8');
}

/**
 * Cache-first fetch with fallbacks (CLAUDE.md §2 demo resilience):
 * fresh cache → live → stale cache → committed snapshot → unavailable.
 */
async function resolveSource<T>(
  name: 'weather' | 'airQuality' | 'osm',
  key: string,
  url: string,
  load: () => Promise<T>,
  opts: { offline: boolean; refresh: boolean },
): Promise<{ data: T | null; prov: Provenance }> {
  const prov = (status: Provenance['status'], fetchedAt: string | null): Provenance => ({
    source: name,
    status,
    fetchedAt,
    url,
    attribution: ATTR[name],
  });
  const cached = await cache.get<T>(key);
  if (cached && !opts.refresh && FileCache.isFresh(cached, FRESH_MS))
    return { data: cached.data, prov: prov('cached', cached.fetchedAt) };
  if (!opts.offline) {
    try {
      const data = await load();
      const entry = await cache.set(key, name, data);
      await writeSnapshot(name, entry);
      return { data, prov: prov('live', entry.fetchedAt) };
    } catch (err) {
      console.warn(`[site-data] ${name} live fetch failed: ${(err as Error).message}`);
    }
  }
  if (cached) return { data: cached.data, prov: prov('cached', cached.fetchedAt) };
  const snap = await readSnapshot<T>(name);
  if (snap) return { data: snap.data, prov: prov('snapshot', snap.fetchedAt) };
  return { data: null, prov: prov('unavailable', null) };
}

export async function getSiteData(
  lat: number,
  lon: number,
  year: number,
  opts: { offline?: boolean; refresh?: boolean } = {},
): Promise<SiteData> {
  const o = { offline: Boolean(opts.offline), refresh: Boolean(opts.refresh) };
  const wUrl = archiveUrl(lat, lon, year);
  const aUrl = airQualityUrl(lat, lon, year);
  const q = overpassQuery(lat, lon, OSM_RADIUS_M);
  const [weather, air, osm] = await Promise.all([
    resolveSource(
      'weather',
      `weather:${wUrl}`,
      wUrl,
      async () => {
        const body = (await fetchJson(wUrl)) as {
          hourly?: Record<string, (number | null)[]>;
          elevation?: number;
        };
        return { series: normaliseHourly<WeatherVar>(body, WEATHER_VARS), elevation: body.elevation ?? null };
      },
      o,
    ),
    resolveSource(
      'airQuality',
      `aq:${aUrl}`,
      aUrl,
      async () =>
        normaliseHourly<AirVar>(
          (await fetchJson(aUrl)) as { hourly?: Record<string, (number | null)[]> },
          AIR_VARS,
        ),
      o,
    ),
    resolveSource<OsmData>(
      'osm',
      `osm:${q}`,
      OVERPASS_URL,
      async () => normaliseOverpass((await fetchOverpass(q)) as { elements?: [] }),
      o,
    ),
  ]);
  return {
    site: { lat, lon, elevationM: weather.data?.elevation ?? null },
    weatherYear: year,
    weather: weather.data?.series ?? null,
    airQuality: air.data,
    osm: osm.data,
    provenance: { weather: weather.prov, airQuality: air.prov, osm: osm.prov },
  };
}
