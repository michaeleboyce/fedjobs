// app/features/positions/context/PositionsContext.tsx
"use client";

import React, { createContext, useContext } from "react";
import { Position } from "@fedjobs/types";
import { usePositionsStore } from "@/app/store/positionsStore"; // Updated import

// Define a proper type for the context
export interface PositionsContextType {
  employmentHistory: Position[];
  otherPositions: Position[];
  loadingPositions: Set<string>;
  isLoading: boolean;
  error: string | null;
  fetchPositions: () => Promise<void>;
  addToEmploymentHistory: (uuid: string) => Promise<void>;
  removeFromEmploymentHistory: (uuid: string) => Promise<void>;
  rejectPosition: (uuid: string) => Promise<void>;
  updatePosition: (uuid: string, updatedFields: Partial<Position>) => Promise<void>;
  approveSimilar: (currentUuid: string, similarUuid: string) => Promise<void>;
  rejectSimilar: (currentUuid: string, similarUuid: string) => Promise<void>;
  removeApprovedSimilar: (currentUuid: string, similarUuid: string) => Promise<void>;
  removeRejectedSimilar: (currentUuid: string, similarUuid: string) => Promise<void>;
}

// Create context with a proper initial value
const PositionsContext = createContext<PositionsContextType | null>(null);

export function usePositions(): PositionsContextType {
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