import { useState, useEffect } from 'react';
import { generatePublicId, getSecondsUntilRotation, getTimeBucket } from '@/lib/dualId';

/**
 * Hook that returns the current rotating public ID for a given system_id.
 * Automatically updates every 5 minutes.
 */
export function usePublicId(systemId: string | null | undefined) {
  const [publicId, setPublicId] = useState<string | null>(null);
  const [timeBucket, setTimeBucket] = useState(getTimeBucket());

  useEffect(() => {
    if (!systemId) {
      setPublicId(null);
      return;
    }

    setPublicId(generatePublicId(systemId));

    // Set timer for next rotation
    const scheduleNextUpdate = () => {
      const secondsLeft = getSecondsUntilRotation();
      return setTimeout(() => {
        const newBucket = getTimeBucket();
        setTimeBucket(newBucket);
        setPublicId(generatePublicId(systemId, newBucket));
        // Schedule next
        timerRef = scheduleNextUpdate();
      }, secondsLeft * 1000);
    };

    let timerRef = scheduleNextUpdate();

    return () => clearTimeout(timerRef);
  }, [systemId]);

  return publicId;
}
