import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function getPackageChunkName(id: string) {
  const [, nodeModulesPath] = id.split('node_modules/')
  if (!nodeModulesPath) return 'vendor'

  const segments = nodeModulesPath.split('/')
  const packageName = segments[0].startsWith('@')
    ? `${segments[0]}-${segments[1]}`
    : segments[0]

  return `vendor-${packageName.replaceAll(/[^a-zA-Z0-9-]/g, '-')}`
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          if (id.includes('highcharts/highstock') || id.includes('highcharts/esm/highstock')) {
            return 'vendor-highstock'
          }
          if (id.includes('highcharts/highcharts') || id.includes('highcharts/esm/highcharts')) {
            return 'vendor-highcharts-core'
          }
          if (id.includes('@azure/msal')) return 'vendor-msal'
          if (id.includes('@react-oauth/google')) return 'vendor-google-auth'
          if (id.includes('@tanstack/react-query')) return 'vendor-query'
          if (id.includes('@tanstack/react-table')) return 'vendor-table'
          if (id.includes('react-router')) return 'vendor-router'
          if (id.includes('zustand')) return 'vendor-zustand'
          if (
            id.includes('axios') ||
            id.includes('set-cookie-parser') ||
            id.includes('/cookie/')
          ) {
            return 'vendor-axios'
          }
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('scheduler')
          ) {
            return 'vendor-react'
          }

          return getPackageChunkName(id)
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://626lq125eh.execute-api.us-east-1.amazonaws.com',
        changeOrigin: true,
      },
    },
  },
})
