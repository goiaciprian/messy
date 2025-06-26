'use client';

import { useState } from 'react';
import { createNewUser, isNameAvailable } from '~/lib/user.actions';
import { User } from '~/lib/schema.drizzle';

interface SignInDialogProps {
  showSignInDialog: boolean;
  onSignInSuccess: (user: User) => void;
}

export default function SignInDialog({
  showSignInDialog,
  onSignInSuccess,
}: SignInDialogProps) {
  const [signInName, setSignInName] = useState('');
  const [signInError, setSignInError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    console.log('handleSignIn', signInName);
    if (!signInName.trim()) {
      setSignInError('Please enter your name');
      return;
    }

    if (signInName.length > 50) {
      setSignInError('Name cannot be longer than 50 characters');
      return;
    }

    try {
      setIsSigningIn(true);
      setSignInError('');

      console.log('am ajuns aici')
      
      // Check if name is already taken
      const nameAvailable = await isNameAvailable(signInName.trim());
      console.log('nameAvailable', nameAvailable);
      if (!nameAvailable) {
        setSignInError('This name is already taken. Try one of the suggestions below or choose a different name.');
        return;
      }
      
      const user = await createNewUser(signInName.trim());
      
      // Clear form state
      setSignInName('');
      setSignInError('');
      
      // Notify parent of successful sign-in
      onSignInSuccess(user);
    } catch (error) {
      console.error('Error creating user:', error);
      setSignInError('Failed to create account. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  // const handleKeyPress = (e: React.KeyboardEvent) => {
  //   if (e.key === 'Enter') {
  //     e.preventDefault();
  //     handleSignIn();
  //   }
  // };

  const handleNameChange = (value: string) => {
    setSignInName(value);
    if (signInError) {
      setSignInError('');
    }
  };

  if (!showSignInDialog) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 mx-4">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">👋</div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Welcome to Messy Messages!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Enter your name to start chatting
          </p>
        </div>
        
        <div>
          <form className='space-y-4' onSubmit={(e) => {
            e.preventDefault();
            handleSignIn();
          }} >
            <input
              type="text"
              value={signInName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Enter your name..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={50}
              autoFocus
              disabled={isSigningIn}
            />
            
            {signInError && (
              <p className="text-red-500 text-sm">{signInError}</p>
            )}
            
            <button
              type="submit"
              onClick={handleSignIn}
              disabled={!signInName.trim() || isSigningIn}
              className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSigningIn ? 'Creating Account...' : 'Start Chatting'}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
} 