import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, isPreview }) => ({
  plugins: [react()],
  // GitHub Pages serves the site from https://drongier.github.io/PianoTools/.
  // The dev server stays at the root; build and preview use the Pages path.
  base: command === 'build' || isPreview ? '/PianoTools/' : '/',
}));
