import type { SiteData } from '@envelope/data';
import type { EngineInput } from '@envelope/models';
import { NO_MITIGATIONS, withOverrides } from '@envelope/models';
import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { demoBuilding } from '../viewer/site';
import { compute } from './client';

/** Loads site data once, then reruns baseline + mitigated whenever the scenario changes. */
export function useAnalysis() {
  const siteData = useAppStore((s) => s.siteData);
  const scenario = useAppStore((s) => s.scenario);
  const mitigations = useAppStore((s) => s.mitigations);
  const assumptions = useAppStore((s) => s.assumptions);
  const programmeOverride = useAppStore((s) => s.programmeOverride);
  const ready = useRef<Promise<void> | null>(null);
  const runId = useRef(0);

  useEffect(() => {
    const { site } = demoBuilding;
    const year = useAppStore.getState().scenario.weatherYear;
    const offline = new URLSearchParams(window.location.search).get('offline') === '1' ? '&offline=1' : '';
    void (async () => {
      try {
        const res = await fetch(`/api/site-data?lat=${site.lat}&lon=${site.lon}&year=${year}${offline}`);
        if (!res.ok) throw new Error(`site-data ${res.status}`);
        const data = (await res.json()) as SiteData;
        useAppStore.getState().setSiteData(data, 'ready');
      } catch {
        useAppStore.getState().setSiteData(null, 'error');
        // GHG and logistics still run without weather.
        useAppStore.getState().setSiteData(
          {
            site: { lat: site.lat, lon: site.lon, elevationM: null },
            weatherYear: year,
            weather: null,
            airQuality: null,
            osm: null,
            provenance: {
              weather: {
                source: 'weather',
                status: 'unavailable',
                fetchedAt: null,
                url: '',
                attribution: '',
              },
              airQuality: {
                source: 'airQuality',
                status: 'unavailable',
                fetchedAt: null,
                url: '',
                attribution: '',
              },
              osm: { source: 'osm', status: 'unavailable', fetchedAt: null, url: '', attribution: '' },
            },
          },
          'error',
        );
      }
    })();
  }, []);

  useEffect(() => {
    if (!siteData) return;
    ready.current = compute().init({
      spec: demoBuilding,
      weatherYear: siteData.weatherYear,
      weather: siteData.weather?.values ?? null,
      air: siteData.airQuality?.values ?? null,
      osm: siteData.osm,
    });
  }, [siteData]);

  useEffect(() => {
    if (!siteData || !ready.current) return;
    const id = ++runId.current;
    const timer = window.setTimeout(async () => {
      useAppStore.getState().setRunning(true);
      const t0 = performance.now();
      try {
        await ready.current;
        const base: Omit<EngineInput, 'mitigations'> = {
          assumptions: withOverrides(assumptions),
          programmeOverride,
          constructionMonth: scenario.constructionMonth,
          dayOfMonth: scenario.dayOfMonth,
          hour: scenario.hour,
        };
        const results = await compute().run(
          { ...base, mitigations: NO_MITIGATIONS },
          { ...base, mitigations },
        );
        if (id !== runId.current) return;
        useAppStore.getState().setResults(results, Math.round(performance.now() - t0));
      } catch (err) {
        if (id !== runId.current) return;
        useAppStore.getState().setResults(null, null, (err as Error).message);
      }
    }, 120);
    return () => window.clearTimeout(timer);
  }, [
    siteData,
    scenario.constructionMonth,
    scenario.dayOfMonth,
    scenario.hour,
    mitigations,
    assumptions,
    programmeOverride,
  ]);
}
