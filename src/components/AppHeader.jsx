import React from 'react';
import { APP_REPOSITORY_URL } from '@phd-tracker/shared/links';

const AppHeader = ({
    currentUser,
    view,
    onViewChange,
    onOpenSettings,
    onOpenReferees,
    onExport,
    onImport,
    onSignOut
}) => {
    return (
        <div className="header" style={{ textAlign: 'center' }}>
            <h1>PhD Application Tracker</h1>
            <p>Manage your journey to the doctorate.</p>

            <div style={{
                marginTop: '1.5rem',
                display: 'flex',
                gap: '1rem',
                justifyContent: 'center',
                alignItems: 'center',
                flexWrap: 'wrap'
            }}>
                {currentUser && !currentUser.isGuest && (
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginRight: '0.5rem' }}>
                        Signed in as <strong>{currentUser.email}</strong>
                    </span>
                )}
                <button onClick={onOpenSettings} className="btn-action">
                    Settings
                </button>
                <button
                    onClick={() => window.open(APP_REPOSITORY_URL, '_blank', 'noopener,noreferrer')}
                    className="btn-action"
                >
                    GitHub Repo
                </button>
                <button onClick={onExport} className="btn-action">
                    Export Backup
                </button>
                <label className="btn-action">
                    Import Data
                    <input
                        type="file"
                        accept=".json,.csv"
                        onChange={onImport}
                        style={{ display: 'none' }}
                    />
                </label>
                <button onClick={onOpenReferees} className="btn-action">
                    Referees
                </button>
                <button
                    onClick={onSignOut}
                    className="btn-action"
                    style={{ borderColor: '#ef4444', color: '#ef4444' }}
                >
                    Sign Out
                </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
                <button
                    onClick={() => onViewChange('list')}
                    className="btn-action"
                    style={{
                        background: view === 'list' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                        color: view === 'list' ? '#fff' : 'var(--text-secondary)'
                    }}
                >
                    List View
                </button>
                <button
                    onClick={() => onViewChange('calendar')}
                    className="btn-action"
                    style={{
                        background: view === 'calendar' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                        color: view === 'calendar' ? '#fff' : 'var(--text-secondary)'
                    }}
                >
                    Calendar
                </button>
            </div>
        </div>
    );
};

export default AppHeader;
