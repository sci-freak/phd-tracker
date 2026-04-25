import React from 'react';
import { normalizeRequirements } from '@phd-tracker/shared/applications';

const REQUIREMENT_OPTIONS = [
    'TOEFL', 'IELTS', 'GRE', 'GMAT', 'Transcripts',
    'SOP', 'CV', 'Personal Statement',
    '1 LOR', '2 LORs', '3 LORs', '4 LORs'
];

const RequirementsEditor = ({ value, onChange }) => {
    const [selected, setSelected] = React.useState('');
    const requirements = normalizeRequirements(value);

    const add = () => {
        if (selected && !requirements.includes(selected)) {
            onChange([...requirements, selected]);
            setSelected('');
        }
    };

    const remove = (req) => {
        onChange(requirements.filter((r) => r !== req));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Requirements</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <select
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                    style={{ flex: 1, minWidth: '150px' }}
                >
                    <option value="">Select requirement...</option>
                    {REQUIREMENT_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
                <button
                    type="button"
                    onClick={add}
                    className="btn-action"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                >
                    + Add
                </button>
            </div>
            {requirements.length > 0 && (
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
                                onClick={() => remove(req)}
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
            )}
        </div>
    );
};

export default RequirementsEditor;
