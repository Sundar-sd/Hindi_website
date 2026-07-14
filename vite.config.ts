import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/military': {
        target: 'https://concise-egomaniac-starved.ngrok-free.dev',
        changeOrigin: true,
      },
      '/api-manpower': {
        target: 'https://api.codingboss.in',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-manpower/, '/military'),
      },
      '/api-proxy': {
        target: 'https://api.codingboss.in',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-proxy/, ''),
      },
    },
  },
});
