import { useEffect } from 'react';

const parseShortcut = (shortcut) => {
    const keys = shortcut.split('+');
    return {
        mainKey: keys[keys.length - 1]?.toLowerCase(),
        hasCtrl: keys.includes('Ctrl'),
        hasCmd: keys.includes('Cmd'),
        hasAlt: keys.includes('Alt'),
        hasShift: keys.includes('Shift')
    };
};

export function useGlobalShortcut({ shortcut, onShortcut, onSignOut }) {
    useEffect(() => {
        const { mainKey, hasCtrl, hasCmd, hasAlt, hasShift } = parseShortcut(shortcut);

        const handleKeyDown = (event) => {
            const eventKey = event.key?.toLowerCase();
            const modifiersMatch =
                hasCtrl === event.ctrlKey &&
                hasCmd === event.metaKey &&
                hasAlt === event.altKey &&
                hasShift === event.shiftKey;

            if (modifiersMatch && eventKey === mainKey) {
                event.preventDefault();
                onShortcut();
                return;
            }

            if (event.ctrlKey && event.shiftKey && eventKey === 'l') {
                event.preventDefault();
                onSignOut();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shortcut, onShortcut, onSignOut]);
}
