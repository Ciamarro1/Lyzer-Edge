import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    coverage: {
      reporter: ['text', 'json', 'html']
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

