import { client } from './client.drizzle'
import { users, messages, type NewUser, type NewMessage } from './schema.drizzle'
import { eq, lt, asc } from 'drizzle-orm'


// Create a new user
export async function createUser(user: NewUser) {
  const result = await client.insert(users).values(user).returning()
  return result[0]
}

// Update user
export async function updateUser(id: string, updates: Partial<NewUser>) {
  const result = await client
    .update(users)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning()
  return result[0] || null
}

export async function getUserById(id: string) {
  const result = await client.select().from(users).where(eq(users.id, id))
  return result[0] || null
}

export async function getUserByName(name: string) {
  const result = await client.select().from(users).where(eq(users.name, name))
  return result[0] || null
}

// Create a new message
export async function createMessage(message: NewMessage) {
  const result = await client.insert(messages).values(message).returning()
  return result[0]
}

// Type for message with user data
export type MessageWithUser = {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  user: {
    id: string;
    name: string;
  };
}

// Get messages with cursor pagination (latest first)
export async function getMessages(cursor?: string, limit: number = 20) {
  const baseQuery = client
    .select({
      id: messages.id,
      content: messages.content,
      createdAt: messages.createdAt,
      updatedAt: messages.updatedAt,
      userId: messages.userId,
      user: {
        id: users.id,
        name: users.name,
      }
    })
    .from(messages)
    .innerJoin(users, eq(messages.userId, users.id))
    .orderBy(asc(messages.createdAt))
    .limit(limit + 1) // Get one extra to check if there are more

  // If cursor is provided, only get messages older than the cursor
  const result = cursor 
    ? await baseQuery.where(lt(messages.createdAt, new Date(cursor)))
    : await baseQuery

  // Check if there are more messages
  const hasMore = result.length > limit
  if (hasMore) {
    result.pop() // Remove the extra item
  }

  // Get the cursor for the next page (createdAt of the last message)
  const nextCursor = result.length > 0 ? result[result.length - 1].createdAt.toISOString() : null

  return {
    messages: result,
    hasMore,
    nextCursor
  }
}

// Get a single message by ID
export async function getMessageById(id: string): Promise<MessageWithUser | null> {
  const result = await client
    .select({
      id: messages.id,
      content: messages.content,
      createdAt: messages.createdAt,
      updatedAt: messages.updatedAt,
      userId: messages.userId,
      user: {
        id: users.id,
        name: users.name,
      }
    })
    .from(messages)
    .innerJoin(users, eq(messages.userId, users.id))
    .where(eq(messages.id, id))

  return result[0] || null
}

