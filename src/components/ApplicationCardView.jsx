import React from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2 } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import NotesModal from './NotesModal';
import { APPLICATION_STATUSES, getStatusColor } from '@phd-tracker/shared/statuses';
import { formatDeadlineDate, getDaysUntilDeadline } from '@phd-tracker/shared/dates';
import { APPLICATION_DOCUMENT_TYPES, normalizeDocuments, normalizeRequirements } from '@phd-tracker/shared/applications';
import { getCountryCode } from '../utils/countryFlags';
import { openDocumentWithSystemViewer } from '../utils/documentOpen';

const ApplicationCardView = ({ app, onDelete, onStatusChange, onEdit, onEnterEdit, dragHandleProps }) => {
    const [isNotesModalOpen, setIsNotesModalOpen] = React.useState(false);
    const requirements = React.useMemo(() => normalizeRequirements(app.requirements), [app.requirements]);
    const documents = React.useMemo(
        () => normalizeDocuments(app.documents, app.file, app.files),
        [app.documents, app.file, app.files]
    );
    const countryCode = getCountryCode(app.country);

    const handleOpenDocument = async (event, document) => {
        event.preventDefault();
        try {
            await openDocumentWithSystemViewer(document);
        } catch (error) {
            console.error(error);
            toast.error('Failed to open document');
        }
    };

    return (
        <div style={{
            background: 'var(--bg-card)',
            border: 'var(--glass-border)',
            borderRadius: '1rem',
            padding: '1.5rem',
            backdropFilter: 'var(--backdrop-blur)',
            boxShadow: 'var(--glass-shadow)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            transition: 'transform 0.2s',
            position: 'relative',
            height: '100%'
        }}
            id={`app-card-${app.id}`}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'start' }}>
                    {dragHandleProps && (
                        <div
                            {...dragHandleProps}
                            style={{
                                cursor: 'grab',
                                color: 'var(--text-secondary)',
                                fontSize: '1.2rem',
                                padding: '0.25rem',
                                display: 'flex',
                                alignItems: 'center',
                                opacity: 0.5
                            }}
                            title="Drag to reorder"
                        >
                            ::
                        </div>
                    )}
                    <div>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{app.university}</h3>
                        <p style={{ color: 'var(--accent-primary)', fontSize: '0.9rem' }}>{app.program}</p>
                        {app.department && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Department: {app.department}</p>}
                        {app.country && (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {countryCode ? (
                                    <img
                                        src={`https://flagcdn.com/w20/${countryCode}.png`}
                                        srcSet={`https://flagcdn.com/w40/${countryCode}.png 2x`}
                                        width="20"
                                        height="15"
                                        loading="lazy"
                                        decoding="async"
                                        alt={app.country}
                                        style={{ borderRadius: '2px' }}
                                    />
                                ) : 'Globe'}
                                {app.country}
                            </p>
                        )}
                    </div>
                </div>
                <div className="card-actions">
                    <button
                        type="button"
                        onClick={onEnterEdit}
                        className="card-action-btn"
                        aria-label="Edit application"
                        title="Edit"
                    >
                        <Pencil size={16} aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(app.id)}
                        className="card-action-btn card-action-btn--danger"
                        aria-label="Delete application"
                        title="Delete"
                    >
                        <Trash2 size={16} aria-hidden="true" />
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {app.website && (
                    <a
                        href={app.website.startsWith('http://') || app.website.startsWith('https://') ? app.website : `https://${app.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}
                    >
                        Website ↗
                    </a>
                )}
                {app.qsRanking && <span>QS Rank: #{app.qsRanking}</span>}
                {documents.length > 0 && (
                    <span>{documents.length} document{documents.length === 1 ? '' : 's'}</span>
                )}
            </div>

            {requirements && requirements.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {requirements.map(req => (
                        <span
                            key={req}
                            style={{
                                background: 'rgba(56, 189, 248, 0.2)',
                                color: 'var(--accent-primary)',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '0.5rem',
                                fontSize: '0.75rem',
                                fontWeight: 500
                            }}
                        >
                            {req}
                        </span>
                    ))}
                </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Status:</span>
                <select
                    value={app.status}
                    onChange={(e) => onStatusChange(app.id, e.target.value)}
                    style={{
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.85rem',
                        borderColor: getStatusColor(app.status),
                        color: getStatusColor(app.status),
                        fontWeight: 600,
                    }}
                >
                    {APPLICATION_STATUSES.map(status => (
                        <option key={status} value={status}>{status}</option>
                    ))}
                </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Deadline: {formatDeadlineDate(app.deadline)}
                    </span>
                    {app.deadline && (() => {
                        const days = getDaysUntilDeadline(app.deadline);
                        if (days >= 0 && days <= 7) {
                            return (
                                <span style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--accent-danger)',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                }}>
                                    {days === 0 ? 'Due Today!' : `${days} days left`}
                                </span>
                            );
                        }
                        return null;
                    })()}
                </div>
            </div>

            {documents.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Documents
                    </div>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                        {documents.map((document) => (
                            <a
                                key={document.id}
                                href={document.downloadUrl || document.dataUrl || '#'}
                                onClick={(event) => handleOpenDocument(event, document)}
                                style={{
                                    fontSize: '0.85rem',
                                    color: 'var(--accent-primary)',
                                    textDecoration: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.5rem',
                                    border: '1px dashed var(--accent-primary)',
                                    borderRadius: '0.5rem',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                {APPLICATION_DOCUMENT_TYPES.find((option) => option.value === document.category)?.label || 'Document'}: {document.name}
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {app.notes && (
                <div
                    onClick={() => setIsNotesModalOpen(true)}
                    style={{
                        marginTop: '0.5rem',
                        padding: '0.75rem',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: '0.5rem',
                        fontSize: '0.9rem',
                        color: 'var(--text-secondary)',
                        wordBreak: 'break-word',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        maxHeight: '100px',
                        overflowY: 'auto',
                        border: '1px solid transparent'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(0,0,0,0.3)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(0,0,0,0.2)';
                        e.currentTarget.style.borderColor = 'transparent';
                    }}
                    title="Click to expand and edit notes"
                >
                    <MarkdownRenderer text={app.notes} />
                </div>
            )}

            <NotesModal
                isOpen={isNotesModalOpen}
                onClose={() => setIsNotesModalOpen(false)}
                initialNotes={app.notes}
                title={app.university}
                onSave={(newNotes) => {
                    onEdit({ ...app, notes: newNotes });
                }}
                startEditing={false}
            />
        </div>
    );
};

export default ApplicationCardView;
