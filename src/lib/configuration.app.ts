import { cleanEnv, url, str, email } from 'envalid'

export const env = cleanEnv(process.env, {
  DATABASE_URL: url({
    desc: 'PostgreSQL database connection URL',
    example: 'postgresql://username:password@localhost:5432/database_name'
  }),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: str({
    desc: 'VAPID public key for push notifications',
    example: 'BFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
  }),
  VAPID_PRIVATE_KEY: str({
    desc: 'VAPID private key for push notifications',
    example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
  }),
  VAPID_EMAIL: email({
    desc: 'Email address for VAPID identification',
    example: 'mailto:admin@example.com',
    default: 'mailto:admin@messymessages.com'
  })
}) 