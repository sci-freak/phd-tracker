import React, { useState } from 'react';
import WysiwygEditor from './WysiwygEditor';

const ApplicationForm = ({ onAdd }) => {
    const [formData, setFormData] = useState({
        university: '',
        program: '',
        department: '',
        country: '',
        deadline: '',
        website: '',
        qsRanking: '',
        notes: '',
        status: 'Not Started'
    });

    const [file, setFile] = useState(null);
    const [requirements, setRequirements] = useState([]);
    const [newRequirement, setNewRequirement] = useState('');

    const requirementOptions = ['TOEFL', 'IELTS', 'GRE', 'GMAT', 'Transcripts', 'LORs', 'SOP', 'CV'];

    const addRequirement = () => {
        if (newRequirement && !requirements.includes(newRequirement)) {
            setRequirements([...requirements, newRequirement]);
            setNewRequirement('');
        }
    };

    const removeRequirement = (req) => {
        setRequirements(requirements.filter(r => r !== req));
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.size > 500000) { // 500KB limit
            alert("File is too large! Please select a file under 500KB.");
            return;
        }
        setFile(selectedFile);
    };

    const convertToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
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
                console.error("Error converting file:", error);
                alert("Failed to process file.");
                return;
            }
        }

        onAdd({ ...formData, id: crypto.randomUUID(), file: fileData, requirements });
        setFormData({
            university: '',
            program: '',
            department: '',
            country: '',
            deadline: '',
            website: '',
            qsRanking: '',
            notes: '',
            status: 'Not Started'
        });
        setFile(null);
        setRequirements([]);
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
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
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
                    onChange={e => setFormData({ ...formData, university: e.target.value })}
                    required
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Program</label>
                <input
                    type="text"
                    placeholder="e.g. Computer Science"
                    value={formData.program}
                    onChange={e => setFormData({ ...formData, program: e.target.value })}
                    required
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Department</label>
                <input
                    type="text"
                    placeholder="e.g. School of Engineering"
                    value={formData.department}
                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Country</label>
                <input
                    type="text"
                    placeholder="e.g. USA"
                    value={formData.country}
                    onChange={e => setFormData({ ...formData, country: e.target.value })}
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Deadline</label>
                <input
                    type="date"
                    value={formData.deadline}
                    onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Website Link</label>
                <input
                    type="url"
                    placeholder="https://university.edu/program"
                    value={formData.website}
                    onChange={e => setFormData({ ...formData, website: e.target.value })}
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>QS Ranking</label>
                <input
                    type="number"
                    placeholder="e.g. 5"
                    value={formData.qsRanking}
                    onChange={e => setFormData({ ...formData, qsRanking: e.target.value })}
                    min="1"
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>CV / SOP (Max 500KB)</label>
                <label className="btn-action" style={{ justifyContent: 'center', width: '100%' }}>
                    <span>📄</span> {file ? file.name : "Choose File"}
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
                {requirements.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                        {requirements.map(req => (
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
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Notes</label>
                <WysiwygEditor
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
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
                        marginTop: '1rem',
                    }}
                >
                    Add Application
                </button>
            </div>
        </form>
    );
};

export default ApplicationForm;
