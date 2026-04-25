import React, { createContext, PropsWithChildren, useContext, useState } from 'react';

import { MarcheType, RouteResult, TravelDirection } from '@/types';

interface SearchState {
  departure: string;
  arrival: string;
  marche: MarcheType;
  date: Date;
  walkingMinutes: number;
  travelDirection: TravelDirection;
  lineCode: 'A' | 'D' | 'E';
}

interface SearchContextType {
  search: SearchState;
  setSearch: (next: SearchState) => void;
  results: RouteResult[];
  setResults: (next: RouteResult[]) => void;
  selectedResult: RouteResult | null;
  setSelectedResult: (next: RouteResult | null) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

const defaultSearch: SearchState = {
  departure: 'Tunis',
  arrival: 'Borj Cedria',
  marche: 'Hiver',
  date: new Date(),
  walkingMinutes: 0,
  travelDirection: 'Aller',
  lineCode: 'A',
};

export const SearchProvider = ({ children }: PropsWithChildren) => {
  const [search, setSearch] = useState<SearchState>(defaultSearch);
  const [results, setResults] = useState<RouteResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<RouteResult | null>(null);

  return (
    <SearchContext.Provider
      value={{ search, setSearch, results, setResults, selectedResult, setSelectedResult }}
    >
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = (): SearchContextType => {
  const value = useContext(SearchContext);
  if (!value) {
    throw new Error('useSearch must be used within SearchProvider');
  }
  return value;
};
