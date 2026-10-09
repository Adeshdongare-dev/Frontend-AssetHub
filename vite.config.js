import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://localhost:5101',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
// import react from '@vitejs/plugin-react'
// import { defineConfig } from 'vite'

// export default defineConfig({
//   plugins: [react()],
//   build: {
//     assetsDir: 'static',
//   },
//   server: {
//     port: 5173,
//     proxy: {
//       '/api': {
//         target: 'https://assetapi.sdaemon.com',
//         changeOrigin: true,
//         secure: false,
//       },
//     },
//   },
// })
