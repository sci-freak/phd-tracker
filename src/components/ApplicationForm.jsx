import React, { useState } from 'react';
import { toast } from 'sonner';
import {
    APPLICATION_DOCUMENT_TYPES,
    createApplicationSubmission,
    createEmptyApplicationDraft
} from '@phd-tracker/shared/applications';
import { APPLICATION_STATUSES } from '@phd-tracker/shared/statuses';
import WysiwygEditor from './WysiwygEditor';

const requirementOptions = [
    'TOEFL',
    'IELTS',
    'GRE',
    'GMAT',
    'Transcripts',
    'SOP',
    'CV',
    'Personal Statement',
    '1 LOR',
    '2 LORs',
    '3 LORs',
    '4 LORs'
];

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

const ApplicationForm = ({ onAdd }) => {
    const [formData, setFormData] = useState(() => createEmptyApplicationDraft());
    const [requirements, setRequirements] = useState([]);
    const [newRequirement, setNewRequirement] = useState('');
    const [documents, setDocuments] = useState([]);
    const [selectedDocumentType, setSelectedDocumentType] = useState('sop');
    const [selectedDocumentFile, setSelectedDocumentFile] = useState(null);

    const addRequirement = () => {
        if (newRequirement && !requirements.includes(newRequirement)) {
            setRequirements([...requirements, newRequirement]);
            setNewRequirement('');
        }
    };

    const removeRequirement = (req) => {
        setRequirements(requirements.filter((item) => item !== req));
    };

    const handleFileChange = (event) => {
        const selectedFile = event.target.files[0];
        if (selectedFile && selectedFile.size > MAX_DOCUMENT_SIZE) {
            toast.error('File is too large', { description: 'Please select a file under 2MB.' });
            return;
        }
        setSelectedDocumentFile(selectedFile);
    };

    const addDocument = () => {
        const pendingDocument = createPendingDocument(selectedDocumentFile, selectedDocumentType);
        if (!pendingDocument) {
            toast.error('Choose a file before adding a document.');
            return;
        }

        setDocuments((current) => [...current, pendingDocument]);
        setSelectedDocumentFile(null);
    };

    const removeDocument = (documentId) => {
        setDocuments((current) => current.filter((document) => document.id !== documentId));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!formData.university || !formData.program) return;

        const submission = createApplicationSubmission(
            {
                ...formData,
                requirements,
                documents: (() => {
                    const pendingDocument = createPendingDocument(selectedDocumentFile, selectedDocumentType);
                    return pendingDocument ? [...documents, pendingDocument] : documents;
                })()
            },
            {}
        );

        if (!submission) {
            toast.error('University and Program are required');
            return;
        }

        onAdd({
            ...submission,
            id: crypto.randomUUID()
        });

        setFormData(createEmptyApplicationDraft());
        setRequirements([]);
        setNewRequirement('');
        setDocuments([]);
        setSelectedDocumentFile(null);
        setSelectedDocumentType('sop');
    };

    return (
        <form
            onSubmit={handleSubmit}
            style={{
                background: 'var(--bg-card)',
                padding: '2rem',
                borderRadius: '1rem',
                border: 'var(--glass-border)',
                backdropFilter: 'var(--backdrop-blur)',
                boxShadow: 'var(--glass-shadow)',
                marginBottom: '3rem',
                display: 'grid',
                gap: '1.5rem',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))'
            }}
        >
            <div style={{ gridColumn: '1 / -1', marginBottom: '0.5rem' }}>
                <h2 style={{ fontSize: '1.5rem' }}>Add New Application</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>University</label>
                <input
                    type="text"
                    placeholder="e.g. MIT"
                    value={formData.university}
                    onChange={(event) => setFormData({ ...formData, university: event.target.value })}
                    required
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Program</label>
                <input
                    type="text"
                    placeholder="e.g. Computer Science"
                    value={formData.program}
                    onChange={(event) => setFormData({ ...formData, program: event.target.value })}
                    required
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Department</label>
                <input
                    type="text"
                    placeholder="e.g. School of Engineering"
                    value={formData.department}
                    onChange={(event) => setFormData({ ...formData, department: event.target.value })}
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Country</label>
                <input
                    type="text"
                    list="country-list"
                    placeholder="e.g. USA"
                    value={formData.country}
                    onChange={(event) => setFormData({ ...formData, country: event.target.value })}
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Deadline</label>
                <input
                    type="datetime-local"
                    value={formData.deadline}
                    onChange={(event) => setFormData({ ...formData, deadline: event.target.value })}
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Website Link</label>
                <input
                    type="url"
                    placeholder="https://university.edu/program"
                    value={formData.website}
                    onChange={(event) => setFormData({ ...formData, website: event.target.value })}
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>QS Ranking</label>
                <input
                    type="number"
                    placeholder="e.g. 5"
                    value={formData.qsRanking}
                    onChange={(event) => setFormData({ ...formData, qsRanking: event.target.value })}
                    min="1"
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Status</label>
                <select
                    value={formData.status}
                    onChange={(event) => setFormData({ ...formData, status: event.target.value })}
                >
                    {APPLICATION_STATUSES.map((status) => (
                        <option key={status} value={status}>{status}</option>
                    ))}
                </select>
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Requirements</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <select
                        value={newRequirement}
                        onChange={(event) => setNewRequirement(event.target.value)}
                        style={{ flex: 1, minWidth: '150px' }}
                    >
                        <option value="">Select requirement...</option>
                        {requirementOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
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

                {requirements.length > 0 ? (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                        {requirements.map((req) => (
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
                ) : null}
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Documents</label>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <select
                        value={selectedDocumentType}
                        onChange={(event) => setSelectedDocumentType(event.target.value)}
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
                            onChange={handleFileChange}
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

                {documents.length > 0 ? (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {documents.map((document) => (
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
                        Add SOPs, recommendation letters, or other supporting documents here.
                    </span>
                )}
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Notes</label>
                <WysiwygEditor
                    value={formData.notes}
                    onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
                    placeholder="Research interests, professors to contact, etc."
                    rows={3}
                />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
                <button
                    type="submit"
                    style={{
                        width: '100%',
                        padding: '1rem',
                        background: 'linear-gradient(to right, var(--accent-primary), var(--accent-secondary))',
                        border: 'none',
                        borderRadius: '0.5rem',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '1rem',
                        marginTop: '1rem'
                    }}
                >
                    Add Application
                </button>
            </div>
        </form>
    );
};

export default ApplicationForm;
