import { defineConfig } from 'drizzle-kit'
import './scripts/load-local-environment'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for Drizzle migrations')
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: databaseUrl,
  },
})

