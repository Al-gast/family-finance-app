import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => {
  const validationRelease =
    process.env.FAMILY_FINANCE_RELEASE === 'validation'
  const localRelease = process.env.FAMILY_FINANCE_RELEASE === 'local'
  const publicOnlyRelease = validationRelease || localRelease
  const hasLocalDatabase = Boolean(
    process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_DB_FRESH?.trim(),
  )
  const runWithoutDatabase = command === 'serve' && !hasLocalDatabase
  const configPath = publicOnlyRelease
    ? localRelease
      ? './deploy/local/wrangler.jsonc'
      : './deploy/validation/wrangler.jsonc'
    : runWithoutDatabase
      ? './wrangler.m0.1.jsonc'
      : './wrangler.jsonc'

  return {
    plugins: [
      react(),
      {
        name: 'family-finance-validation-entry',
        transformIndexHtml(html) {
          if (validationRelease) {
            return html.replace(
              '/src/react-app/main.tsx',
              '/src/react-app/validation-main.tsx',
            )
          }
          if (localRelease) {
            return html.replace(
              '/src/react-app/main.tsx',
              '/src/react-app/local-main.tsx',
            )
          }
          return html
        },
      },
      cloudflare({
        viteEnvironment: { name: 'worker' },
        configPath,
      }),
    ],
    ...(publicOnlyRelease
      ? {
          define: {
            'import.meta.env.VITE_EARLY_ACCESS_URL': JSON.stringify(''),
            'import.meta.env.VITE_NEON_AUTH_URL': JSON.stringify(''),
          },
          resolve: {
            alias: {
              '/src/react-app/main.tsx':
                validationRelease
                  ? '/src/react-app/validation-main.tsx'
                  : '/src/react-app/local-main.tsx',
            },
          },
        }
      : {}),
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

