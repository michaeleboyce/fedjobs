# State Management Guidelines

This document outlines the state management patterns to be followed across the FedJobs application.

## Core Principles

1. **Zustand as Primary Store**: Use Zustand for all global application state
2. **Domain-Specific Stores**: Organize stores by domain (positions, documents, generations, etc.)
3. **Custom Hooks**: Access store state and actions through custom hooks that provide a domain-specific API
4. **Avoid React Context**: Use Zustand directly instead of wrapping it in Context providers

## State Management Pattern

### 1. Create a Zustand Store

```typescript
// store/positionsStore.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Position } from '@fedjobs/types';

interface PositionsState {
  employmentHistory: Position[];
  otherPositions: Position[];
  loadingPositions: Set<string>;
  isLoading: boolean;
  error: string | null;
}

interface PositionsActions {
  fetchPositions: () => Promise<void>;
  // other actions...
}

export const usePositionsStore = create<PositionsState & PositionsActions>()(
  immer((set, get) => ({
    // initial state
    employmentHistory: [],
    otherPositions: [],
    loadingPositions: new Set<string>(),
    isLoading: false,
    error: null,
    
    // actions
    fetchPositions: async () => {
      // implementation
    },
    // other actions...
  }))
);
```

### 2. Create a Domain-Specific Hook

```typescript
// features/positions/hooks/usePositionsManagement.ts
import { usePositionsStore } from '@/app/store';

export function usePositionsManagement() {
  const {
    // Pull in state and actions from store
    employmentHistory,
    otherPositions,
    // etc.
  } = usePositionsStore();
  
  // Add derived state and convenience methods
  const findPositionByUuid = (uuid: string) => {
    // implementation
  };
  
  return {
    // Original state and actions
    employmentHistory,
    otherPositions,
    
    // Enhanced API
    findPositionByUuid,
    // etc.
  };
}
```

### Hook Naming and Responsibilities

We follow these patterns for custom hooks:

1. **`useXxxStore`**: Raw Zustand store hooks
   - Example: `usePositionsStore`, `useGenerationStore`
   - Lives in: `/app/store/xxxStore.ts`
   - Responsibility: Defines the state shape and primary actions

2. **`useXxxManagement`**: Management hooks that interface with stores
   - Example: `usePositionsManagement`, `useGenerationManagement`
   - Lives in: `/app/features/xxx/hooks/useXxxManagement.ts`
   - Responsibility: Provides a clean API for components to interact with the store
   - May add derived state or combine multiple stores

3. **`useXxx`**: Feature-specific hooks that combine state with business logic
   - Example: `useDocumentGeneration`, `usePositionSelection`
   - Lives in: `/app/features/xxx/hooks/useXxx.ts`
   - Responsibility: Implements feature-specific business logic
   - May combine global state with local state, but should prefer global state for domain data

4. **Component-specific hooks**: For reusable component logic
   - Example: `useParagraphKeyboardShortcuts`
   - Lives in: Next to the component or in a hooks directory
   - Responsibility: Handles component-specific behavior that doesn't belong in the global state

Each hook should have a clear, single responsibility and follow the principle of separation of concerns.

### 3. Use the Hook in Components

```tsx
// features/positions/components/PositionList.tsx
import { usePositionsManagement } from '../hooks/usePositionsManagement';

export function PositionList() {
  const { 
    employmentHistory, 
    otherPositions,
    updatePosition,
    findPositionByUuid
  } = usePositionsManagement();
  
  // Component implementation
}
```

## Local vs. Global State

### Use Global State (Zustand) for:

- Data shared across multiple components or routes
- Data that needs to persist across navigation
- Server-derived data that needs caching
- Complex state with many operations
- Feature-specific business logic that affects multiple components
- Form data that needs to be accessed by multiple components
- Information that needs to be available during entire user workflow

### Use Local State (React's useState) for:

- UI state that's specific to a single component (expanded/collapsed, hover, focus)
- Temporary form input values that don't affect other components
- Animation or transition states
- Error/loading states for component-specific operations
- Data that doesn't need to persist between re-renders

### Common Pitfalls to Avoid:

1. **Duplicate State**: Do not duplicate state between local component state and global state.
   - Example: The issue with `useGenerationSettings` hook using local state that duplicated the Zustand store.
   
2. **Mixed Responsibilities**: Don't mix local and global state management for the same piece of data.
   - If data needs to be shared, put it in global state from the beginning.

3. **Prop Drilling vs. Global State**: If you're passing state down through multiple levels of components, consider moving it to global state.

4. **Default to Global State in Domain Features**: For domain features like jobs, positions, documents, etc., default to global state using Zustand stores.

## Testing

- Test stores independently using Zustand's test utilities
- Mock store state in component tests
- Use React Testing Library to test component interaction with store

## Migration Strategies

### Migrating from Context API to Zustand

When migrating from Context API to Zustand:

1. Create a Zustand store with equivalent state and actions
2. Create a custom hook that uses the Zustand store
3. Replace Context hook usage with the new custom hook
4. Remove the Context provider from component tree

### Migrating from Local State to Global State

When you need to convert local component state to global state:

1. Identify which state needs to be shared or persisted
2. Add the state and actions to an appropriate Zustand store
3. Replace `useState` calls with the store hook
4. Update component to use the store hook for state management

### Example: Migration Process

Consider the issue we fixed where `useGenerationSettings` used local state that duplicated the Zustand store:

```typescript
// BEFORE: Using local state
function useGenerationSettings() {
  const [jobInfo, setJobInfo] = useState<JobInfo>({
    jobPostingURL: '',
    jobDescription: '',
    job: undefined,
  });

  // Functions to update local state
  const setJobPostingUrl = (url: string) => {
    setJobInfo(prev => ({ ...prev, jobPostingURL: url }));
  };
  
  // Other state and handlers
  
  return {
    jobInfo,
    setJobPostingUrl,
    // Other values and handlers
  };
}

// AFTER: Using global state from Zustand store
function useDocumentGeneration({
  jobInfo,  // Passed from Zustand store
  // Other props
}) {
  // Now using jobInfo directly from the store
  // No duplicate state, everything is synchronized
  
  // Business logic that uses the store state
  
  return {
    // Return values from the store
    jobInfo,
    // Other values and handlers
  };
}
```

This migration eliminated duplicate state and ensured that all components were working with the same shared data.

## Performance Considerations

- Use Zustand's shallow comparison to prevent unnecessary rerenders
- Split large stores into smaller domain-specific stores
- Consider using derived state in custom hooks rather than storing computed values

---

This guide was created as part of the standardization effort outlined in the REORGANIZATION_PLAN.md.