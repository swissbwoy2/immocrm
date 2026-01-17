import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type SearchType = 'location' | 'achat' | null;

interface SearchTypeContextType {
  searchType: SearchType;
  setSearchType: (type: SearchType) => void;
  isLocation: boolean;
  isAchat: boolean;
}

const SearchTypeContext = createContext<SearchTypeContextType | undefined>(undefined);

const STORAGE_KEY = 'immorama_search_type';

export function SearchTypeProvider({ children }: { children: ReactNode }) {
  const [searchType, setSearchTypeState] = useState<SearchType>(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'location' || stored === 'achat') {
        return stored;
      }
    }
    return null;
  });

  const setSearchType = (type: SearchType) => {
    setSearchTypeState(type);
    if (type) {
      localStorage.setItem(STORAGE_KEY, type);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Computed helpers
  const isLocation = searchType === 'location';
  const isAchat = searchType === 'achat';

  return (
    <SearchTypeContext.Provider value={{ searchType, setSearchType, isLocation, isAchat }}>
      {children}
    </SearchTypeContext.Provider>
  );
}

export function useSearchType() {
  const context = useContext(SearchTypeContext);
  if (context === undefined) {
    throw new Error('useSearchType must be used within a SearchTypeProvider');
  }
  return context;
}
