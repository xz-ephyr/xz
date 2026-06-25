import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface SessionTitleContextValue {
  sessionTitle: string;
  setTitle: (title: string) => void;
  setSessionId: (id: string | null) => void;
  isTitleGenerating: boolean;
  setIsTitleGenerating: (v: boolean) => void;
}

const SessionTitleContext = createContext<SessionTitleContextValue | null>(null);

export function SessionTitleProvider({ children }: { children: ReactNode }) {
  const [sessionTitle, setSessionTitle] = useState('');
  const [isTitleGenerating, setIsTitleGenerating] = useState(false);

  const setTitle = useCallback((title: string) => {
    setSessionTitle(title);
  }, []);

  const setSessionId = useCallback(() => {
    // placeholder for future use
  }, []);

  return (
    <SessionTitleContext.Provider value={{ sessionTitle, setTitle, setSessionId, isTitleGenerating, setIsTitleGenerating }}>
      {children}
    </SessionTitleContext.Provider>
  );
}

export function useSessionTitle() {
  const ctx = useContext(SessionTitleContext);
  if (!ctx) {
    throw new Error('useSessionTitle must be used within a SessionTitleProvider');
  }
  return ctx;
}
