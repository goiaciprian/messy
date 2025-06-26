import { cleanEnv, url } from 'envalid'

export const env = cleanEnv(process.env, {
  DATABASE_URL: url({
    desc: 'PostgreSQL database connection URL',
    example: 'postgresql://username:password@localhost:5432/database_name'
  })
}) 