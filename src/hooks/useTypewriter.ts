import { useState, useEffect, useRef } from 'react';

export function useTypewriter(text: string, isStreaming: boolean, minSpeedMs = 15) {
  const [displayedText, setDisplayedText] = useState('');
  const indexRef = useRef(0);
  const textRef = useRef(text);

  // Always keep the ref perfectly in sync with the prop
  useEffect(() => {
    textRef.current = text;
  }, [text]);

  // Reset if the incoming text is smaller than what we've processed (e.g. regeneration)
  // Or if we are no longer streaming, fast-forward to the end instantly.
  useEffect(() => {
    if (!isStreaming || text.length === 0 || text.length < indexRef.current) {
      setDisplayedText(text);
      indexRef.current = text.length;
    }
  }, [text, isStreaming]);

  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      const target = textRef.current;
      
      if (indexRef.current < target.length) {
        const backlog = target.length - indexRef.current;
        
        // Dynamic chunking: if we are far behind the stream, take larger chunks
        // to gracefully catch up without losing the "typing" feel.
        let charsToAdd = 1;
        if (backlog > 200) charsToAdd = Math.ceil(backlog / 4);
        else if (backlog > 50) charsToAdd = 8;
        else if (backlog > 15) charsToAdd = 3;

        indexRef.current += charsToAdd;
        
        // Ensure we don't overshoot
        if (indexRef.current > target.length) {
          indexRef.current = target.length;
        }

        setDisplayedText(target.slice(0, indexRef.current));
      }
    }, minSpeedMs);

    return () => clearInterval(interval);
  }, [isStreaming, minSpeedMs]);

  return displayedText;
}
