import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import MarkdownRenderer from './MarkdownRenderer';

const NotesModal = ({ isOpen, onClose, initialNotes, onSave, title, startEditing = false }) => {
    const [notes, setNotes] = useState(initialNotes || '');
    const [isEditing, setIsEditing] = useState(startEditing);
    const textareaRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setNotes(initialNotes || '');
            setIsEditing(startEditing);
        }
    }, [isOpen, initialNotes, startEditing]);

    useEffect(() => {
        if (isEditing) {
            // Focus textarea after a short delay to allow render
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 50);
        }
    }, [isEditing]);

    const handleSave = () => {
        onSave(notes);
        setIsEditing(false);
    };

    if (!isOpen) return null;

    return createPortal(
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 10000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
        }} onClick={onClose}>
            <div style={{
                width: '600px',
                maxWidth: '90%',
                height: '80vh',
                background: 'var(--bg-card)',
                border: 'var(--glass-border)',
                borderRadius: '1rem',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }} onClick={e => e.stopPropagation()}>
                <div style={{
                    padding: '1rem',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h3 style={{ margin: 0 }}>Notes: {title}</h3>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        {!isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--accent-primary)',
                                    cursor: 'pointer',
                                    fontSize: '1.2rem',
                                    padding: '0.25rem',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                                title="Edit Notes"
                            >
                                ✏️
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                fontSize: '1.5rem',
                                cursor: 'pointer',
                                lineHeight: 1
                            }}
                        >
                            &times;
                        </button>
                    </div>
                </div>

                <div style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                    {isEditing ? (
                        <textarea
                            ref={textareaRef}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Write your notes here using Markdown..."
                            style={{
                                flex: 1,
                                width: '100%',
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '0.5rem',
                                padding: '1rem',
                                color: 'var(--text-primary)',
                                fontSize: '1rem',
                                lineHeight: '1.6',
                                resize: 'none',
                                outline: 'none',
                                fontFamily: 'monospace'
                            }}
                        />
                    ) : (
                        <div style={{
                            flex: 1,
                            color: 'var(--text-primary)',
                            fontSize: '1rem',
                            lineHeight: '1.6',
                            whiteSpace: 'pre-wrap'
                        }}>
                            {notes ? <MarkdownRenderer text={notes} /> : <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No notes added yet. Click the pencil icon to add notes.</span>}
                        </div>
                    )}
                </div>

                {isEditing && (
                    <div style={{
                        padding: '1rem',
                        borderTop: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '1rem'
                    }}>
                        <button onClick={() => setIsEditing(false)} className="btn-action">Cancel</button>
                        <button
                            onClick={handleSave}
                            className="btn-action"
                            style={{ borderColor: 'var(--accent-success)', color: 'var(--accent-success)' }}
                        >
                            Save Changes
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default NotesModal;
