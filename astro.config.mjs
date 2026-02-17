import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  integrations: [react()],
  vite: {
    server: {
      proxy: {
        '/api': {
          target: 'https://lp-factory-api.songsawat-w.workers.dev',
          changeOrigin: true,
          secure: true,
        },
      },
    },
    ssr: {
      noExternal: [],
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src/templates/astrodeck-main/src', import.meta.url)),
      },
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    },
  },
});
