// Simple environment configuration without envalid
export const env = {
  DATABASE_URL: process.env.DATABASE_URL || '',
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || '',
  VAPID_EMAIL: process.env.VAPID_EMAIL || 'mailto:admin@messymessages.com'
}

// Runtime validation function (call this in your app when needed)
export function validateEnv() {
  const errors: string[] = []
  
  if (!env.DATABASE_URL) {
    errors.push('DATABASE_URL is required')
  }
  
  if (!env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    errors.push('NEXT_PUBLIC_VAPID_PUBLIC_KEY is required')
  }
  
  if (!env.VAPID_PRIVATE_KEY) {
    errors.push('VAPID_PRIVATE_KEY is required')
  }
  
  if (!env.VAPID_EMAIL || !env.VAPID_EMAIL.includes('@')) {
    errors.push('VAPID_EMAIL must be a valid email address')
  }
  
  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`)
  }
  
  return env
} 