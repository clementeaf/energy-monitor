import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'https://626lq125eh.execute-api.us-east-1.amazonaws.com',
        changeOrigin: true,
      },
    },
  },
})
