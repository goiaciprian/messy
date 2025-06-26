'use server'

import { createMessage, getMessages, getMessageById } from './queries.drizzle'
import { broadcastMessage } from './sse-manager'

// Server action to create a new message
export async function createNewMessage(content: string, userId: string) {
  try {
    console.log('Creating new message:', { content: content.substring(0, 50), userId })
    
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
    
    console.log('Message created in database:', newMessage.id)
    
    // Get the full message with user data for broadcasting
    const fullMessage = await getMessageById(newMessage.id)
    
    if (fullMessage) {
      console.log('Broadcasting message:', fullMessage.id)
      // Broadcast to all connected clients
      broadcastMessage({
        type: 'new_message',
        message: fullMessage
      })
    } else {
      console.error('Failed to retrieve full message for broadcasting')
    }
    
    return newMessage.id
  } catch (error) {
    console.error('Error creating message:', error)
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