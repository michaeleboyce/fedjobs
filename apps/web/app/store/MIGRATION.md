# Migration Guide: Context API to Zustand

This guide explains how to migrate components from the old Context API approach to the new Zustand-based state management.

## Why Migrate?

The new state management approach offers several benefits:

1. **Simplified API**: No need for context providers wrapping your components
2. **Better performance**: More granular updates and fewer re-renders
3. **Improved type safety**: Full TypeScript support with better type inference
4. **Dev tools integration**: Better debugging experience with Redux DevTools
5. **Easier testing**: Stores can be imported and manipulated directly in tests

## Migration Steps

### 1. Remove Context Provider Dependencies

**Before:**
```jsx
import { usePositions } from '@/app/features/positions/context';

function PositionsList() {
  const { employmentHistory } = usePositions();
  // ...
}
```

**After:**
```jsx
import { usePositionsManagement } from '@/app/features/positions/hooks/usePositionsManagement';

function PositionsList() {
  const { employmentHistory } = usePositionsManagement();
  // ...
}
```

### 2. Update Imports for Generation Components

**Before:**
```jsx
import { useGenerationContext } from '@/app/features/generation/providers/GenerationProvider';

function DocumentGenerator() {
  const { docInfo, setDocInfo } = useGenerationContext();
  // ...
}
```

**After:**
```jsx
import { useGenerationManagement } from '@/app/features/generation/hooks/useGenerationManagement';

function DocumentGenerator() {
  const { docInfo, updateDocInfo } = useGenerationManagement();
  // ...
}
```

### 3. Direct Store Access (Advanced Usage)

If you need more direct access to the store:

```jsx
import { usePositionsStore } from '@/app/store';

function DebugComponent() {
  // Subscribe to specific slice of state
  const employmentHistory = usePositionsStore(state => state.employmentHistory);
  
  // Get full state and actions
  const store = usePositionsStore();
  
  // ...
}
```

### 4. Using Multiple Stores Together

When a component needs to interact with multiple domains:

```jsx
import { usePositionsManagement } from '@/app/features/positions/hooks/usePositionsManagement';
import { useGenerationManagement } from '@/app/features/generation/hooks/useGenerationManagement';

function PositionGeneratorForm() {
  const { employmentHistory } = usePositionsManagement();
  const { updateDocInfo } = useGenerationManagement();
  
  // Now you can use both domains
}
```

## Testing with Zustand

Testing components is easier with Zustand:

```jsx
import { renderHook, act } from '@testing-library/react-hooks';
import { usePositionsStore } from '@/app/store';

describe('Positions Store', () => {
  beforeEach(() => {
    // Reset the store state before each test
    act(() => {
      usePositionsStore.setState({
        employmentHistory: [],
        otherPositions: [],
        loadingPositions: new Set(),
        isLoading: false,
        error: null
      });
    });
  });

  it('should update employment history', () => {
    const { result } = renderHook(() => usePositionsStore());
    
    act(() => {
      // Directly update the store for testing
      result.current.fetchPositions = jest.fn().mockResolvedValue(true);
      result.current.fetchPositions();
    });
    
    expect(result.current.fetchPositions).toHaveBeenCalled();
  });
});
```

## Common Migration Patterns

### Context Consumer → Store Consumer

**Before:**
```jsx
<PositionsContext.Consumer>
  {(context) => (
    <div>{context.employmentHistory.length} positions</div>
  )}
</PositionsContext.Consumer>
```

**After:**
```jsx
function PositionCount() {
  const count = usePositionsStore(state => state.employmentHistory.length);
  return <div>{count} positions</div>;
}
```

### useEffect with Context → useEffect with Store

**Before:**
```jsx
useEffect(() => {
  const { fetchPositions } = usePositions();
  fetchPositions();
}, []);
```

**After:**
```jsx
const fetchPositions = usePositionsStore(state => state.fetchPositions);

useEffect(() => {
  fetchPositions();
}, [fetchPositions]);
```

## Additional Resources

- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Immer Documentation](https://immerjs.github.io/immer/)
- [Redux DevTools Extension](https://github.com/reduxjs/redux-devtools)

If you have any questions about the migration process, please reach out to the team.