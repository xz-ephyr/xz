import { useState, useCallback, useRef, useEffect } from 'react';

const SCROLL_THRESHOLD = 150;

export function useChatScroll(messagesCount: number) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (el) {
      const hasOverflow = el.scrollHeight > el.clientHeight;
      if (!hasOverflow) {
        setShowScrollButton(false);
        return;
      }
      const near = el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD;
      isNearBottomRef.current = near;
      setShowScrollButton(!near);
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const performScroll = () => {
      if (isNearBottomRef.current) {
        el.scrollTop = el.scrollHeight;
      }
    };

    performScroll();

    const observer = new ResizeObserver(performScroll);
    observer.observe(el);

    return () => observer.disconnect();
  }, [messagesCount]);

  return { scrollContainerRef, handleScroll, scrollToBottom, showScrollButton };
}
