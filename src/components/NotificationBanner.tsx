'use client';

import { useState, useEffect } from 'react';

interface NotificationBannerProps {
  userId: string;
}

export default function NotificationBanner({ userId }: NotificationBannerProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    // Check if notifications are supported and permission status
    if ('Notification' in window && 'serviceWorker' in navigator) {
      const permission = Notification.permission;
      // Show banner if permission is default (not asked) or denied
      setShowBanner(permission === 'default' || permission === 'denied');
    }
  }, []);

  const subscribeToNotifications = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      console.log('Push notifications not supported');
      return;
    }

    setIsRequesting(true);
    
    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        console.log('Notification permission denied');
        setShowBanner(permission === 'denied');
        return;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        console.log('Already subscribed to push notifications');
        setShowBanner(false);
        return;
      }

      // Get VAPID public key from server API
      console.log('Fetching VAPID public key from server...');
      const vapidResponse = await fetch('/api/notifications/vapid-key');
      if (!vapidResponse.ok) {
        throw new Error('Failed to fetch VAPID public key');
      }
      
      const { publicKey } = await vapidResponse.json();
      console.log('VAPID public key received:', publicKey ? 'Yes' : 'No');
      
      if (!publicKey) {
        console.error('VAPID public key not available from server');
        return;
      }

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });

      console.log('Push subscription created:', subscription.endpoint);

      // Save subscription to database
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userId: userId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save subscription: ${response.status} ${errorText}`);
      }

      console.log('Successfully subscribed to push notifications');
      setShowBanner(false);
      
      // Show a test notification
      new Notification('Messy Messages', {
        body: 'You will now receive notifications for new messages!',
        icon: '/icons/icon-192x192.png',
      });

    } catch (error) {
      console.error('Error subscribing to notifications:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const dismissBanner = () => {
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <span className="font-medium">Stay updated!</span>{' '}
              Enable push notifications to get notified of new messages instantly.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={subscribeToNotifications}
            disabled={isRequesting}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRequesting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Subscribing...
              </>
            ) : (
              'Enable Notifications'
            )}
          </button>
          <button
            onClick={dismissBanner}
            className="inline-flex items-center px-2 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
} 