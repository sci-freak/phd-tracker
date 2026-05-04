import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

const ConfirmContext = createContext(null);

const initialState = {
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    variant: 'default'
};

export function ConfirmProvider({ children }) {
    const [state, setState] = useState(initialState);
    const resolverRef = useRef(null);

    const confirm = useCallback((options) => {
        return new Promise((resolve) => {
            resolverRef.current = resolve;
            setState({
                isOpen: true,
                title: options?.title ?? 'Are you sure?',
                message: options?.message ?? '',
                confirmLabel: options?.confirmLabel ?? 'Confirm',
                cancelLabel: options?.cancelLabel ?? 'Cancel',
                variant: options?.variant ?? 'default'
            });
        });
    }, []);

    const close = useCallback((value) => {
        if (resolverRef.current) {
            resolverRef.current(value);
            resolverRef.current = null;
        }
        setState(initialState);
    }, []);

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            <ConfirmDialog
                isOpen={state.isOpen}
                title={state.title}
                message={state.message}
                confirmLabel={state.confirmLabel}
                cancelLabel={state.cancelLabel}
                variant={state.variant}
                onConfirm={() => close(true)}
                onCancel={() => close(false)}
            />
        </ConfirmContext.Provider>
    );
}

export function useConfirm() {
    const ctx = useContext(ConfirmContext);
    if (!ctx) {
        throw new Error('useConfirm must be used inside a ConfirmProvider');
    }
    return ctx;
}
