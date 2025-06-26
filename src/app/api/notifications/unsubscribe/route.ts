import { NextRequest, NextResponse } from 'next/server';
import { removeSubscription } from '~/lib/subscription.actions';

export async function POST(request: NextRequest) {
  try {
    const { endpoint } = await request.json();

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Missing endpoint' },
        { status: 400 }
      );
    }

    // Remove subscription from database
    const removedSubscription = await removeSubscription(endpoint);

    return NextResponse.json({
      success: true,
      subscription: removedSubscription,
    });
  } catch (error) {
    console.error('Error unsubscribing from notifications:', error);
    return NextResponse.json(
      { error: 'Failed to unsubscribe from notifications' },
      { status: 500 }
    );
  }
} 