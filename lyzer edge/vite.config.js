import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:7860',
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['apexcharts', 'lightweight-charts']
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@lyzer/shared': fileURLToPath(new URL('../packages/lyzer-shared/src', import.meta.url)),
      '@lyzer/constitution': fileURLToPath(new URL('../packages/lyzer-constitution/src', import.meta.url))
    }
  }
});
