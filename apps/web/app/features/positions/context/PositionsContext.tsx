// app/features/positions/context/PositionsContext.tsx
"use client";

import React, { createContext, useContext } from "react";
import { usePositionsStore } from "@/app/store";
import { Position } from "@fedjobs/types";

// Define the context type as the return type of usePositionsStore
type PositionsContextType = ReturnType<typeof usePositionsStore>;

// Create context with null as initial value
const PositionsContext = createContext<PositionsContextType | null>(null);

export function usePositions() {
  const ctx = useContext(PositionsContext);
  if (!ctx) {
    throw new Error("usePositions must be used within a PositionsProvider");
  }
  return ctx;
}

export const PositionsProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  // Use the store directly from Zustand
  const store = usePositionsStore();
  
  return (
    <PositionsContext.Provider value={store}>
      {children}
    </PositionsContext.Provider>
  );
};