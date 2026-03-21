import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    getGoogleCalendarAuthUrl,
    getGoogleCalendarConnectionStatus,
    listBackendGoogleCalendarEvents
} from '../services/googleCalendarBackend';

const panelStyle = {
    marginBottom: '1rem',
    padding: '1rem',
    background: 'var(--bg-secondary)',
    borderRadius: '0.5rem'
};

const AUTO_REFRESH_MS = 10 * 60 * 1000;
const FOCUS_REFRESH_DEBOUNCE_MS = 60 * 1000;

const formatGoogleEvents = (events) => {
    return events.map((event) => ({
        id: event.id,
        title: event.summary,
        start: new Date(event.start?.dateTime || event.start?.date),
        end: new Date(event.end?.dateTime || event.end?.date),
        allDay: !event.start?.dateTime,
        type: 'google',
        resource: event
    }));
};

const GoogleConnect = ({ onEventsLoaded }) => {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [isPolling, setIsPolling] = useState(false);
    const [lastSyncedAt, setLastSyncedAt] = useState(null);
    const lastRefreshRef = useRef(0);

    const markRefreshTime = () => {
        lastRefreshRef.current = Date.now();
    };

    const formatLastSyncedAt = (timestamp) => {
        if (!timestamp) {
            return '';
        }

        return new Date(timestamp).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    const loadCalendarEvents = useCallback(async () => {
        try {
            const items = await listBackendGoogleCalendarEvents();
            onEventsLoaded(formatGoogleEvents(items));
            setIsConnected(true);
            setError('');
            setLastSyncedAt(Date.now());
            markRefreshTime();
            return true;
        } catch (err) {
            onEventsLoaded([]);
            setIsConnected(true);

            const message = err?.message || '';
            const code = err?.code || '';
            if (code.includes('403') || message.includes('Google Calendar API is not enabled')) {
                setError('Google Calendar is connected, but the Google Calendar API is not enabled in Google Cloud yet.');
            } else if (code.includes('failed-precondition')) {
                setError('Google Calendar is connected, but needs to be reconnected to load events.');
            } else {
                setError('Google Calendar is connected, but events could not be loaded right now.');
            }
            return false;
        }
    }, [onEventsLoaded]);

    const refreshConnectionState = useCallback(async () => {
        try {
            const status = await getGoogleCalendarConnectionStatus();
            if (status?.connected) {
                await loadCalendarEvents();
                return true;
            }
            onEventsLoaded([]);
            setIsConnected(false);
            return false;
        } catch (err) {
            onEventsLoaded([]);
            setIsConnected(false);

            const code = err?.code || '';
            if (code.includes('not-found') || code.includes('unimplemented')) {
                setError('Backend Google Calendar auth is not deployed yet.');
            } else if (code.includes('unauthenticated')) {
                setError('Sign in with Google to connect your Calendar.');
            } else {
                setError('Google Calendar is not connected yet.');
            }
            return false;
        }
    }, [loadCalendarEvents, onEventsLoaded]);

    const handleRefreshCalendar = useCallback(async () => {
        setLoading(true);
        try {
            await refreshConnectionState();
        } finally {
            setLoading(false);
        }
    }, [refreshConnectionState]);

    useEffect(() => {
        if (!currentUser || currentUser.isGuest) {
            onEventsLoaded([]);
            setIsConnected(false);
            setError('');
            return;
        }

        refreshConnectionState();
    }, [currentUser, onEventsLoaded, refreshConnectionState]);

    useEffect(() => {
        if (!isPolling) {
            return undefined;
        }

        let attempts = 0;
        let isCancelled = false;
        const intervalId = window.setInterval(async () => {
            attempts += 1;
            const connected = await refreshConnectionState();
            if (isCancelled) {
                return;
            }
            if (connected || attempts >= 30) {
                window.clearInterval(intervalId);
                setIsPolling(false);
                setLoading(false);
                if (!connected) {
                    setError(prev => prev || 'Calendar connection is still pending. Finish the Google consent flow, then try again.');
                }
            }
        }, 2000);

        return () => {
            isCancelled = true;
            window.clearInterval(intervalId);
        };
    }, [isPolling, refreshConnectionState]);

    useEffect(() => {
        const handleFocus = () => {
            if (!currentUser || currentUser.isGuest) {
                return;
            }

            if (Date.now() - lastRefreshRef.current < FOCUS_REFRESH_DEBOUNCE_MS) {
                return;
            }

            refreshConnectionState();
        };

        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [currentUser, refreshConnectionState]);

    useEffect(() => {
        if (!currentUser || currentUser.isGuest || !isConnected) {
            return undefined;
        }

        const intervalId = window.setInterval(() => {
            refreshConnectionState();
        }, AUTO_REFRESH_MS);

        return () => window.clearInterval(intervalId);
    }, [currentUser, isConnected, refreshConnectionState]);

    const handleConnectCalendar = async () => {
        setLoading(true);
        setError('');

        try {
            const authUrl = await getGoogleCalendarAuthUrl();
            if (!authUrl) {
                throw new Error('No Calendar auth URL returned.');
            }

            if (window.electronAPI?.openExternal) {
                await window.electronAPI.openExternal(authUrl);
            } else {
                window.open(authUrl, '_blank', 'noopener,noreferrer');
            }
            setIsPolling(true);
        } catch (err) {
            console.error('Backend Google Calendar connect failed', err);
            setLoading(false);

            const code = err?.code || '';
            if (code.includes('unimplemented') || code.includes('not-found')) {
                setError('Backend Google Calendar auth is not deployed yet.');
            } else if (code.includes('unauthenticated')) {
                setError('Sign in with Google before connecting Calendar.');
            } else {
                setError('Failed to start Google Calendar connection.');
            }
        }
    };

    const isGoogleUser = currentUser?.providerData?.some(
        (provider) => provider?.providerId === 'google.com'
    );

    if (!currentUser || currentUser.isGuest) {
        return (
            <div style={panelStyle}>
                <h3 style={{ marginTop: 0 }}>Google Calendar</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 0 }}>
                    Sign in with Google to view Calendar events alongside your application deadlines.
                </p>
            </div>
        );
    }

    if (!isGoogleUser) {
        return (
            <div style={panelStyle}>
                <h3 style={{ marginTop: 0 }}>Google Calendar</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 0 }}>
                    Calendar sync will be available after you use Google sign-in on the home screen.
                </p>
            </div>
        );
    }

    return (
        <div style={{ ...panelStyle, display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ color: isConnected ? 'var(--accent-success)' : 'var(--text-secondary)' }}>
                    {isConnected ? 'Google Calendar connected' : 'Google Calendar is not connected'}
                </span>
                {isConnected && lastSyncedAt && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Last synced at {formatLastSyncedAt(lastSyncedAt)}
                    </span>
                )}
            </div>
            <button
                onClick={handleConnectCalendar}
                className="btn-action"
                disabled={loading}
                style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
            >
                {loading ? (isPolling ? 'Waiting for Google...' : 'Connecting...') : isConnected ? 'Reconnect Google Calendar' : 'Connect Google Calendar'}
            </button>
            {isConnected && (
                <button
                    onClick={handleRefreshCalendar}
                    className="btn-action"
                    disabled={loading}
                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                >
                    {loading ? 'Refreshing...' : 'Refresh Calendar'}
                </button>
            )}
            {error && <span style={{ color: 'var(--accent-danger)', fontSize: '0.8rem' }}>{error}</span>}
        </div>
    );
};

export default GoogleConnect;
