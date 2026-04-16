import React from 'react';
import MarkdownRenderer from './MarkdownRenderer';
import NotesModal from './NotesModal';
import SearchableSelect from './SearchableSelect';
import { APPLICATION_STATUSES, getStatusColor } from '@phd-tracker/shared/statuses';
import { formatDeadlineDate, getDaysUntilDeadline } from '@phd-tracker/shared/dates';
import { APPLICATION_DOCUMENT_TYPES, normalizeDocuments, normalizeRequirements } from '@phd-tracker/shared/applications';
import { getCountryCode } from '../utils/countryFlags';
import { openDocumentWithSystemViewer } from '../utils/documentOpen';
import { countries } from '../constants/countries';

const MAX_DOCUMENT_SIZE = 2 * 1024 * 1024;

const createPendingDocument = (selectedDocumentFile, selectedDocumentType) => {
    if (!selectedDocumentFile) {
        return null;
    }

    return {
        id: crypto.randomUUID(),
        category: selectedDocumentType,
        name: selectedDocumentFile.name,
        mimeType: selectedDocumentFile.type,
        size: selectedDocumentFile.size,
        file: selectedDocumentFile,
        uploadedAt: new Date().toISOString()
    };
};

const ApplicationCard = ({ app, onDelete, onStatusChange, onEdit, startEditing, onEditEnd, dragHandleProps }) => {
    const [isEditing, setIsEditing] = React.useState(false);
    const [editedApp, setEditedApp] = React.useState(app);
    const [newRequirement, setNewRequirement] = React.useState('');
    const [isNotesModalOpen, setIsNotesModalOpen] = React.useState(false);
    const [selectedDocumentType, setSelectedDocumentType] = React.useState('supporting');
    const [selectedDocumentFile, setSelectedDocumentFile] = React.useState(null);

    const requirements = React.useMemo(() => {
        return normalizeRequirements(app.requirements);
    }, [app.requirements]);
    const documents = React.useMemo(() => {
        return normalizeDocuments(app.documents, app.file, app.files);
    }, [app.documents, app.file, app.files]);

    const requirementOptions = ['TOEFL', 'IELTS', 'GRE', 'GMAT', 'Transcripts', 'SOP', 'CV', 'Personal Statement', '1 LOR', '2 LORs', '3 LORs', '4 LORs'];

    React.useEffect(() => {
        if (startEditing) {
            setIsEditing(true);
            const element = document.getElementById(`app-card-${app.id}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [startEditing, app.id]);

    const handleSave = () => {
        const pendingDocument = createPendingDocument(selectedDocumentFile, selectedDocumentType);
        onEdit({
            ...editedApp,
            documents: pendingDocument
                ? [...normalizeDocuments(editedApp.documents), pendingDocument]
                : normalizeDocuments(editedApp.documents),
            previousDocuments: normalizeDocuments(app.documents, app.file, app.files)
        });
        setIsEditing(false);
        setSelectedDocumentFile(null);
        if (onEditEnd) onEditEnd();
    };

    const handleCancel = () => {
        setEditedApp(app);
        setIsEditing(false);
        if (onEditEnd) onEditEnd();
    };

    const handleEdit = () => {
        setEditedApp({
            ...app,
            documents: normalizeDocuments(app.documents, app.file, app.files)
        });
        setIsEditing(true);
    };

    const addRequirement = () => {
        const currentRequirements = normalizeRequirements(editedApp.requirements);

        if (newRequirement && !currentRequirements.includes(newRequirement)) {
            setEditedApp({
                ...editedApp,
                requirements: [...currentRequirements, newRequirement]
            });
            setNewRequirement('');
        }
    };

    const removeRequirement = (req) => {
        const currentRequirements = normalizeRequirements(editedApp.requirements);

        setEditedApp({
            ...editedApp,
            requirements: currentRequirements.filter(r => r !== req)
        });
    };

    const handleDocumentFileChange = (event) => {
        const selectedFile = event.target.files[0];
        if (selectedFile && selectedFile.size > MAX_DOCUMENT_SIZE) {
            alert('File is too large. Please select a file under 2MB.');
            return;
        }
        setSelectedDocumentFile(selectedFile);
    };

    const addDocument = () => {
        const pendingDocument = createPendingDocument(selectedDocumentFile, selectedDocumentType);
        if (!pendingDocument) {
            alert('Choose a file before adding a document.');
            return;
        }

        setEditedApp({
            ...editedApp,
            documents: [
                ...(Array.isArray(editedApp.documents) ? editedApp.documents : []),
                pendingDocument
            ]
        });
        setSelectedDocumentFile(null);
    };

    const removeDocument = (documentId) => {
        setEditedApp({
            ...editedApp,
            documents: (editedApp.documents || []).filter((document) => document.id !== documentId)
        });
    };

    const handleOpenDocument = async (event, document) => {
        event.preventDefault();
        try {
            await openDocumentWithSystemViewer(document);
        } catch (error) {
            console.error(error);
            alert('Failed to open document.');
        }
    };

    if (isEditing) {
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
            }}>
                <input
                    value={editedApp.university}
                    onChange={(e) => setEditedApp({ ...editedApp, university: e.target.value })}
                    placeholder="University"
                />
                <input
                    value={editedApp.program}
                    onChange={(e) => setEditedApp({ ...editedApp, program: e.target.value })}
                    placeholder="Program"
                />
                <input
                    value={editedApp.department || ''}
                    onChange={(e) => setEditedApp({ ...editedApp, department: e.target.value })}
                    placeholder="Department"
                />
                <SearchableSelect
                    options={countries}
                    value={editedApp.country || ''}
                    onChange={(val) => setEditedApp({ ...editedApp, country: val })}
                    placeholder="Country"
                />
                <input
                    type="datetime-local"
                    value={editedApp.deadline}
                    onChange={(e) => setEditedApp({ ...editedApp, deadline: e.target.value })}
                />
                <input
                    type="url"
                    value={editedApp.website || ''}
                    onChange={(e) => setEditedApp({ ...editedApp, website: e.target.value })}
                    placeholder="Website Link"
                />
                <input
                    type="number"
                    value={editedApp.qsRanking || ''}
                    onChange={(e) => setEditedApp({ ...editedApp, qsRanking: e.target.value })}
                    placeholder="QS Ranking"
                    min="1"
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Requirements</label>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <select
                            value={newRequirement}
                            onChange={(e) => setNewRequirement(e.target.value)}
                            style={{ flex: 1, minWidth: '150px' }}
                        >
                            <option value="">Select requirement...</option>
                            {requirementOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={addRequirement}
                            className="btn-action"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                        >
                            + Add
                        </button>
                    </div>
                    {(() => {
                        const editReqs = normalizeRequirements(editedApp.requirements);

                        if (editReqs.length === 0) return null;

                        return (
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                                {editReqs.map(req => (
                                    <span
                                        key={req}
                                        style={{
                                            background: 'var(--accent-primary)',
                                            color: 'white',
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '1rem',
                                            fontSize: '0.85rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        {req}
                                        <button
                                            type="button"
                                            onClick={() => removeRequirement(req)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'white',
                                                cursor: 'pointer',
                                                fontSize: '1rem',
                                                padding: 0,
                                                lineHeight: 1
                                            }}
                                        >
                                            X
                                        </button>
                                    </span>
                                ))}
                            </div>
                        );
                    })()}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Notes</label>
                    <div style={{
                        position: 'relative',
                        background: 'rgba(0, 0, 0, 0.2)',
                        border: 'var(--glass-border)',
                        borderRadius: '0.5rem',
                        padding: '0.75rem',
                        minHeight: '60px'
                    }}>
                        <div style={{
                            fontSize: '0.85rem',
                            color: editedApp.notes ? 'var(--text-primary)' : 'var(--text-secondary)',
                            paddingRight: '2rem',
                            maxHeight: '100px',
                            overflowY: 'auto',
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'inherit'
                        }}>
                            {editedApp.notes || 'No notes added yet...'}
                        </div>
                        <button
                            onClick={() => setIsNotesModalOpen(true)}
                            style={{
                                position: 'absolute',
                                top: '0.5rem',
                                right: '0.5rem',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                padding: '0.25rem',
                                color: 'var(--accent-primary)',
                                transition: 'transform 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            title="Edit Notes"
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            Edit
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Documents</label>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <select
                            value={selectedDocumentType}
                            onChange={(e) => setSelectedDocumentType(e.target.value)}
                            style={{ minWidth: '180px' }}
                        >
                            {APPLICATION_DOCUMENT_TYPES.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                        <label className="btn-action" style={{ justifyContent: 'center', minWidth: '220px' }}>
                            <span>[File]</span> {selectedDocumentFile ? selectedDocumentFile.name : 'Choose Document'}
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                                onChange={handleDocumentFileChange}
                                style={{ display: 'none' }}
                            />
                        </label>
                        <button
                            type="button"
                            onClick={addDocument}
                            className="btn-action"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                        >
                            + Add Document
                        </button>
                    </div>
                    {(editedApp.documents || []).length > 0 ? (
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            {editedApp.documents.map((document) => (
                                <div
                                    key={document.id}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        padding: '0.75rem 1rem',
                                        borderRadius: '0.75rem',
                                        background: 'rgba(15, 23, 42, 0.45)',
                                        border: 'var(--glass-border)'
                                    }}
                                >
                                    <div>
                                        <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{document.name}</div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                            {APPLICATION_DOCUMENT_TYPES.find((option) => option.value === document.category)?.label || 'Document'}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeDocument(document.id)}
                                        className="btn-action"
                                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            Add SOPs, recommendations, or other supporting documents.
                        </span>
                    )}
                </div>

                <NotesModal
                    isOpen={isNotesModalOpen}
                    onClose={() => setIsNotesModalOpen(false)}
                    initialNotes={editedApp.notes}
                    title={editedApp.university}
                    onSave={(newNotes) => setEditedApp({ ...editedApp, notes: newNotes })}
                    startEditing={true}
                />
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button onClick={handleCancel} className="btn-action" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Cancel</button>
                    <button onClick={handleSave} className="btn-action" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderColor: 'var(--accent-success)', color: 'var(--accent-success)' }}>Save</button>
                </div>
            </div>
        );
    }

    const countryCode = getCountryCode(app.country);

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
                                        alt={app.country}
                                        style={{ borderRadius: '2px' }}
                                    />
                                ) : 'Globe'}
                                {app.country}
                            </p>
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={handleEdit}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            fontSize: '1rem',
                            cursor: 'pointer'
                        }}
                        title="Edit"
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => onDelete(app.id)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            fontSize: '1.25rem',
                            padding: '0',
                            lineHeight: '1',
                            cursor: 'pointer'
                        }}
                        title="Delete Application"
                    >
                        X
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
                    const updatedApp = { ...app, notes: newNotes };
                    onEdit(updatedApp);
                }}
                startEditing={false}
            />
        </div>
    );
};

export default ApplicationCard;
