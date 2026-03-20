import React, { useState, useEffect, useCallback } from 'react';
import { listUpcomingEvents } from '../services/googleCalendar';

const GoogleConnect = ({ onEventsLoaded }) => {
    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [accessToken, setAccessToken] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [hasStoredSession, setHasStoredSession] = useState(false);

    useEffect(() => {
        const initAuth = async () => {
            if (!window.electronAPI?.getGoogleSession) {
                return;
            }

            setLoading(true);
            try {
                const session = await window.electronAPI.getGoogleSession();
                setHasStoredSession(Boolean(session?.hasRefreshToken));
                setShowAdvanced(Boolean(session?.hasCustomCredentials));

                if (session?.hasRefreshToken) {
                    const tokens = await window.electronAPI.refreshGoogle();
                    if (tokens?.access_token) {
                        setAccessToken(tokens.access_token);
                        setIsSignedIn(true);
                    }
                }
            } catch (err) {
                console.error('Token refresh failed', err);
                setError('Stored Google session could not be restored. Please sign in again.');
            } finally {
                setLoading(false);
            }
        };

        initAuth();
    }, []);

    const handleLogin = async () => {
        setLoading(true);
        setError('');

        try {
            const creds = (clientId && clientSecret) ? { clientId, clientSecret } : {};
            const tokens = await window.electronAPI.loginGoogle(creds);

            if (tokens?.access_token) {
                setAccessToken(tokens.access_token);
                setIsSignedIn(true);
                setHasStoredSession(Boolean(tokens.hasRefreshToken));
            }
        } catch (err) {
            console.error('Login failed', err);
            setError('Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await window.electronAPI.logoutGoogle();
        setIsSignedIn(false);
        setAccessToken('');
        setHasStoredSession(false);
        setClientId('');
        setClientSecret('');
        onEventsLoaded([]);
    };

    const fetchEvents = useCallback(async (token) => {
        try {
            const events = await listUpcomingEvents(token);
            const formattedEvents = events.map(event => ({
                id: event.id,
                title: event.summary,
                start: new Date(event.start.dateTime || event.start.date),
                end: new Date(event.end.dateTime || event.end.date),
                allDay: !event.start.dateTime,
                type: 'google',
                resource: event
            }));
            onEventsLoaded(formattedEvents);
            setError('');
        } catch (err) {
            console.error('Error fetching events', err);
            if (err.status === 401 && window.electronAPI?.refreshGoogle) {
                setError('Session expired. Please sign in again.');
            } else {
                setError('Failed to fetch events.');
            }
        }
    }, [onEventsLoaded]);

    useEffect(() => {
        if (!accessToken) {
            return;
        }

        fetchEvents(accessToken);
    }, [accessToken, fetchEvents]);

    if (!isSignedIn && !loading) {
        return (
            <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '0.5rem' }}>
                <h3 style={{ marginTop: 0 }}>Connect Google Calendar</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Sign in to view your upcoming events alongside your deadlines.
                </p>
                {hasStoredSession && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        A stored Google session is available, but it needs a fresh sign-in.
                    </p>
                )}

                {showAdvanced && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                        <input
                            type="text"
                            placeholder="Custom Client ID (Optional)"
                            value={clientId}
                            onChange={(e) => setClientId(e.target.value)}
                        />
                        <input
                            type="password"
                            placeholder="Custom Client Secret (Optional)"
                            value={clientSecret}
                            onChange={(e) => setClientSecret(e.target.value)}
                        />
                    </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button onClick={handleLogin} className="btn-action" disabled={loading}>
                        {loading ? 'Connecting...' : 'Sign In with Google'}
                    </button>
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}
                    >
                        {showAdvanced ? 'Hide Advanced' : 'Advanced Settings'}
                    </button>
                </div>
                {error && <p style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', marginTop: '0.5rem' }}>{error}</p>}
            </div>
        );
    }

    return (
        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '0.5rem' }}>
            <span style={{ color: 'var(--accent-success)' }}>Connected to Google Calendar</span>
            <button onClick={handleLogout} className="btn-action" style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}>
                Sign Out
            </button>
            <button
                onClick={() => fetchEvents(accessToken)}
                className="btn-action"
                style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', background: 'var(--bg-primary)' }}
            >
                Refresh
            </button>
        </div>
    );
};

export default GoogleConnect;
