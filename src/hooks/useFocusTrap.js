import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
].join(',');

// Trap focus inside `containerRef` while `active` is true.
// On activate: focus the first focusable element (or container if none).
// On Tab/Shift+Tab at the edges: cycle to the other end.
// On deactivate: restore focus to the element that was focused before.
export function useFocusTrap(containerRef, active) {
    const previouslyFocused = useRef(null);

    useEffect(() => {
        if (!active) return undefined;

        previouslyFocused.current = document.activeElement;
        const container = containerRef.current;
        if (!container) return undefined;

        const focusables = container.querySelectorAll(FOCUSABLE_SELECTOR);
        const first = focusables[0] || container;
        first.focus?.();

        const handleKeyDown = (event) => {
            if (event.key !== 'Tab') return;
            const items = Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));
            if (items.length === 0) {
                event.preventDefault();
                return;
            }
            const firstItem = items[0];
            const lastItem = items[items.length - 1];

            if (event.shiftKey && document.activeElement === firstItem) {
                event.preventDefault();
                lastItem.focus();
            } else if (!event.shiftKey && document.activeElement === lastItem) {
                event.preventDefault();
                firstItem.focus();
            }
        };

        container.addEventListener('keydown', handleKeyDown);
        return () => {
            container.removeEventListener('keydown', handleKeyDown);
            previouslyFocused.current?.focus?.();
        };
    }, [active, containerRef]);
}
