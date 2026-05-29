/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig(({ mode }) => ({
  plugins: [react(), mode === 'singlefile' && viteSingleFile()].filter(Boolean),
  base: mode === 'pages' ? '/TTR/' : './',
  server: {
    // Прибиваем dev-сервер к IPv4 loopback — иначе с поднятым WireGuard
    // Vite/Node иногда биндится на IPv6 ::1 или на VPN-адаптер, и браузер
    // получает ERR_CONNECTION_REFUSED при стуке в 127.0.0.1.
    host: '127.0.0.1',
    strictPort: true,
  },
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
