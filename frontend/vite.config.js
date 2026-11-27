import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxy /api sang backend de frontend goi cung origin, khong vuong CORS khi dev.
export default defineConfig({
  plugins: [react()],
  // host: true -> nghe tren moi dia chi mang (0.0.0.0), dien thoai cung Wi-Fi vao duoc qua http://<IP may>:5173.
  // Dien thoai chi can goi Vite; /api duoc Vite chuyen tiep ve backend tren chinh may nay nen backend khong can mo ra mang.
  server: {
    host: true,
    port: 5173,
    proxy: { '/api': process.env.VITE_API_TARGET || 'http://localhost:4000' },
  },
  preview: { host: true, port: 4173, proxy: { '/api': process.env.VITE_API_TARGET || 'http://localhost:4000' } },
});
