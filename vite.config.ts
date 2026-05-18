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
      '/api-manpower': {
        target: 'https://swarm-guidance-uplifting.ngrok-free.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-manpower/, '/api'),
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      },
    },
  },
});
