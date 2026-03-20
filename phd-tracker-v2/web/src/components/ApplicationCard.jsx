import React from 'react';
import MarkdownRenderer from './MarkdownRenderer';
import NotesModal from './NotesModal';
import SearchableSelect from './SearchableSelect';
import { getCountryCode } from '../utils/countryFlags';
import { countries } from '../constants/countries';

const statusColors = {
    'Not Started': 'var(--text-secondary)',
    'In Progress': 'var(--accent-primary)',
    'Submitted': 'var(--accent-secondary)',
    'Interview': 'var(--accent-warning)',
    'Accepted': 'var(--accent-success)',
    'Rejected': 'var(--accent-danger)',
    'Deadline Missed': 'var(--accent-danger)',
};

const ApplicationCard = ({ app, onDelete, onStatusChange, onEdit, startEditing, onEditEnd, dragHandleProps }) => {
    const [isEditing, setIsEditing] = React.useState(false);
    const [editedApp, setEditedApp] = React.useState(app);
    const [editKey, setEditKey] = React.useState(Date.now());
    const [newRequirement, setNewRequirement] = React.useState('');
    const [showFullNotes, setShowFullNotes] = React.useState(false);
    const [isNotesModalOpen, setIsNotesModalOpen] = React.useState(false);

    const requirementOptions = ['TOEFL', 'IELTS', 'GRE', 'GMAT', 'Transcripts', 'SOP', 'CV', 'Personal Statement', '1 LOR', '2 LORs', '3 LORs', '4 LORs'];

    React.useEffect(() => {
        if (startEditing) {
            setIsEditing(true);
            // Scroll into view
            const element = document.getElementById(`app-card-${app.id}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [startEditing, app.id]);

    const handleSave = () => {
        onEdit(editedApp);
        setIsEditing(false);
        if (onEditEnd) onEditEnd();
    };

    const handleCancel = () => {
        setEditedApp(app);
        setIsEditing(false);
        if (onEditEnd) onEditEnd();
    };

    const handleEdit = () => {
        setEditedApp(app);
        setEditKey(Date.now()); // Generate new key to force remount
        setIsEditing(true);
    };

    const addRequirement = () => {
        if (newRequirement && (!editedApp.requirements || !editedApp.requirements.includes(newRequirement))) {
            setEditedApp({
                ...editedApp,
                requirements: [...(editedApp.requirements || []), newRequirement]
            });
            setNewRequirement('');
        }
    };

    const removeRequirement = (req) => {
        setEditedApp({
            ...editedApp,
            requirements: (editedApp.requirements || []).filter(r => r !== req)
        });
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'No Deadline';
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const linkifyText = (text) => {
        if (!text) return null;
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = text.split(urlRegex);

        return parts.map((part, index) => {
            if (part.match(urlRegex)) {
                return (
                    <a
                        key={index}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}
                    >
                        {part}
                    </a>
                );
            }
            return part;
        });
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

                {/* Requirements Editing */}
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
                    {editedApp.requirements && editedApp.requirements.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                            {editedApp.requirements.map(req => (
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
                            ✏️
                        </button>
                    </div>
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
                            ⋮⋮
                        </div>
                    )}
                    <div>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{app.university}</h3>
                        <p style={{ color: 'var(--accent-primary)', fontSize: '0.9rem' }}>{app.program}</p>
                        {app.department && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>📚 {app.department}</p>}
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
                                ) : '🌍'}
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
                        ✏️
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
                        &times;
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
                        🔗 Website
                    </a>
                )}
                {app.qsRanking && <span>🏆 QS Rank: #{app.qsRanking}</span>}
            </div>

            {app.requirements && app.requirements.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {app.requirements.map(req => (
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
                        borderColor: statusColors[app.status],
                        color: statusColors[app.status],
                        fontWeight: 600,
                    }}
                >
                    {Object.keys(statusColors).map(status => (
                        <option key={status} value={status}>{status}</option>
                    ))}
                </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Deadline: {formatDate(app.deadline)}
                    </span>
                    {app.deadline && (() => {
                        const days = Math.ceil((new Date(app.deadline) - new Date()) / (1000 * 60 * 60 * 24));
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
                                    🔥 {days === 0 ? 'Due Today!' : `${days} days left`}
                                </span>
                            );
                        }
                        return null;
                    })()}
                </div>
            </div>

            {app.file && (
                <div style={{ marginTop: '0.5rem' }}>
                    <a
                        href={app.file.content}
                        download={app.file.name}
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
                        📎 {app.file.name}
                    </a>
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
                    // Create a synthetic event or just call update directly
                    // We need to call onEdit with the updated app
                    const updatedApp = { ...app, notes: newNotes };
                    onEdit(updatedApp);
                }}
                startEditing={false}
            />
        </div>
    );
};

export default ApplicationCard;
