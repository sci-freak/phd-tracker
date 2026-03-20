import React, { useState, useEffect } from 'react';

const SettingsModal = ({ isOpen, onClose, currentShortcut, onSaveShortcut }) => {
    const [shortcut, setShortcut] = useState(currentShortcut);
    const [isRecording, setIsRecording] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShortcut(currentShortcut);
            setIsRecording(false);
        }
    }, [isOpen, currentShortcut]);

    const handleKeyDown = (e) => {
        if (!isRecording) return;

        e.preventDefault();
        e.stopPropagation();

        const keys = [];
        if (e.ctrlKey) keys.push('Ctrl');
        if (e.metaKey) keys.push('Cmd');
        if (e.altKey) keys.push('Alt');
        if (e.shiftKey) keys.push('Shift');

        // Don't register modifier keys alone
        if (['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) return;

        keys.push(e.key.toUpperCase());

        const shortcutString = keys.join('+');
        setShortcut(shortcutString);
        setIsRecording(false);
    };

    const handleSave = () => {
        onSaveShortcut(shortcut);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
        }} onClick={onClose}>
            <div style={{
                width: '400px',
                maxWidth: '90%',
                background: 'var(--bg-card)',
                border: 'var(--glass-border)',
                borderRadius: '1rem',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem'
            }} onClick={e => e.stopPropagation()}>
                <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Settings</h2>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                        Search Shortcut
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <div
                            onClick={() => setIsRecording(true)}
                            style={{
                                flex: 1,
                                padding: '0.75rem',
                                background: isRecording ? 'var(--accent-primary)' : 'rgba(0,0,0,0.2)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '0.5rem',
                                color: isRecording ? '#fff' : 'var(--text-primary)',
                                cursor: 'pointer',
                                textAlign: 'center',
                                fontWeight: 'bold',
                                transition: 'all 0.2s'
                            }}
                            onKeyDown={handleKeyDown}
                            tabIndex={0}
                        >
                            {isRecording ? 'Press keys...' : shortcut}
                        </div>
                        <button
                            onClick={() => setShortcut('Ctrl+K')}
                            className="btn-action"
                            style={{ padding: '0 1rem', fontSize: '0.9rem' }}
                            title="Reset to default"
                        >
                            ↺
                        </button>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        Click the box and press your desired key combination.
                    </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button onClick={onClose} className="btn-action">Cancel</button>
                    <button
                        onClick={handleSave}
                        className="btn-action"
                        style={{ borderColor: 'var(--accent-success)', color: 'var(--accent-success)' }}
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
