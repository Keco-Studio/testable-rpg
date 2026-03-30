import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    allowedHosts: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
