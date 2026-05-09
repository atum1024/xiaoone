import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                return 'vendor-react'
              }
              if (id.includes('@radix-ui') || id.includes('lucide-react')) {
                return 'vendor-radix'
              }
              return 'vendor'
            }
          },
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5177,
      strictPort: true,
      proxy: {
        '/api': env.VITE_BFF_BASE || 'http://127.0.0.1:8100',
        '/oauth2': env.VITE_BFF_BASE || 'http://127.0.0.1:8100',
        '/ws': {
          target: env.VITE_CHAT_BASE || 'ws://127.0.0.1:8103',
          ws: true,
        },
      },
    },
  }
})
