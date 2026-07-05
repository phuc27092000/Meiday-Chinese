import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0', // Cho phép truy cập từ network
    port: 5173,
    allowedHosts: [
      'photoperiodic-unwaxed-sabra.ngrok-free.dev' // Điền chính xác domain bị chặn vào đây
    ]
  },
});