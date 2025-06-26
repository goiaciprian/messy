'use server';

import { 
  createSubscription, 
  getSubscriptionByUserAndEndpoint,
  deleteSubscriptionByEndpoint 
} from './queries.drizzle';

interface SubscriptionJSON {
  endpoint: string;
  keys: {
    p256dh: string | ArrayBuffer;
    auth: string | ArrayBuffer;
  };
}

export async function saveSubscription(
  userId: string,
  subscription: SubscriptionJSON
) {
  try {
    const endpoint = subscription.endpoint;
    const keys = subscription.keys;


    if (!keys?.p256dh || !keys?.auth) {
      throw new Error('Invalid subscription keys');
    }

    // The keys come from subscription.toJSON() on the client side
    // They should already be base64 encoded strings
    let p256dh: string;
    let auth: string;

    if (typeof keys.p256dh === 'string') {
      // Already a base64 string
      p256dh = keys.p256dh;
    } else {
      // Convert ArrayBuffer to base64
      p256dh = Buffer.from(keys.p256dh).toString('base64');
    }

    if (typeof keys.auth === 'string') {
      // Already a base64 string
      auth = keys.auth;
    } else {
      // Convert ArrayBuffer to base64
      auth = Buffer.from(keys.auth).toString('base64');
    }

    // Check if subscription already exists
    const existingSubscription = await getSubscriptionByUserAndEndpoint(userId, endpoint);
    
    if (existingSubscription) {
      console.log('Subscription already exists for user:', userId);
      return existingSubscription;
    }

    // Create new subscription
    const newSubscription = await createSubscription({
      userId,
      endpoint,
      p256dh,
      auth
    });

    console.log('Subscription saved for user:', userId);
    return newSubscription;
  } catch (error) {
    console.error('Error saving subscription:', error);
    throw error;
  }
}

export async function removeSubscription(endpoint: string) {
  try {
    const deletedSubscription = await deleteSubscriptionByEndpoint(endpoint);
    console.log('Subscription removed:', endpoint);
    return deletedSubscription;
  } catch (error) {
    console.error('Error removing subscription:', error);
    throw error;
  }
} 