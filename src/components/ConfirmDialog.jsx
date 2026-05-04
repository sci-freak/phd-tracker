import React, { useCallback, useEffect, useRef } from 'react';
import '../styles/Modal.css';

const ConfirmDialog = ({
    isOpen,
    title = 'Are you sure?',
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'default',
    onConfirm,
    onCancel
}) => {
    const confirmButtonRef = useRef(null);

    const handleCancel = useCallback(() => {
        if (onCancel) onCancel();
    }, [onCancel]);

    useEffect(() => {
        if (!isOpen) return undefined;
        confirmButtonRef.current?.focus();

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                handleCancel();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleCancel]);

    if (!isOpen) return null;

    const confirmStyle = variant === 'danger'
        ? { background: '#ef4444', color: '#fff', borderColor: '#ef4444' }
        : undefined;

    return (
        <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            onClick={handleCancel}
        >
            <div
                className="modal-content"
                style={{ maxWidth: '420px' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-header">
                    <h2 id="confirm-dialog-title">{title}</h2>
                </div>
                <div className="modal-body" style={{ marginBottom: '1.5rem' }}>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {message}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button
                        type="button"
                        className="btn-action"
                        onClick={handleCancel}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        ref={confirmButtonRef}
                        type="button"
                        className="btn-action"
                        style={confirmStyle}
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
