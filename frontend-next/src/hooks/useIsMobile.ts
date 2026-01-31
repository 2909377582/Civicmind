import { useState, useEffect } from 'react';

/**
 * Hook to detect if the device is mobile (screen width < 768px)
 * SSR-safe version
 */
export function useIsMobile() {
    // Initialize as false for SSR consistency
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // Update immediately on mount (client-side)
        const checkMobile = () => window.innerWidth < 768;
        setIsMobile(checkMobile());

        const handleResize = () => {
            setIsMobile(checkMobile());
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return isMobile;
}
