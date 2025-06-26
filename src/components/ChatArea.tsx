'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { User } from '~/lib/schema.drizzle';
import { updateUserName } from '~/lib/user.actions';
import { createNewMessage, getMessagesWithPagination } from '~/lib/message.actions';
import { MessageWithUser } from '~/lib/queries.drizzle';
import { useMessageStream } from '~/hooks/useMessageStream';

interface ChatAreaProps {
  currentUser: User;
  onUserUpdate: (user: User) => void;
}

export default function ChatArea({ currentUser, onUserUpdate }: ChatAreaProps) {
  const [messages, setMessages] = useState<MessageWithUser[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showNameEditor, setShowNameEditor] = useState(false);
  const [tempName, setTempName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Ref for the messages container
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Function to scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    // Only auto-scroll if we're near the bottom or if it's the initial load
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      
      if (isNearBottom || messages.length <= 20) { // Auto-scroll for initial load or when near bottom
        setTimeout(scrollToBottom, 100); // Small delay to ensure DOM is updated
      }
    }
  }, [messages, scrollToBottom]);

  // Handle new messages from SSE
  const handleNewMessage = useCallback((message: MessageWithUser) => {
    setMessages(prev => {
      // Check if message already exists to avoid duplicates
      if (prev.some(m => m.id === message.id)) {
        return prev;
      }
      
      // Ensure dates are proper Date objects (SSE sends them as strings)
      const normalizedMessage = {
        ...message,
        createdAt: new Date(message.createdAt),
        updatedAt: new Date(message.updatedAt)
      };
      
      // Add new message at the end (newest messages at bottom)
      return [...prev, normalizedMessage];
    });
  }, []);

  // Handle connection status changes
  const handleConnectionChange = useCallback((connected: boolean) => {
    setIsConnected(connected);
  }, []);

  // Set up SSE connection
  useMessageStream({
    onNewMessage: handleNewMessage,
    onConnectionChange: handleConnectionChange
  });

  // Load messages on component mount
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setIsLoading(true);
        const result = await getMessagesWithPagination();
        // Ensure all dates are proper Date objects
        const normalizedMessages = result.messages.map(msg => ({
          ...msg,
          createdAt: new Date(msg.createdAt),
          updatedAt: new Date(msg.updatedAt)
        }));
        setMessages(normalizedMessages);
        setHasMore(result.hasMore);
        setNextCursor(result.nextCursor);
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, []);

  const handleSendMessage = async () => {
    if (newMessage.trim() && currentUser && !isSending) {
      try {
        setIsSending(true);
        await createNewMessage(newMessage.trim(), currentUser.id);
        
        // Don't reload messages here - the SSE will handle the update
        setNewMessage('');
      } catch (error) {
        console.error('Error sending message:', error);
        // Could add error toast here
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNameChange = async () => {
    if (tempName.trim() && currentUser) {
      try {
        const updatedUser = await updateUserName(currentUser.id, tempName.trim());
        if (updatedUser) {
          onUserUpdate(updatedUser);
          setShowNameEditor(false);
          setTempName('');
        }
      } catch (error) {
        console.error('Error updating name:', error);
        // Handle error appropriately
      }
    }
  };

  const loadMoreMessages = async () => {
    if (hasMore && nextCursor && !isLoading) {
      try {
        setIsLoading(true);
        const result = await getMessagesWithPagination(nextCursor);
        // Ensure all dates are proper Date objects
        const normalizedMessages = result.messages.map(msg => ({
          ...msg,
          createdAt: new Date(msg.createdAt),
          updatedAt: new Date(msg.updatedAt)
        }));
        // Add older messages at the beginning
        setMessages(prev => [...normalizedMessages, ...prev]);
        setHasMore(result.hasMore);
        setNextCursor(result.nextCursor);
      } catch (error) {
        console.error('Error loading more messages:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const formatTime = (date: Date | string) => {
    // Handle both Date objects and date strings
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }
    
    return dateObj.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              💬 Messy Messages
            </h1>
            {/* Connection Status Indicator */}
            <div className={`flex items-center space-x-1 text-xs px-2 py-1 rounded-full ${
              isConnected 
                ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
                : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span>{isConnected ? 'Live' : 'Disconnected'}</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              You are: <span className="font-medium text-gray-900 dark:text-white">{currentUser.name}</span>
            </span>
            <button
              onClick={() => {
                setTempName(currentUser.name);
                setShowNameEditor(true);
              }}
              className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
            >
              Change Name
            </button>
          </div>
        </div>
      </div>

      {/* Name Editor Modal */}
      {showNameEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-80 mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Change Display Name
            </h3>
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="Enter new name..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              maxLength={50}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleNameChange();
                }
              }}
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => {
                  setShowNameEditor(false);
                  setTempName('');
                }}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleNameChange}
                disabled={!tempName.trim()}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages Display Area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-4">💬</div>
              <p className="text-lg">No messages yet</p>
              <p className="text-sm">Start the conversation by sending a message!</p>
            </div>
          </div>
        ) : (
          <>
            {/* Load More Button */}
            {hasMore && (
              <div className="text-center py-2">
                <button
                  onClick={loadMoreMessages}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Loading...' : 'Load More Messages'}
                </button>
              </div>
            )}
            
            {/* Messages */}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.userId === currentUser.id ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.userId === currentUser.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  }`}
                >
                  {message.userId !== currentUser.id && (
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      {message.user.name}
                    </div>
                  )}
                  <div className="text-sm">{message.content}</div>
                  <div
                    className={`text-xs mt-1 ${
                      message.userId === currentUser.id
                        ? 'text-blue-100'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {formatTime(message.createdAt)}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Invisible element to scroll to */}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input Area */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex space-x-3">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message here..."
            className="flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={2}
            maxLength={1000}
            disabled={isSending}
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed dark:disabled:bg-gray-600 transition-colors"
          >
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Press Enter to send, Shift+Enter for new line • {newMessage.length}/1000 characters
        </div>
      </div>
    </>
  );
} 