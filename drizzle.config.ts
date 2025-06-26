import { defineConfig } from 'drizzle-kit'
import { env } from './src/lib/configuration.app'

export default defineConfig({
  schema: './src/lib/schema.drizzle.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
}) 