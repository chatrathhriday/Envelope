import { describe, expect, it } from 'vitest';
import { app } from './app';

describe('server routes', () => {
  it('GET /api/health reports ok and key presence without values', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; keys: Record<string, unknown> };
    expect(body.ok).toBe(true);
    for (const v of Object.values(body.keys)) expect(typeof v).toBe('boolean');
  });

  it('unknown routes return JSON 404', async () => {
    const res = await app.request('/api/nope');
    expect(res.status).toBe(404);
  });
});
