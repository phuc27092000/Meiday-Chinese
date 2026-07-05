import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0', // Cho phép truy cập từ network
    port: 5173,
    allowedHosts: 'all' // Cho phép tất cả host khi dùng tunnel
  },
});