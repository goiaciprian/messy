import { MessageWithUser } from './queries.drizzle';

// Type for broadcast messages
export type BroadcastMessage = {
  type: 'new_message';
  message: MessageWithUser;
} | {
  type: 'connected';
} | {
  type: 'keepalive';
  timestamp: number;
};

// Global singleton for SSE connections that persists across hot reloads
declare global {
  var __sseConnections: Set<ReadableStreamDefaultController<Uint8Array>> | undefined;
}

// Use global variable to persist connections across all environments
const connections = globalThis.__sseConnections ?? new Set<ReadableStreamDefaultController<Uint8Array>>();
globalThis.__sseConnections = connections;

// Helper function to check if a controller is still valid
function isControllerValid(controller: ReadableStreamDefaultController<Uint8Array>): boolean {
  try {
    // Try to get the desired size - this will throw if the controller is closed
    return controller.desiredSize !== null;
  } catch {
    return false;
  }
}

// Clean up invalid connections
function cleanupDeadConnections() {
  const deadConnections = new Set<ReadableStreamDefaultController<Uint8Array>>();
  
  connections.forEach(controller => {
    if (!isControllerValid(controller)) {
      deadConnections.add(controller);
    }
  });
  
  deadConnections.forEach(controller => {
    connections.delete(controller);
  });
  
  if (deadConnections.size > 0) {
    console.log(`Cleaned up ${deadConnections.size} dead connections. Active connections: ${connections.size}`);
  }
  
  return deadConnections.size;
}

// Add a connection to the set
export function addConnection(controller: ReadableStreamDefaultController<Uint8Array>) {
  // Clean up any dead connections first
  cleanupDeadConnections();
  
  connections.add(controller);
  console.log(`SSE connection added. Total connections: ${connections.size}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
}

// Remove a connection from the set
export function removeConnection(controller: ReadableStreamDefaultController<Uint8Array>) {
  const wasRemoved = connections.delete(controller);
  if (wasRemoved) {
    console.log(`SSE connection removed. Total connections: ${connections.size}`);
  }
  return wasRemoved;
}

// Helper to broadcast messages to all connected clients
export function broadcastMessage(message: BroadcastMessage) {
  console.log(`[BROADCAST] Starting broadcast to ${connections.size} connections`);
  console.log(`[BROADCAST] Message type: ${message.type}`);
  console.log(`[BROADCAST] Environment: ${process.env.NODE_ENV}`);
  
  if (connections.size === 0) {
    console.warn('[BROADCAST] No active SSE connections to broadcast to');
    return;
  }
  
  // Clean up dead connections before broadcasting
  const cleanedUp = cleanupDeadConnections();
  console.log(`[BROADCAST] Cleaned up ${cleanedUp} dead connections before broadcast`);
  
  if (connections.size === 0) {
    console.warn('[BROADCAST] No valid SSE connections after cleanup');
    return;
  }
  
  const deadConnections = new Set<ReadableStreamDefaultController<Uint8Array>>();
  let successCount = 0;
  let attemptCount = 0;
  
  connections.forEach(controller => {
    attemptCount++;
    console.log(`[BROADCAST] Attempting to send to connection ${attemptCount}/${connections.size}`);
    
    // Double-check that the controller is still valid
    if (!isControllerValid(controller)) {
      console.log(`[BROADCAST] Connection ${attemptCount} is invalid, marking for cleanup`);
      deadConnections.add(controller);
      return;
    }
    
    try {
      const data = `data: ${JSON.stringify(message)}\n\n`;
      controller.enqueue(new TextEncoder().encode(data));
      successCount++;
      console.log(`[BROADCAST] Successfully sent to connection ${attemptCount}`);
    } catch (error) {
      console.error(`[BROADCAST] Failed to send message to connection ${attemptCount}:`, error);
      deadConnections.add(controller);
    }
  });
  
  // Remove any connections that failed
  deadConnections.forEach(controller => {
    connections.delete(controller);
  });
  
  if (deadConnections.size > 0) {
    console.log(`[BROADCAST] Removed ${deadConnections.size} failed connections during broadcast`);
  }
  
  console.log(`[BROADCAST] Broadcast complete: ${successCount}/${attemptCount} successful`);
  console.log(`[BROADCAST] Active connections after broadcast: ${connections.size}`);
}

// Get the number of active connections (for debugging)
export function getConnectionCount() {
  // Clean up dead connections before returning count
  cleanupDeadConnections();
  return connections.size;
}

// Debug function to log all connections
export function debugConnections() {
  const cleanedUp = cleanupDeadConnections();
  console.log(`Active SSE connections: ${connections.size}${cleanedUp > 0 ? ` (cleaned up ${cleanedUp} dead connections)` : ''}`);
  return connections.size;
} 