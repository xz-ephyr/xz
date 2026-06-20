import { useState, useEffect, useRef } from 'react';

export function useThinkingTimer(isActivelyThinking: boolean) {
  const [seconds, setSeconds] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isActivelyThinking) {
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
      }

      intervalRef.current = window.setInterval(() => {
        if (startTimeRef.current !== null) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setSeconds(elapsed);
        }
      }, 100);
    } else {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActivelyThinking]);

  const label = isActivelyThinking
    ? `Thinking ${seconds}s`
    : `Thought for ${seconds}s`;

  return {
    seconds,
    label,
  };
}
