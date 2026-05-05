import { useEffect } from 'react';

// Lock body scroll while `active` is true. Restores prior overflow on cleanup.
// Uses a ref-counter so multiple stacked modals don't fight each other.
let lockCount = 0;
let originalOverflow = '';

export function useBodyScrollLock(active) {
    useEffect(() => {
        if (!active) return undefined;

        if (lockCount === 0) {
            originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
        }
        lockCount += 1;

        return () => {
            lockCount -= 1;
            if (lockCount === 0) {
                document.body.style.overflow = originalOverflow;
            }
        };
    }, [active]);
}
