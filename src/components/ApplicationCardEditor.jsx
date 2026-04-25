import React from 'react';
import SearchableSelect from './SearchableSelect';
import RequirementsEditor from './RequirementsEditor';
import DocumentsEditor from './DocumentsEditor';
import NotesModal from './NotesModal';
import { countries } from '../constants/countries';

const ApplicationCardEditor = React.forwardRef(({ value, onChange, onCancel, onSave }, documentsEditorRef) => {
    const [isNotesModalOpen, setIsNotesModalOpen] = React.useState(false);
    const patch = (partial) => onChange({ ...value, ...partial });

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
                value={value.university}
                onChange={(e) => patch({ university: e.target.value })}
                placeholder="University"
            />
            <input
                value={value.program}
                onChange={(e) => patch({ program: e.target.value })}
                placeholder="Program"
            />
            <input
                value={value.department || ''}
                onChange={(e) => patch({ department: e.target.value })}
                placeholder="Department"
            />
            <SearchableSelect
                options={countries}
                value={value.country || ''}
                onChange={(val) => patch({ country: val })}
                placeholder="Country"
            />
            <input
                type="datetime-local"
                value={value.deadline}
                onChange={(e) => patch({ deadline: e.target.value })}
            />
            <input
                type="url"
                value={value.website || ''}
                onChange={(e) => patch({ website: e.target.value })}
                placeholder="Website Link"
            />
            <input
                type="number"
                value={value.qsRanking || ''}
                onChange={(e) => patch({ qsRanking: e.target.value })}
                placeholder="QS Ranking"
                min="1"
            />

            <RequirementsEditor
                value={value.requirements}
                onChange={(reqs) => patch({ requirements: reqs })}
            />

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
                        color: value.notes ? 'var(--text-primary)' : 'var(--text-secondary)',
                        paddingRight: '2rem',
                        maxHeight: '100px',
                        overflowY: 'auto',
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'inherit'
                    }}>
                        {value.notes || 'No notes added yet...'}
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

            <DocumentsEditor
                ref={documentsEditorRef}
                value={value.documents}
                onChange={(docs) => patch({ documents: docs })}
            />

            <NotesModal
                isOpen={isNotesModalOpen}
                onClose={() => setIsNotesModalOpen(false)}
                initialNotes={value.notes}
                title={value.university}
                onSave={(newNotes) => patch({ notes: newNotes })}
                startEditing={true}
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button onClick={onCancel} className="btn-action" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Cancel</button>
                <button onClick={onSave} className="btn-action" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderColor: 'var(--accent-success)', color: 'var(--accent-success)' }}>Save</button>
            </div>
        </div>
    );
});

ApplicationCardEditor.displayName = 'ApplicationCardEditor';

export default ApplicationCardEditor;
