import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), 
  ],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      buffer: 'buffer',
      process: 'process/browser',
      stream: 'stream-browserify',
      util: 'util/',
      events: 'events/'
    }
  },
  optimizeDeps: {
    include: ['buffer', 'process', 'util', 'events'],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  }
});