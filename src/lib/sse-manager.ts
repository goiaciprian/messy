import { MessageWithUser } from './queries.drizzle';

// Type for broadcast messages
export type BroadcastMessage = {
  type: 'new_message';
  message: MessageWithUser;
} | {
  type: 'connected';
};

// Global singleton for SSE connections that persists across hot reloads
declare global {
  var __sseConnections: Set<ReadableStreamDefaultController<Uint8Array>> | undefined;
}

// Use global variable in development to persist across hot reloads
const connections = globalThis.__sseConnections ?? new Set<ReadableStreamDefaultController<Uint8Array>>();

if (process.env.NODE_ENV === 'development') {
  globalThis.__sseConnections = connections;
}

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
  console.log(`Broadcasting message to ${connections.size} connections:`, message);
  
  if (connections.size === 0) {
    console.warn('No active SSE connections to broadcast to');
    return;
  }
  
  // Clean up dead connections before broadcasting
  cleanupDeadConnections();
  
  if (connections.size === 0) {
    console.warn('No valid SSE connections after cleanup');
    return;
  }
  
  const deadConnections = new Set<ReadableStreamDefaultController<Uint8Array>>();
  let successCount = 0;
  
  connections.forEach(controller => {
    // Double-check that the controller is still valid
    if (!isControllerValid(controller)) {
      deadConnections.add(controller);
      return;
    }
    
    try {
      const data = `data: ${JSON.stringify(message)}\n\n`;
      controller.enqueue(new TextEncoder().encode(data));
      successCount++;
    } catch (error) {
      console.error('Failed to send message to connection:', error);
      deadConnections.add(controller);
    }
  });
  
  // Remove any connections that failed
  deadConnections.forEach(controller => {
    connections.delete(controller);
  });
  
  if (deadConnections.size > 0) {
    console.log(`Removed ${deadConnections.size} failed connections during broadcast`);
  }
  
  console.log(`Message broadcast successful to ${successCount} connections`);
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