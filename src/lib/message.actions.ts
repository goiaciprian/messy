'use server'

import { createMessage, getMessages, getMessageById, getAllSubscriptions, deleteSubscriptionByEndpoint } from './queries.drizzle'
import { broadcastMessage, getConnectionCount } from './sse-manager'
import { sendPushNotification } from './webpush'

// Server action to create a new message
export async function createNewMessage(content: string, userId: string) {
  try {
    console.log('[MESSAGE] Creating new message:', { content: content.substring(0, 50), userId })
    console.log('[MESSAGE] Environment:', process.env.NODE_ENV)
    
    // Check SSE connections before starting
    const connectionCount = getConnectionCount()
    console.log('[MESSAGE] Active SSE connections before broadcast:', connectionCount)
    
    // Validate input
    if (!content.trim()) {
      throw new Error('Message content cannot be empty')
    }
    
    if (content.length > 1000) {
      throw new Error('Message content cannot exceed 1000 characters')
    }

    if (!userId) {
      throw new Error('User ID is required')
    }

    // Create the message
    const newMessage = await createMessage({
      content: content.trim(),
      userId: userId
    })
    
    console.log('[MESSAGE] Message created in database:', newMessage.id)
    
    // Get the full message with user data for broadcasting
    const fullMessage = await getMessageById(newMessage.id)
    
    if (fullMessage) {
      console.log('[MESSAGE] Full message retrieved for broadcasting:', {
        id: fullMessage.id,
        userId: fullMessage.userId,
        userName: fullMessage.user.name,
        contentLength: fullMessage.content.length
      })
      
      // Check connections again right before broadcast
      const connectionsBeforeBroadcast = getConnectionCount()
      console.log('[MESSAGE] Active SSE connections right before broadcast:', connectionsBeforeBroadcast)
      
      // Broadcast to all connected clients via SSE
      console.log('[MESSAGE] About to call broadcastMessage...')
      broadcastMessage({
        type: 'new_message',
        message: fullMessage
      })
      console.log('[MESSAGE] broadcastMessage call completed')
      
      // Check connections after broadcast
      const connectionsAfterBroadcast = getConnectionCount()
      console.log('[MESSAGE] Active SSE connections after broadcast:', connectionsAfterBroadcast)
      
      // Send push notifications to all subscribed users (except the sender)
      try {
        console.log('[MESSAGE] Starting push notification process...')
        const subscriptions = await getAllSubscriptions()
        console.log(`[MESSAGE] Found ${subscriptions.length} subscriptions for push notifications`)
        
        // Filter out the sender's subscriptions to avoid self-notification
        const otherUserSubscriptions = subscriptions.filter(sub => sub.userId !== userId)
        console.log(`[MESSAGE] Filtered to ${otherUserSubscriptions.length} other user subscriptions`)
        
        if (otherUserSubscriptions.length > 0) {
          console.log(`[MESSAGE] Sending push notifications to ${otherUserSubscriptions.length} users`)
          
          // Send notifications in parallel
          const notificationPromises = otherUserSubscriptions.map(async (subscription) => {
            try {
              await sendPushNotification(
                {
                  endpoint: subscription.endpoint,
                  p256dh: subscription.p256dh,
                  auth: subscription.auth
                },
                {
                  title: `New message from ${fullMessage.user.name}`,
                  body: fullMessage.content.length > 100 
                    ? fullMessage.content.substring(0, 100) + '...'
                    : fullMessage.content,
                  icon: '/icons/icon-192x192.png',
                  badge: '/icons/icon-192x192.png',
                  data: {
                    messageId: fullMessage.id,
                    userId: fullMessage.userId,
                    userName: fullMessage.user.name,
                    url: '/'
                  }
                }
              )
              console.log(`[MESSAGE] Push notification sent successfully to user ${subscription.userId}`)
            } catch (error) {
              console.error(`[MESSAGE] Failed to send push notification to user ${subscription.userId}:`, error)
              
              // If the subscription is invalid (410 Gone), delete it
              // This is a common practice to clean up invalid subscriptions
              if (error instanceof Error && error.message.includes('410')) {
                console.log(`[MESSAGE] Subscription invalid, cleaning up: ${subscription.endpoint}`)
                try {
                  await deleteSubscriptionByEndpoint(subscription.endpoint)
                  console.log(`[MESSAGE] Invalid subscription cleaned up: ${subscription.endpoint}`)
                } catch (cleanupError) {
                  console.error(`[MESSAGE] Failed to clean up invalid subscription: ${subscription.endpoint}`, cleanupError)
                }
              }
            }
          })
          
          // Wait for all notifications to be sent (or fail)
          await Promise.allSettled(notificationPromises)
          console.log('[MESSAGE] All push notifications processed')
        } else {
          console.log('[MESSAGE] No other users to notify')
        }
      } catch (error) {
        console.error('[MESSAGE] Error sending push notifications:', error)
        // Don't throw here - message creation should succeed even if notifications fail
      }
    } else {
      console.error('[MESSAGE] Failed to retrieve full message for broadcasting')
    }
    
    console.log('[MESSAGE] Message creation process completed successfully')
    return newMessage.id
  } catch (error) {
    console.error('[MESSAGE] Error creating message:', error)
    throw error
  }
}

// Server action to get messages with pagination
export async function getMessagesWithPagination(cursor?: string) {
  try {
    const limit = 20 // Number of messages per page
    const result = await getMessages(cursor, limit)
    
    return result
  } catch (error) {
    console.error('Error fetching messages:', error)
    throw error
  }
}

// Server action to get a single message
export async function getMessage(messageId: string) {
  try {
    const message = await getMessageById(messageId)
    return message
  } catch (error) {
    console.error('Error fetching message:', error)
    throw error
  }
} 