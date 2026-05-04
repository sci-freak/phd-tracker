import React, { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { APPLICATION_DOCUMENT_TYPES, normalizeDocuments } from '@phd-tracker/shared/applications';
import MarkdownRenderer from './MarkdownRenderer';
import { formatReadableDate, formatReadableTime } from '@phd-tracker/shared/dates';
import { openDocumentWithSystemViewer } from '../utils/documentOpen';

const ApplicationDetailModal = ({ event, onClose, onEdit }) => {
    const containerRef = useRef(null);
    const isOpen = Boolean(event);
    useFocusTrap(containerRef, isOpen);
    useBodyScrollLock(isOpen);

    useEffect(() => {
        if (!isOpen) return undefined;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose?.();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!event) return null;

    const app = event.resource || {};
    const isGoogleEvent = event.type === 'google';
    const documents = normalizeDocuments(app.documents, app.file, app.files);

    const handleOpenDocument = async (eventObject, document) => {
        eventObject.preventDefault();
        try {
            await openDocumentWithSystemViewer(document);
        } catch (error) {
            console.error(error);
            toast.error('Failed to open document');
        }
    };

    return (
        <div
            role="presentation"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000,
                backdropFilter: 'blur(5px)'
            }}
            onClick={onClose}
        >
            <div
                ref={containerRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="app-detail-title"
                style={{
                    background: 'var(--bg-card)',
                    padding: '2rem',
                    borderRadius: '1rem',
                    width: '90%',
                    maxWidth: '600px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    border: 'var(--glass-border)',
                    boxShadow: 'var(--glass-shadow)',
                    position: 'relative'
                }}
                onClick={e => e.stopPropagation()}
            >
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="card-action-btn"
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem'
                    }}
                >
                    <X size={18} aria-hidden="true" />
                </button>

                <h2 id="app-detail-title" style={{ marginTop: 0, color: 'var(--text-primary)', paddingRight: '2rem' }}>
                    {event.title || 'No Title'}
                </h2>

                <div style={{ marginBottom: '1.5rem' }}>
                    <span style={{
                        background: isGoogleEvent ? 'var(--accent-secondary)' : 'var(--accent-primary)',
                        color: 'white',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '1rem',
                        fontSize: '0.85rem',
                        display: 'inline-block',
                        marginBottom: '0.5rem'
                    }}>
                        {isGoogleEvent ? 'Google Calendar Event' : (app.status || 'Unknown Status')}
                    </span>

                    <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                        <span>Date: {formatReadableDate(event.start)}</span>
                        <span>Time: {formatReadableTime(event.start, event.allDay)}</span>
                    </div>
                </div>

                {!isGoogleEvent && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {app.department && (
                            <div>
                                <strong style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Department</strong>
                                <div style={{ color: 'var(--text-primary)' }}>{app.department}</div>
                            </div>
                        )}

                        {app.country && (
                            <div>
                                <strong style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Country</strong>
                                <div style={{ color: 'var(--text-primary)' }}>{app.country}</div>
                            </div>
                        )}

                        {app.website && (
                            <div>
                                <strong style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Website</strong>
                                <div>
                                    <a href={app.website} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)' }}>
                                        Visit Program Website
                                    </a>
                                </div>
                            </div>
                        )}

                        {app.requirements && Array.isArray(app.requirements) && app.requirements.length > 0 && (
                            <div>
                                <strong style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Requirements</strong>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                                    {app.requirements.map((req, idx) => (
                                        <span key={idx} style={{
                                            background: 'var(--bg-secondary)',
                                            color: 'var(--text-primary)',
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '0.5rem',
                                            fontSize: '0.85rem',
                                            border: '1px solid var(--glass-border)'
                                        }}>
                                            {req}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {app.notes && (
                            <div>
                                <strong style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Notes</strong>
                                <div
                                    style={{
                                        background: 'var(--bg-secondary)',
                                        padding: '1rem',
                                        borderRadius: '0.5rem',
                                        marginTop: '0.25rem',
                                        fontSize: '0.9rem',
                                        lineHeight: '1.5'
                                    }}
                                >
                                    <MarkdownRenderer text={app.notes} />
                                </div>
                            </div>
                        )}

                        {documents.length > 0 && (
                            <div>
                                <strong style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Documents</strong>
                                <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    {documents.map((document) => (
                                        <a
                                            key={document.id}
                                            href={document.downloadUrl || document.dataUrl || '#'}
                                            onClick={(eventObject) => handleOpenDocument(eventObject, document)}
                                            style={{
                                                color: 'var(--accent-primary)',
                                                textDecoration: 'none',
                                                padding: '0.75rem 1rem',
                                                borderRadius: '0.5rem',
                                                border: '1px solid var(--glass-border)',
                                                background: 'var(--bg-secondary)'
                                            }}
                                        >
                                            {APPLICATION_DOCUMENT_TYPES.find((option) => option.value === document.category)?.label || 'Document'}: {document.name}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => {
                                    onEdit(app);
                                    onClose();
                                }}
                                className="btn-action"
                                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                            >
                                Edit Application
                            </button>
                        </div>
                    </div>
                )}

                {isGoogleEvent && app.description && (
                    <div>
                        <strong style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Description</strong>
                        <div style={{ marginTop: '0.25rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                            {app.description}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ApplicationDetailModal;
