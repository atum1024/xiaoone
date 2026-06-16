import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import { createDevBffProxy, createDevWsProxy } from '../viteDevProxy'

function deployEnvMetaPlugin(deployEnv: string) {
  return {
    name: 'deploy-env-meta',
    transformIndexHtml(html: string) {
      return html.replace(
        /(<meta\s+name=["']xiaoone-env["']\s+content=["'])([^"']*)(["']\s*\/?>)/,
        `$1${deployEnv}$3`,
      )
    },
  }
}

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/marketing/assets', filename)
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const deployEnv = env.VITE_DEPLOY_ENV || process.env.VITE_DEPLOY_ENV || 'local'
  const bffTarget = env.VITE_BFF_BASE || 'http://127.0.0.1:8100'

  return {
    define: {
      'import.meta.env.VITE_DEPLOY_ENV': JSON.stringify(deployEnv),
    },
    plugins: [deployEnvMetaPlugin(deployEnv), figmaAssetResolver(), react(), tailwindcss()],
    resolve: {
      dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        react: fileURLToPath(new URL('../node_modules/react', import.meta.url)),
        'react-dom': fileURLToPath(new URL('../node_modules/react-dom', import.meta.url)),
        'react/jsx-runtime': fileURLToPath(new URL('../node_modules/react/jsx-runtime.js', import.meta.url)),
      },
    },
    build: {
      emptyOutDir: false,
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('/src/marketing/')) {
              return 'marketing-pages'
            }
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                return 'vendor-react'
              }
              if (
                id.includes('@mui')
                || id.includes('@emotion')
                || id.includes('recharts')
                || id.includes('react-slick')
                || id.includes('embla-carousel')
              ) {
                return 'vendor-marketing'
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
      allowedHosts: [
        'xiaoone.cn', 'www.xiaoone.cn', 'vip.xiaoone.cn', 'api.xiaoone.cn', 'ws.xiaoone.cn',
        'xiaoone.ai', 'www.xiaoone.ai', 'vip.xiaoone.ai', 'api.xiaoone.ai', 'ws.xiaoone.ai',
        'c.xiaoone.net', 'vip.c.xiaoone.net', 'admin.c.xiaoone.net', 'api.c.xiaoone.net', 'ws.c.xiaoone.net',
        'p.xiaoone.net', 'vip.p.xiaoone.net', 'admin.p.xiaoone.net', 'api.p.xiaoone.net', 'ws.p.xiaoone.net',
        'i.xiaoone.net', 'vip.i.xiaoone.net', 'admin.i.xiaoone.net', 'api.i.xiaoone.net', 'ws.i.xiaoone.net',
      ],
      proxy: {
        '/api': createDevBffProxy(bffTarget),
        '/oauth2': createDevBffProxy(bffTarget),
        '/ws': createDevWsProxy(env.VITE_CHAT_BASE || 'ws://127.0.0.1:8103'),
      },
    },
  }
})
