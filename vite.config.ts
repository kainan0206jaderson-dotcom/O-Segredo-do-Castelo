import { defineConfig } from 'vite';

export default defineConfig({
  // caminhos relativos: o build funciona em qualquer subpasta (GitHub Pages, itch.io)
  base: './',
  build: { target: 'es2020', assetsInlineLimit: 0 },
  server: { host: true },
});
