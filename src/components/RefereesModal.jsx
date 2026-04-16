import React, { useEffect, useMemo, useState } from 'react';
import { REFEREE_DOCUMENT_TYPES, createEmptyRefereeDraft, sortReferees } from '@phd-tracker/shared/referees';
import { normalizeDocuments } from '@phd-tracker/shared/applications';
import { DataService } from '../services/DataService';
import { openDocumentWithSystemViewer } from '../utils/documentOpen';

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

const RefereesModal = ({ isOpen, onClose, currentUser }) => {
    const [referees, setReferees] = useState([]);
    const [draft, setDraft] = useState(() => createEmptyRefereeDraft());
    const [selectedDocumentType, setSelectedDocumentType] = useState('recommendation');
    const [selectedDocumentFile, setSelectedDocumentFile] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isOpen || !currentUser) {
            return undefined;
        }

        setDraft(createEmptyRefereeDraft());
        setSelectedDocumentFile(null);
        setSelectedDocumentType('recommendation');
        setEditingId(null);

        return DataService.subscribeToReferees(currentUser, setReferees);
    }, [isOpen, currentUser]);

    const normalizedDocuments = useMemo(() => {
        return normalizeDocuments(draft.documents);
    }, [draft.documents]);

    const handleFileChange = (event) => {
        const selectedFile = event.target.files?.[0];
        if (!selectedFile) {
            return;
        }

        if (selectedFile.size > MAX_DOCUMENT_SIZE) {
            alert('Please choose a file under 2MB.');
            return;
        }

        setSelectedDocumentFile(selectedFile);
    };

    const addDocument = () => {
        const pendingDocument = createPendingDocument(selectedDocumentFile, selectedDocumentType);
        if (!pendingDocument) {
            alert('Choose a file before adding a letter.');
            return;
        }

        setDraft((current) => ({
            ...current,
            documents: [
                ...normalizeDocuments(current.documents),
                pendingDocument
            ]
        }));
        setSelectedDocumentFile(null);
    };

    const removeDocument = (documentId) => {
        setDraft((current) => ({
            ...current,
            documents: normalizeDocuments(current.documents).filter((document) => document.id !== documentId)
        }));
    };

    const resetDraft = () => {
        setDraft(createEmptyRefereeDraft());
        setSelectedDocumentFile(null);
        setSelectedDocumentType('recommendation');
        setEditingId(null);
    };

    const handleEdit = (referee) => {
        setDraft({
            name: referee.name || '',
            email: referee.email || '',
            notes: referee.notes || '',
            documents: normalizeDocuments(referee.documents)
        });
        setEditingId(referee.id);
        setSelectedDocumentFile(null);
    };

    const handleSave = async () => {
        if (!draft.email.trim()) {
            alert('Referee email is required.');
            return;
        }

        setSaving(true);
        try {
            const pendingDocument = createPendingDocument(selectedDocumentFile, selectedDocumentType);
            const payload = {
                ...draft,
                documents: pendingDocument
                    ? [...normalizeDocuments(draft.documents), pendingDocument]
                    : normalizeDocuments(draft.documents),
                id: editingId || undefined,
                previousDocuments: editingId
                    ? normalizeDocuments(referees.find((referee) => referee.id === editingId)?.documents)
                    : []
            };

            if (editingId) {
                await DataService.updateReferee(currentUser, payload);
            } else {
                await DataService.addReferee(currentUser, payload);
            }

            resetDraft();
        } catch (error) {
            console.error(error);
            alert(`Failed to save referee.${error?.message ? `\n\n${error.message}` : ''}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (referee) => {
        if (!confirm(`Delete referee ${referee.email}?`)) {
            return;
        }

        try {
            await DataService.deleteReferee(currentUser, referee.id, normalizeDocuments(referee.documents));
            if (editingId === referee.id) {
                resetDraft();
            }
        } catch (error) {
            console.error(error);
            alert('Failed to delete referee.');
        }
    };

    const handleOpenDocument = async (event, document) => {
        event.preventDefault();
        try {
            await openDocumentWithSystemViewer(document);
        } catch (error) {
            console.error(error);
            alert('Failed to open file.');
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(4px)',
                zIndex: 9999,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    width: '860px',
                    maxWidth: '94%',
                    maxHeight: '88vh',
                    overflowY: 'auto',
                    background: 'var(--bg-card)',
                    border: 'var(--glass-border)',
                    borderRadius: '1rem',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                    padding: '1.5rem',
                    display: 'grid',
                    gap: '1.5rem'
                }}
                onClick={(event) => event.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Referees</h2>
                        <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)' }}>
                            Keep referee emails and recommendation letters in one shared place.
                        </p>
                    </div>
                    <button onClick={onClose} className="btn-action">Close</button>
                </div>

                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                        <label style={{ color: 'var(--text-secondary)' }}>Referee Name</label>
                        <input
                            type="text"
                            value={draft.name}
                            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                            placeholder="Optional name"
                        />
                    </div>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                        <label style={{ color: 'var(--text-secondary)' }}>Referee Email</label>
                        <input
                            type="email"
                            value={draft.email}
                            onChange={(event) => setDraft({ ...draft, email: event.target.value })}
                            placeholder="referee@example.edu"
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gap: '0.5rem' }}>
                    <label style={{ color: 'var(--text-secondary)' }}>Notes</label>
                    <textarea
                        value={draft.notes}
                        onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
                        placeholder="Institution, relationship, deadlines, reminders..."
                        rows={3}
                        style={{
                            width: '100%',
                            resize: 'vertical',
                            borderRadius: '0.75rem',
                            background: 'rgba(0,0,0,0.2)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'var(--text-primary)',
                            padding: '0.9rem'
                        }}
                    />
                </div>

                <div style={{ display: 'grid', gap: '0.75rem' }}>
                    <label style={{ color: 'var(--text-secondary)' }}>Letters & Files</label>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <select
                            value={selectedDocumentType}
                            onChange={(event) => setSelectedDocumentType(event.target.value)}
                            style={{ minWidth: '220px' }}
                        >
                            {REFEREE_DOCUMENT_TYPES.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                        <label className="btn-action" style={{ justifyContent: 'center', minWidth: '220px' }}>
                            <span>[File]</span> {selectedDocumentFile ? selectedDocumentFile.name : 'Choose Letter'}
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />
                        </label>
                        <button type="button" onClick={addDocument} className="btn-action">
                            + Add Letter
                        </button>
                    </div>

                    {normalizedDocuments.length > 0 ? (
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            {normalizedDocuments.map((document) => (
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
                                        <div style={{ fontWeight: 600 }}>{document.name}</div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                            {REFEREE_DOCUMENT_TYPES.find((option) => option.value === document.category)?.label || 'Document'}
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => removeDocument(document.id)} className="btn-action">
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            Upload recommendation letters or other referee files here.
                        </span>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    {editingId ? (
                        <button type="button" onClick={resetDraft} className="btn-action">
                            Cancel Edit
                        </button>
                    ) : null}
                    <button
                        type="button"
                        onClick={handleSave}
                        className="btn-action"
                        style={{ borderColor: 'var(--accent-success)', color: 'var(--accent-success)' }}
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : editingId ? 'Update Referee' : 'Save Referee'}
                    </button>
                </div>

                <div style={{ display: 'grid', gap: '0.75rem' }}>
                    <h3 style={{ margin: 0 }}>Saved Referees</h3>
                    {sortReferees(referees).length === 0 ? (
                        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                            No referees saved yet.
                        </p>
                    ) : (
                        sortReferees(referees).map((referee) => (
                            <div
                                key={referee.id}
                                style={{
                                    padding: '1rem',
                                    borderRadius: '0.85rem',
                                    border: 'var(--glass-border)',
                                    background: 'rgba(15, 23, 42, 0.3)',
                                    display: 'grid',
                                    gap: '0.5rem'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'start' }}>
                                    <div>
                                        <div style={{ fontSize: '1rem', fontWeight: 700 }}>{referee.name || referee.email}</div>
                                        <a href={`mailto:${referee.email}`} style={{ color: 'var(--accent-primary)' }}>
                                            {referee.email}
                                        </a>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button type="button" className="btn-action" onClick={() => handleEdit(referee)}>Edit</button>
                                        <button type="button" className="btn-action" onClick={() => handleDelete(referee)}>Delete</button>
                                    </div>
                                </div>
                                {referee.notes ? (
                                    <p style={{ margin: 0, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{referee.notes}</p>
                                ) : null}
                                {Array.isArray(referee.documents) && referee.documents.length > 0 ? (
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {referee.documents.map((document) => (
                                            <a
                                                key={document.id}
                                                href={document.downloadUrl || document.dataUrl || '#'}
                                                onClick={(event) => handleOpenDocument(event, document)}
                                                style={{
                                                    color: 'var(--accent-primary)',
                                                    textDecoration: 'none',
                                                    padding: '0.5rem 0.75rem',
                                                    border: '1px solid rgba(56, 189, 248, 0.35)',
                                                    borderRadius: '0.6rem',
                                                    fontSize: '0.85rem'
                                                }}
                                            >
                                                {document.name}
                                            </a>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default RefereesModal;
