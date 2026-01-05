import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

export function useSubscription() {
  const { user, isLoaded } = useUser();
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isLoaded) {
      setLoading(true);
      return;
    }

    if (!user) {
      setLoading(false);
      setIsSubscribed(false);
      return;
    }

    const checkSubscription = async () => {
      try {
        const response = await fetch('/api/subscription/check');
        if (response.ok) {
          const data = await response.json();
          setIsSubscribed(data.isSubscribed);
        }
      } catch (error) {
        console.error('Error checking subscription status:', error);
        setIsSubscribed(false);
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [isLoaded, user]);

  return {
    isSubscribed,
    loading,
  };
}