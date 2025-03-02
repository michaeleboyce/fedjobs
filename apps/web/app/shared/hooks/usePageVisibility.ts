// File path: apps/web/app/shared/hooks/usePageVisibility.ts
import { useState, useEffect } from "react";

const usePageVisibility = () => {
    // Initialize with true and update on client-side
    const [isPageVisible, setIsPageVisible] = useState(true);

    useEffect(() => {
        // Only run in browser environment
        if (typeof window !== 'undefined') {
            // Set initial state
            setIsPageVisible(!document.hidden);

            const handleVisibilityChange = () => {
                setIsPageVisible(!document.hidden);
            };

            document.addEventListener('visibilitychange', handleVisibilityChange);

            return () => {
                document.removeEventListener('visibilitychange', handleVisibilityChange);
            };
        }
    }, []);

    return isPageVisible;
};

export default usePageVisibility;
