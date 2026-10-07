import { Hono } from 'hono';
import { env } from './env';
import type { ReportImages, ReportPayload } from '@envelope/report';
import { buildReport, readReport } from './report';
import { getSiteData } from './siteData';

export const app = new Hono();

app.get('/api/health', (c) =>
  c.json({
    ok: true,
    service: 'envelope-server',
    time: new Date().toISOString(),
    keys: {
      // Presence only. Never return key values except the ion token in /api/config.
      cesiumIon: Boolean(env.cesiumIonToken),
      googleMaps: Boolean(env.googleMapsApiKey),
      gemini: Boolean(env.geminiApiKey),
      groq: Boolean(env.groqApiKey),
      openAq: Boolean(env.openAqApiKey),
    },
  }),
);

/**
 * Runtime client config. The Cesium ion token is the one credential the browser needs
 * (Cesium streams tiles directly). It is URL-restricted and asset-scoped on ion, and is
 * served here at runtime so it is never bundled or committed. See docs/DECISIONS.md D-011.
 */
app.get('/api/config', (c) =>
  c.json({
    cesiumIonToken: env.cesiumIonToken ?? null,
  }),
);

/** Site data for the models: weather (ERA5), air quality (CAMS) and OSM, with provenance per source. */
app.get('/api/site-data', async (c) => {
  const lat = Number(c.req.query('lat'));
  const lon = Number(c.req.query('lon'));
  const year = Number(c.req.query('year'));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isInteger(year)) {
    return c.json({ error: 'lat, lon and year are required' }, 400);
  }
  const data = await getSiteData(lat, lon, year, {
    offline: c.req.query('offline') === '1',
    refresh: c.req.query('refresh') === '1',
  });
  return c.json(data);
});

/** Builds the assessment report: narrative (LLM or template) → number validator → HTML → PDF. */
app.post('/api/report', async (c) => {
  const body = (await c.req.json()) as { payload?: ReportPayload; images?: ReportImages };
  if (!body.payload) return c.json({ error: 'payload is required' }, 400);
  return c.json(await buildReport(body.payload, body.images ?? {}));
});

app.get('/api/report/:file', async (c) => {
  const m = /^([0-9a-f-]{36})\.(pdf|html)$/.exec(c.req.param('file'));
  if (!m) return c.json({ error: 'not_found' }, 404);
  const ext = m[2] as 'pdf' | 'html';
  const buf = await readReport(m[1]!, ext);
  if (!buf) return c.json({ error: 'not_found' }, 404);
  return new Response(new Uint8Array(buf), {
    headers:
      ext === 'pdf'
        ? {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'inline; filename="Envelope-assessment-report.pdf"',
          }
        : { 'Content-Type': 'text/html; charset=utf-8' },
  });
});

app.notFound((c) => c.json({ error: 'not_found' }, 404));
app.onError((err, c) => {
  console.error('[server]', err.message);
  return c.json({ error: 'internal_error' }, 500);
});
