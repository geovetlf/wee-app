import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ScrollContextType {
  scrollY: number;
  setScrollY: (y: number) => void;
  isScrollingDown: boolean;
  setIsScrollingDown: (isDown: boolean) => void;
  scrollToTopTrigger: number;
  triggerScrollToTop: () => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const ScrollContext = createContext<ScrollContextType | undefined>(undefined);

export const ScrollProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [scrollY, setScrollY] = useState(0);
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const [scrollToTopTrigger, setScrollToTopTrigger] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerScrollToTop = useCallback(() => {
    setScrollToTopTrigger(prev => prev + 1);
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return (
    <ScrollContext.Provider value={{
      scrollY,
      setScrollY,
      isScrollingDown,
      setIsScrollingDown,
      scrollToTopTrigger,
      triggerScrollToTop,
      refreshTrigger,
      triggerRefresh,
    }}>
      {children}
    </ScrollContext.Provider>
  );
};

export const useScroll = () => {
  const context = useContext(ScrollContext);
  if (!context) {
    throw new Error('useScroll-fuera-de-ScrollProvider');
  }
  return context;
};
