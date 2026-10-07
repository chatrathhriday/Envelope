import { Hono } from 'hono';
import { env } from './env';

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

app.notFound((c) => c.json({ error: 'not_found' }, 404));
app.onError((err, c) => {
  console.error('[server]', err.message);
  return c.json({ error: 'internal_error' }, 500);
});
