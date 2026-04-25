import React from 'react';
import { APPLICATION_DOCUMENT_TYPES } from '@phd-tracker/shared/applications';

const MAX_DOCUMENT_SIZE = 2 * 1024 * 1024;

const createPendingDocument = (file, category) => {
    if (!file) return null;
    return {
        id: crypto.randomUUID(),
        category,
        name: file.name,
        mimeType: file.type,
        size: file.size,
        file,
        uploadedAt: new Date().toISOString()
    };
};

const DocumentsEditor = React.forwardRef(({ value, onChange }, ref) => {
    const [selectedType, setSelectedType] = React.useState('supporting');
    const [selectedFile, setSelectedFile] = React.useState(null);
    const docs = Array.isArray(value) ? value : [];

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file && file.size > MAX_DOCUMENT_SIZE) {
            alert('File is too large. Please select a file under 2MB.');
            return;
        }
        setSelectedFile(file);
    };

    const add = () => {
        const pending = createPendingDocument(selectedFile, selectedType);
        if (!pending) {
            alert('Choose a file before adding a document.');
            return;
        }
        onChange([...docs, pending]);
        setSelectedFile(null);
    };

    const remove = (documentId) => {
        onChange(docs.filter((d) => d.id !== documentId));
    };

    React.useImperativeHandle(ref, () => ({
        flushPending: () => {
            const pending = createPendingDocument(selectedFile, selectedType);
            if (pending) {
                setSelectedFile(null);
                return pending;
            }
            return null;
        }
    }));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Documents</label>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    style={{ minWidth: '180px' }}
                >
                    {APPLICATION_DOCUMENT_TYPES.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </select>
                <label className="btn-action" style={{ justifyContent: 'center', minWidth: '220px' }}>
                    <span>[File]</span> {selectedFile ? selectedFile.name : 'Choose Document'}
                    <input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                    />
                </label>
                <button
                    type="button"
                    onClick={add}
                    className="btn-action"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                >
                    + Add Document
                </button>
            </div>
            {docs.length > 0 ? (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {docs.map((document) => (
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
                                onClick={() => remove(document.id)}
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
    );
});

DocumentsEditor.displayName = 'DocumentsEditor';

export default DocumentsEditor;
