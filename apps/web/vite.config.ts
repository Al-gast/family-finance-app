import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => {
  const hasLocalDatabase = Boolean(
    process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_DB_FRESH?.trim(),
  )
  const runWithoutDatabase = command === 'serve' && !hasLocalDatabase

  return {
    plugins: [
      react(),
      cloudflare({
        viteEnvironment: { name: 'worker' },
        configPath: runWithoutDatabase
          ? './wrangler.m0.1.jsonc'
          : './wrangler.jsonc',
      }),
    ],
    environments: {
      worker: {
        build: {
          sourcemap: true,
        },
      },
    },
    server: {
      cors: false,
    },
  }
})

