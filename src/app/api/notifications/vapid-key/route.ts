import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Force this endpoint to be dynamic

export async function GET() {
  try {
    // Get the VAPID public key directly from environment at runtime
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    
    if (!publicKey) {
      console.error('VAPID public key not configured in environment');
      return NextResponse.json(
        { error: 'VAPID public key not configured' },
        { status: 500 }
      );
    }

    console.log('Serving VAPID public key to client');
    
    return NextResponse.json({
      publicKey: publicKey
    });
  } catch (error) {
    console.error('Error serving VAPID public key:', error);
    return NextResponse.json(
      { error: 'Failed to get VAPID public key' },
      { status: 500 }
    );
  }
} 