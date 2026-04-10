import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/aws-cost/',
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/aws-cost/api': {
        target: 'http://localhost:3001',
        rewrite: (path) => path.replace(/^\/aws-cost\/api/, '/api')
      }
    }
  }
});
