import React from 'react';
import MarkdownRenderer from './MarkdownRenderer';
import WysiwygEditor from './WysiwygEditor';

const statusColors = {
    'Not Started': 'var(--text-secondary)',
    'In Progress': 'var(--accent-primary)',
    'Submitted': 'var(--accent-secondary)',
    'Interview': 'var(--accent-warning)',
    'Accepted': 'var(--accent-success)',
    'Rejected': 'var(--accent-danger)',
};

const ApplicationCard = ({ app, onDelete, onStatusChange, onEdit }) => {
    const [isEditing, setIsEditing] = React.useState(false);
    const [editedApp, setEditedApp] = React.useState(app);
    const [editKey, setEditKey] = React.useState(Date.now());

    const handleSave = () => {
        onEdit(editedApp);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditedApp(app);
        setIsEditing(false);
    };

    const handleEdit = () => {
        setEditedApp(app);
        setEditKey(Date.now()); // Generate new key to force remount
        setIsEditing(true);
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
                <input
                    value={editedApp.country || ''}
                    onChange={(e) => setEditedApp({ ...editedApp, country: e.target.value })}
                    placeholder="Country"
                />
                <input
                    type="date"
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
                <WysiwygEditor
                    key={editKey}
                    value={editedApp.notes}
                    onChange={(e) => setEditedApp({ ...editedApp, notes: e.target.value })}
                    placeholder="Notes"
                    rows={3}
                />
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button onClick={handleCancel} className="btn-action" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Cancel</button>
                    <button onClick={handleSave} className="btn-action" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderColor: 'var(--accent-success)', color: 'var(--accent-success)' }}>Save</button>
                </div>
            </div>
        );
    }

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
            position: 'relative'
        }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{app.university}</h3>
                    <p style={{ color: 'var(--accent-primary)', fontSize: '0.9rem' }}>{app.program}</p>
                    {app.department && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>📚 {app.department}</p>}
                    {app.country && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>🌍 {app.country}</p>}
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
                <div style={{
                    marginTop: '0.5rem',
                    padding: '0.75rem',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '0.5rem',
                    fontSize: '0.9rem',
                    color: 'var(--text-secondary)',
                    wordBreak: 'break-word'
                }}>
                    <MarkdownRenderer text={app.notes} />
                </div>
            )}
        </div>
    );
};

export default ApplicationCard;
