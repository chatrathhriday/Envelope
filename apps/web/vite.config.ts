import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// CesiumJS loads workers, assets and widget CSS at runtime from CESIUM_BASE_URL.
const cesiumBuild = 'node_modules/cesium/Build/Cesium';
const CESIUM_BASE_URL = '/cesium';

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      // stripBase: 4 drops node_modules/cesium/Build/Cesium, so files land at /cesium/<dir>/...
      targets: ['Workers', 'ThirdParty', 'Assets', 'Widgets'].map((dir) => ({
        src: `${cesiumBuild}/${dir}/**/*`,
        dest: CESIUM_BASE_URL.slice(1),
        rename: { stripBase: 4 },
      })),
    }),
  ],
  define: {
    CESIUM_BASE_URL: JSON.stringify(CESIUM_BASE_URL),
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
});
