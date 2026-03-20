import React, { useState } from 'react';
import '../styles/Modal.css';

export default function ConflictResolutionModal({ isOpen, onClose, guestApps, onResolve }) {
    if (!isOpen) return null;

    const [resolutions, setResolutions] = useState({}); // { [appId]: 'auto' | 'manual' | 'skip' }
    const [manualNames, setManualNames] = useState({}); // { [appId]: 'New Name' }

    const handleResolutionChange = (appId, resolution) => {
        setResolutions(prev => ({ ...prev, [appId]: resolution }));
    };

    const handleManualNameChange = (appId, name) => {
        setManualNames(prev => ({ ...prev, [appId]: name }));
    };

    const handleConfirm = () => {
        const resolvedApps = guestApps.map(app => {
            const resolution = resolutions[app.id] || 'auto';
            if (resolution === 'skip') return null;

            let newApp = { ...app };
            // We strip the ID so Firestore generates a new one to avoid ID collisions
            // or we could keep it if we knew it was unique. Safe bet is new ID.
            // But DataService batchAdd will handle new IDs.
            // Here we just modify properties.

            if (resolution === 'auto') {
                newApp.university = `${newApp.university} (Local)`;
            } else if (resolution === 'manual') {
                newApp.university = manualNames[app.id] || `${newApp.university} (Renamed)`;
            }
            return newApp;
        }).filter(Boolean);

        onResolve(resolvedApps);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '600px' }}>
                <div className="modal-header">
                    <h2>Sync Local Data</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <p>You have applications saved locally. How would you like to merge them with your cloud account?</p>

                    <div style={{ maxHeight: '300px', overflowY: 'auto', margin: '1rem 0' }}>
                        {guestApps.map(app => (
                            <div key={app.id} style={{
                                background: 'var(--bg-secondary)',
                                padding: '1rem',
                                marginBottom: '0.5rem',
                                borderRadius: '0.5rem',
                                border: '1px solid var(--border-color)'
                            }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{app.university} - {app.program}</div>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem' }}>
                                        <input
                                            type="radio"
                                            name={`res-${app.id}`}
                                            checked={!resolutions[app.id] || resolutions[app.id] === 'auto'}
                                            onChange={() => handleResolutionChange(app.id, 'auto')}
                                        />
                                        Rename Auto (Add "Local")
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem' }}>
                                        <input
                                            type="radio"
                                            name={`res-${app.id}`}
                                            checked={resolutions[app.id] === 'manual'}
                                            onChange={() => handleResolutionChange(app.id, 'manual')}
                                        />
                                        Rename Manually
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem' }}>
                                        <input
                                            type="radio"
                                            name={`res-${app.id}`}
                                            checked={resolutions[app.id] === 'skip'}
                                            onChange={() => handleResolutionChange(app.id, 'skip')}
                                        />
                                        Skip (Don't Sync)
                                    </label>
                                </div>
                                {resolutions[app.id] === 'manual' && (
                                    <input
                                        type="text"
                                        placeholder="Enter new university name"
                                        value={manualNames[app.id] || ''}
                                        onChange={(e) => handleManualNameChange(app.id, e.target.value)}
                                        style={{
                                            marginTop: '0.5rem',
                                            padding: '0.5rem',
                                            width: '100%',
                                            borderRadius: '0.25rem',
                                            border: '1px solid var(--border-color)',
                                            background: 'var(--bg-primary)',
                                            color: '#fff'
                                        }}
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                        <button className="btn-action" onClick={onClose} style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }}>
                            Keep Separate (Don't Merge)
                        </button>
                        <button className="btn-primary" onClick={handleConfirm}>
                            Merge Selected
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
