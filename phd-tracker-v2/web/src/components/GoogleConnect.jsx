import React, { useState, useEffect } from 'react';
import { listUpcomingEvents } from '../services/googleCalendar';

const GoogleConnect = ({ onEventsLoaded }) => {
    const [clientId, setClientId] = useState(() => localStorage.getItem('google-client-id') || '');
    const [clientSecret, setClientSecret] = useState(() => localStorage.getItem('google-client-secret') || '');
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [accessToken, setAccessToken] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('google-refresh-token') || '');

    useEffect(() => {
        const initAuth = async () => {
            if (accessToken) {
                fetchEvents(accessToken);
            } else if (refreshToken) {
                // Try to refresh the token
                setLoading(true);
                try {
                    const tokens = await window.electronAPI.refreshGoogle({ refreshToken, clientId, clientSecret });
                    if (tokens && tokens.access_token) {
                        setAccessToken(tokens.access_token);
                        setIsSignedIn(true);
                        fetchEvents(tokens.access_token);
                    } else {
                        // Refresh failed, clear tokens
                        handleClearCredentials();
                    }
                } catch (err) {
                    console.error("Token refresh failed", err);
                    // Don't clear immediately, maybe network error? 
                    // But if it's invalid grant, we should. For now, let's just show error.
                    // Actually, if refresh fails, we probably need to login again.
                    // handleClearCredentials(); 
                } finally {
                    setLoading(false);
                }
            }
        };
        initAuth();
    }, []); // Run once on mount

    const handleLogin = async () => {
        setLoading(true);
        setError('');

        try {
            // Call the main process to handle the OAuth flow
            // Passing empty object to use defaults in main.js, or custom ones if entered
            const creds = (clientId && clientSecret) ? { clientId, clientSecret } : {};
            const tokens = await window.electronAPI.loginGoogle(creds);

            if (tokens && tokens.access_token) {
                setAccessToken(tokens.access_token);
                setIsSignedIn(true);

                if (tokens.refresh_token) {
                    setRefreshToken(tokens.refresh_token);
                    localStorage.setItem('google-refresh-token', tokens.refresh_token);
                }

                // Only save if custom credentials were used
                if (clientId && clientSecret) {
                    localStorage.setItem('google-client-id', clientId);
                    localStorage.setItem('google-client-secret', clientSecret);
                }

                // Fetch events immediately after login
                fetchEvents(tokens.access_token);
            }
        } catch (err) {
            console.error("Login failed", err);
            setError('Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await window.electronAPI.logoutGoogle();
        setIsSignedIn(false);
        setAccessToken('');
        setRefreshToken('');
        localStorage.removeItem('google-refresh-token');
        onEventsLoaded([]);
    };

    const fetchEvents = async (token) => {
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
        } catch (err) {
            console.error("Error fetching events", err);
            if (err.status === 401 && refreshToken) {
                // Token might be expired, try refresh?
                // For simplicity, just show error for now, the initAuth handles initial load.
                setError('Session expired. Please refresh or sign in again.');
            } else {
                setError('Failed to fetch events.');
            }
        }
    };

    const handleClearCredentials = () => {
        localStorage.removeItem('google-client-id');
        localStorage.removeItem('google-client-secret');
        localStorage.removeItem('google-refresh-token');
        setClientId('');
        setClientSecret('');
        setRefreshToken('');
        handleLogout();
    };

    if (!isSignedIn && !loading) { // Don't show login form if loading (refreshing)
        return (
            <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '0.5rem' }}>
                <h3 style={{ marginTop: 0 }}>Connect Google Calendar</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Sign in to view your upcoming events alongside your deadlines.
                </p>

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
            <span style={{ color: 'var(--accent-success)' }}>● Connected to Google Calendar</span>
            <button onClick={handleLogout} className="btn-action" style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}>
                Sign Out
            </button>
            <button
                onClick={() => fetchEvents(accessToken)}
                className="btn-action"
                style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', background: 'var(--bg-primary)' }}
            >
                🔄 Refresh
            </button>
        </div>
    );
};

export default GoogleConnect;
