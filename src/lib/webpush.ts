import webpush from 'web-push';
import { env } from './configuration.app';

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