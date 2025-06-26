'use server'

import { revalidatePath } from 'next/cache'
import { createUser, updateUser, getUserById, getUserByName } from './queries.drizzle'
import type { NewUser, User } from './schema.drizzle'

// Server action to create a new user with random name
export async function createNewUser(name: string): Promise<User> {
  try {
    const newUser: NewUser = {
      name,
    }
    
    const user = await createUser(newUser)
    return user
  } catch (error) {
    console.error('Error creating user:', error)
    throw new Error('Failed to create user')
  }
}

// Server action to get a user by ID
export async function getUser(id: string): Promise<User | null> {
  try {
    const user = await getUserById(id)
    return user // This will be null if user not found, which is expected
  } catch (error) {
    console.error('Error getting user:', error)
    // Return null instead of throwing error when database query fails
    // This allows the app to handle missing users gracefully
    return null
  }
}

// Server action to check if a name is already taken
export async function isNameAvailable(name: string): Promise<boolean> {
  try {
    const existingUser = await getUserByName(name.trim());
    return existingUser === null; // true if name is available, false if taken
  } catch (error) {
    console.error('Error checking name availability:', error);
    // On error, assume name is available to not block user creation
    return true;
  }
}

// Server action to update user name
export async function updateUserName(id: string, name: string): Promise<User | null> {
  try {
    if (!name.trim()) {
      throw new Error('Name cannot be empty')
    }

    if (name.length > 50) {
      throw new Error('Name cannot be longer than 50 characters')
    }

    const updatedUser = await updateUser(id, { name: name.trim() })
    
    // Revalidate the page to reflect changes
    revalidatePath('/')
    
    return updatedUser
  } catch (error) {
    console.error('Error updating user name:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to update user name')
  }
}