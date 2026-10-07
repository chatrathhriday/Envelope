import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

config({ path: resolve(repoRoot, '.env'), quiet: true });

function opt(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== '' ? v.trim() : undefined;
}

export const env = {
  port: Number(opt('SERVER_PORT') ?? 8787),
  cesiumIonToken: opt('CESIUM_ION_TOKEN'),
  googleMapsApiKey: opt('GOOGLE_MAPS_API_KEY'),
  geminiApiKey: opt('GEMINI_API_KEY'),
  geminiModel: opt('GEMINI_MODEL'),
  groqApiKey: opt('GROQ_API_KEY'),
  groqModel: opt('GROQ_MODEL'),
  openAqApiKey: opt('OPENAQ_API_KEY'),
  cacheDir: resolve(repoRoot, '.cache'),
};
