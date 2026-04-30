import React from 'react';
import {
    Settings,
    ExternalLink,
    Download,
    Upload,
    Users,
    LogOut,
    List,
    Calendar
} from 'lucide-react';
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
        <header className="app-header">
            <div>
                <h1 className="app-header__title">PhD Application Tracker</h1>
                <p className="app-header__subtitle">Manage your journey to the doctorate.</p>
            </div>

            {currentUser && !currentUser.isGuest && (
                <span className="app-header__signed-in">
                    Signed in as <strong>{currentUser.email}</strong>
                </span>
            )}

            <nav className="app-header__actions" aria-label="App actions">
                <button onClick={onOpenSettings} className="btn-action" type="button">
                    <Settings size={16} aria-hidden="true" />
                    <span>Settings</span>
                </button>
                <button
                    onClick={() => window.open(APP_REPOSITORY_URL, '_blank', 'noopener,noreferrer')}
                    className="btn-action"
                    type="button"
                >
                    <ExternalLink size={16} aria-hidden="true" />
                    <span>GitHub</span>
                </button>
                <button onClick={onExport} className="btn-action" type="button">
                    <Download size={16} aria-hidden="true" />
                    <span>Export</span>
                </button>
                <label className="btn-action" tabIndex={0}>
                    <Upload size={16} aria-hidden="true" />
                    <span>Import</span>
                    <input
                        type="file"
                        accept=".json,.csv"
                        onChange={onImport}
                        style={{ display: 'none' }}
                    />
                </label>
                <button onClick={onOpenReferees} className="btn-action" type="button">
                    <Users size={16} aria-hidden="true" />
                    <span>Referees</span>
                </button>
                <button onClick={onSignOut} className="btn-danger" type="button">
                    <LogOut size={16} aria-hidden="true" />
                    <span>Sign out</span>
                </button>
            </nav>

            <div className="app-header__view-toggle" role="tablist" aria-label="View">
                <button
                    role="tab"
                    type="button"
                    onClick={() => onViewChange('list')}
                    className="btn-segment"
                    aria-pressed={view === 'list'}
                    aria-selected={view === 'list'}
                >
                    <List size={16} aria-hidden="true" />
                    <span>List</span>
                </button>
                <button
                    role="tab"
                    type="button"
                    onClick={() => onViewChange('calendar')}
                    className="btn-segment"
                    aria-pressed={view === 'calendar'}
                    aria-selected={view === 'calendar'}
                >
                    <Calendar size={16} aria-hidden="true" />
                    <span>Calendar</span>
                </button>
            </div>
        </header>
    );
};

export default AppHeader;
