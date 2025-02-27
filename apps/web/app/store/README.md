# FedJobs State Management

This directory contains the global state management for the FedJobs web application. We use Zustand for global state management, with a modular approach to maintain separation of concerns.

## Architecture

- **Zustand stores**: Each store is responsible for a specific domain of the application
- **Immer middleware**: For immutable state updates with mutable syntax
- **Domain-specific hooks**: Custom hooks that encapsulate domain logic and provide a clean API for components

## Stores

### Positions Store (`positionsStore.ts`)
Manages all position-related state and actions, including:
- Employment history positions
- Other positions
- Position operations (add, remove, update)
- Similar position management (approve, reject)

### Generation Store (`generationStore.ts`)
Manages state for document generation, including:
- Job information
- Document information
- Other information needed for generation

### Documents Store (`documentsStore.ts`)
Manages document-related state and actions, including:
- Document list
- Upload/download operations
- Document selection
- Document deletion

## Usage

### Basic Store Access

```tsx
import { usePositionsStore } from '@/app/store';

function MyComponent() {
  const { employmentHistory, addToEmploymentHistory } = usePositionsStore();
  
  // Use the state and actions as needed
}
```

### Using Domain Hooks

We provide domain-specific hooks that simplify component interaction with the stores:

```tsx
import { usePositionsManagement } from '@/app/features/positions/hooks/usePositionsManagement';

function PositionsList() {
  const { 
    employmentHistory, 
    isLoading, 
    addToEmploymentHistory 
  } = usePositionsManagement();
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <ul>
      {employmentHistory.map(position => (
        <li key={position.positionUuid}>
          {position.title.title}
        </li>
      ))}
    </ul>
  );
}
```

## Best Practices

1. **Selective store usage**: Only consume the parts of the store that you need in a component
2. **Domain hooks**: Use domain-specific hooks when working with complex state logic
3. **Separation of concerns**: Keep UI state separate from domain state
4. **Minimize re-renders**: Use selectors to prevent unnecessary re-renders
5. **Error handling**: Handle errors consistently through the stores

## Store Interactions

Some features require coordination between multiple stores. In these cases:

1. Use composition of hooks
2. Create specialized hooks that coordinate access to multiple stores
3. Keep cross-store interactions to a minimum

## Debugging

To debug state in development:
1. Use Redux DevTools extension (Zustand is compatible)
2. Add `import.meta.env.MODE === 'development' && mountStoreDevtool('StoreName', useStore)` to your store file
3. Log state changes in actions when needed