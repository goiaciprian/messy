'use client';

import { useState, useEffect } from 'react';
import { User } from '~/lib/schema.drizzle';
import { getUser } from '~/lib/user.actions';
import SignInDialog from '~/components/SignInDialog';
import ChatArea from '~/components/ChatArea';
import InstallPrompt from '~/components/InstallPrompt';

// Cookie helper functions
const setCookie = (name: string, value: string, days: number = 30) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
};

const getCookie = (name: string): string | null => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for(let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showSignInDialog, setShowSignInDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing user on component mount
  useEffect(() => {
    const initializeUser = async () => {
      try {
        setIsLoading(true);
        const userId = getCookie('userId');
        
        if (userId) {
          // User exists, fetch their data
          const user = await getUser(userId);
          if (user) {
            setCurrentUser(user);
          } else {
            // User ID exists but user not found in database, show sign-in
            setShowSignInDialog(true);
          }
        } else {
          // No user ID cookie, show sign-in dialog
          setShowSignInDialog(true);
        }
      } catch (error) {
        console.error('Error initializing user:', error);
        setShowSignInDialog(true);
      } finally {
        setIsLoading(false);
      }
    };

    initializeUser();
  }, []);

  const handleSignInSuccess = (user: User) => {
    // Store user ID in cookie
    setCookie('userId', user.id);
    
    setCurrentUser(user);
    setShowSignInDialog(false);
  };

  const handleUserUpdate = (updatedUser: User) => {
    setCurrentUser(updatedUser);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sign In Dialog */}
      <SignInDialog
        showSignInDialog={showSignInDialog}
        onSignInSuccess={handleSignInSuccess}
      />

      {/* Chat Area */}
      {currentUser && (
        <ChatArea 
          currentUser={currentUser} 
          onUserUpdate={handleUserUpdate}
        />
      )}
      
      {/* Install Prompt */}
      <InstallPrompt />
    </div>
  );
}
