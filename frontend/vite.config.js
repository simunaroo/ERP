import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxy /api sang backend de frontend goi cung origin, khong vuong CORS khi dev.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:4000' },
  },
});
