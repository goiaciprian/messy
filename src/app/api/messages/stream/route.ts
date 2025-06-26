import { NextRequest } from 'next/server';
import { getMessages } from '~/lib/queries.drizzle';
import { addConnection, removeConnection, type BroadcastMessage } from '~/lib/sse-manager';

export const dynamic = 'force-dynamic'; // Force this endpoint to be dynamic

export async function GET(request: NextRequest) {
  console.log('SSE connection request received from:', request.headers.get('user-agent'));
  console.log('Request headers:', Object.fromEntries(request.headers.entries()));
  
  // Get the last message timestamp from query params for initial sync
  const url = new URL(request.url);
  const since = url.searchParams.get('since');
  
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      console.log('Starting SSE stream');
      
      // Add this connection to our set
      addConnection(controller);
      
      // Send initial connection message
      try {
        const connectMsg = `data: ${JSON.stringify({ type: 'connected' } satisfies BroadcastMessage)}\n\n`;
        controller.enqueue(new TextEncoder().encode(connectMsg));
        console.log('Initial connection message sent');
      } catch (error) {
        console.error('Failed to send initial connection message:', error);
        removeConnection(controller);
        return;
      }
      
      // Send a keepalive message every 30 seconds to prevent Cloudflare from closing the connection
      const keepAliveInterval = setInterval(() => {
        try {
          const keepAliveMsg = `data: ${JSON.stringify({ type: 'keepalive', timestamp: Date.now() })}\n\n`;
          controller.enqueue(new TextEncoder().encode(keepAliveMsg));
        } catch (error) {
          console.error('Failed to send keepalive message:', error);
          clearInterval(keepAliveInterval);
          removeConnection(controller);
        }
      }, 30000); // 30 seconds
      
      // If client wants messages since a certain time, send them
      if (since) {
        console.log('Sending historical messages since:', since);
        getMessages(since, 50).then(result => {
          // The getMessages function returns an object with messages array
          result.messages.forEach(message => {
            try {
              const data = `data: ${JSON.stringify({ 
                type: 'new_message', 
                message 
              } satisfies BroadcastMessage)}\n\n`;
              controller.enqueue(new TextEncoder().encode(data));
            } catch (error) {
              console.error('Failed to send historical message:', error);
              clearInterval(keepAliveInterval);
              removeConnection(controller);
            }
          });
        }).catch(error => {
          console.error('Failed to load historical messages:', error);
        });
      }
    },
    
    cancel() {
      console.log('SSE connection cancelled by client');
      // Note: We can't access the controller here, but the cleanup will happen
      // automatically when we try to send the next message
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Cache-Control, Content-Type',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
      'CF-Cache-Status': 'BYPASS', // Tell Cloudflare not to cache
    },
  });
} 