import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from './configuration.app'

// Create the connection
const connection = postgres(env.DATABASE_URL)

// Create the database instance
export const client = drizzle(connection) 