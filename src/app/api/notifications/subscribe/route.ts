import { NextRequest, NextResponse } from 'next/server';
import { saveSubscription } from '~/lib/subscription.actions';

export async function POST(request: NextRequest) {
  try {
    const { subscription, userId } = await request.json();

    console.log('Subscription:', subscription);
    console.log('User ID:', userId);

    if (!subscription || !userId) {
      return NextResponse.json(
        { error: 'Missing subscription or userId' },
        { status: 400 }
      );
    }

    // Save subscription to database
    const savedSubscription = await saveSubscription(userId, subscription);

    return NextResponse.json({
      success: true,
      subscription: savedSubscription,
    });
  } catch (error) {
    console.error('Error subscribing to notifications:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe to notifications' },
      { status: 500 }
    );
  }
} 