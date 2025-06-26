import { NextResponse } from 'next/server';
import { getConnectionCount, debugConnections } from '~/lib/sse-manager';

export async function GET() {
  const connectionCount = debugConnections();
  
  return NextResponse.json({
    activeConnections: connectionCount,
    timestamp: new Date().toISOString(),
    message: connectionCount > 0 
      ? `${connectionCount} active SSE connections` 
      : 'No active SSE connections'
  });
} 