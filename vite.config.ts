import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { host: true },
  build: {
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/form.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: (asset) => asset.name?.endsWith('.css') ? 'assets/form.css' : 'assets/[name][extname]',
      },
    },
  },
});
