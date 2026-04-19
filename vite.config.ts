/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig(({ mode }) => ({
  plugins: [react(), mode === 'singlefile' && viteSingleFile()].filter(Boolean),
  base: mode === 'pages' ? '/TTR/' : './',
  build: {
    outDir: mode === 'singlefile' ? 'dist-single' : 'dist',
    assetsInlineLimit: mode === 'singlefile' ? 100_000_000 : 4096,
    cssCodeSplit: mode !== 'singlefile',
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
}));
