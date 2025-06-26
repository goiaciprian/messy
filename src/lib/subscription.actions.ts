'use server';

import { 
  createSubscription, 
  getSubscriptionByUserAndEndpoint,
  deleteSubscriptionByEndpoint 
} from './queries.drizzle';

export async function saveSubscription(
  userId: string,
  subscription: PushSubscription
) {
  try {
    const endpoint = subscription.endpoint;
    const keys = {
    //@ts-expect-error error
      p256dh: subscription.keys.p256dh,
    //@ts-expect-error error
      auth: subscription.keys.auth
    };

    console.log('Keys:', keys);

    if (!keys?.p256dh || !keys?.auth) {
      throw new Error('Invalid subscription keys');
    }

    // Convert ArrayBuffer to base64
    const p256dh = Buffer.from(keys.p256dh).toString('base64');
    const auth = Buffer.from(keys.auth).toString('base64');

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