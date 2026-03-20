import React, { useState } from 'react';
import { createApplicationSubmission, createEmptyApplicationDraft } from '@phd-tracker/shared/applications';
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

const ApplicationForm = ({ onAdd }) => {
    const [formData, setFormData] = useState(() => createEmptyApplicationDraft());
    const [file, setFile] = useState(null);
    const [requirements, setRequirements] = useState([]);
    const [newRequirement, setNewRequirement] = useState('');

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
        if (selectedFile && selectedFile.size > 500000) {
            alert('File is too large! Please select a file under 500KB.');
            return;
        }
        setFile(selectedFile);
    };

    const convertToBase64 = (selectedFile) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(selectedFile);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!formData.university || !formData.program) return;

        let fileData = null;
        if (file) {
            try {
                const base64 = await convertToBase64(file);
                fileData = {
                    name: file.name,
                    type: file.type,
                    content: base64
                };
            } catch (error) {
                console.error('Error converting file:', error);
                alert('Failed to process file.');
                return;
            }
        }

        const submission = createApplicationSubmission(
            {
                ...formData,
                requirements
            },
            {
                file: fileData
            }
        );

        if (!submission) {
            alert('University and Program are required.');
            return;
        }

        onAdd({
            ...submission,
            id: crypto.randomUUID()
        });

        setFormData(createEmptyApplicationDraft());
        setFile(null);
        setRequirements([]);
        setNewRequirement('');
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>CV / SOP (Max 500KB)</label>
                <label className="btn-action" style={{ justifyContent: 'center', width: '100%' }}>
                    <span>[File]</span> {file ? file.name : 'Choose File'}
                    <input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                    />
                </label>
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
