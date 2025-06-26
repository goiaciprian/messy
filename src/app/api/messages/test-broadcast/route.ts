import { NextResponse } from 'next/server';
import { broadcastMessage } from '~/lib/sse-manager';

export async function POST() {
  // Send a test message to all connected clients
  broadcastMessage({
    type: 'new_message',
    message: {
      id: 'test-' + Date.now(),
      content: 'Test broadcast message',
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 'test-user',
      user: {
        id: 'test-user',
        name: 'Test User'
      }
    }
  });

  return NextResponse.json({
    success: true,
    message: 'Test broadcast sent',
    timestamp: new Date().toISOString()
  });
} 