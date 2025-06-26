import webpush from 'web-push';
import { env, validateEnv } from './configuration.app';

// Validate environment variables at runtime
validateEnv();

// Configure web-push with validated environment variables
webpush.setVapidDetails(
  env.VAPID_EMAIL,
  env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  env.VAPID_PRIVATE_KEY
);

export { webpush };

// Helper function to send a push notification
export async function sendPushNotification(
  subscription: {
    endpoint: string;
    p256dh: string;
    auth: string;
  },
  payload: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: Record<string, unknown>;
  }
) {
  try {
    // Validate key lengths before sending
    const p256dhBuffer = Buffer.from(subscription.p256dh, 'base64');
    const authBuffer = Buffer.from(subscription.auth, 'base64');

    if (p256dhBuffer.length !== 65) {
      throw new Error(`Invalid p256dh key length: expected 65 bytes, got ${p256dhBuffer.length} bytes`);
    }

    if (authBuffer.length !== 16) {
      throw new Error(`Invalid auth key length: expected 16 bytes, got ${authBuffer.length} bytes`);
    }

    // The keys from our database are already base64 encoded
    // web-push expects them as base64 strings in the keys object
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    };

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/icon-192x192.png',
      data: payload.data || {},
    });

    const result = await webpush.sendNotification(pushSubscription, notificationPayload);
    return result;
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
}

// Get VAPID public key for client-side subscription
export function getVapidPublicKey() {
  return env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
} 