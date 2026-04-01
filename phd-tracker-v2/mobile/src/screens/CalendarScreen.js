import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    AppState,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { compareApplicationsByDeadline } from '@phd-tracker/shared/applications';
import { formatDeadlineDate } from '@phd-tracker/shared/dates';
import { getStatusColor } from '@phd-tracker/shared/statuses';
import { useAuth } from '../context/AuthContext';
import { MobileDataService } from '../services/MobileDataService';
import {
    getGoogleCalendarAuthUrl,
    getGoogleCalendarConnectionStatus,
    listBackendGoogleCalendarEvents
} from '../services/googleCalendarBackend';

const AUTO_REFRESH_MS = 10 * 60 * 1000;
const FOCUS_REFRESH_DEBOUNCE_MS = 60 * 1000;
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const toDate = (value) => {
    if (!value) {
        return null;
    }

    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split('-').map(Number);
        return new Date(year, month - 1, day);
    }

    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const getMonthStart = (value) => {
    const date = toDate(value) || new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
};

const addMonths = (value, amount) => {
    const date = getMonthStart(value);
    return new Date(date.getFullYear(), date.getMonth() + amount, 1);
};

const getDateKey = (value) => {
    const date = toDate(value);
    if (!date) {
        return '';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const isSameMonth = (left, right) => {
    const leftDate = toDate(left);
    const rightDate = toDate(right);
    if (!leftDate || !rightDate) {
        return false;
    }

    return leftDate.getFullYear() === rightDate.getFullYear() && leftDate.getMonth() === rightDate.getMonth();
};

const isToday = (value) => getDateKey(value) === getDateKey(new Date());

const buildMonthCells = (value) => {
    const monthStart = getMonthStart(value);
    const firstVisibleDate = new Date(monthStart);
    firstVisibleDate.setDate(monthStart.getDate() - monthStart.getDay());

    return Array.from({ length: 42 }, (_, index) => {
        const date = new Date(firstVisibleDate);
        date.setDate(firstVisibleDate.getDate() + index);
        return {
            date,
            dateKey: getDateKey(date),
            inMonth: isSameMonth(date, monthStart)
        };
    });
};

const formatGoogleEvents = (events) => {
    return events
        .map((event) => {
            const start = toDate(event.start?.dateTime || event.start?.date);
            const end = toDate(event.end?.dateTime || event.end?.date);
            if (!start) {
                return null;
            }

            return {
                id: `google-${event.id}`,
                googleEventId: event.id,
                title: event.summary || 'Untitled event',
                start,
                end,
                allDay: !event.start?.dateTime,
                htmlLink: event.htmlLink,
                type: 'google'
            };
        })
        .filter(Boolean);
};

const getItemDate = (item) => {
    if (item.type === 'google') {
        return item.start;
    }

    return toDate(item.deadline);
};

const buildCalendarItems = (applications, googleEvents) => {
    const datedApplications = applications
        .filter((app) => Boolean(app.deadline))
        .map((app) => ({ ...app, type: 'application' }));

    return [...datedApplications, ...googleEvents]
        .filter((item) => Boolean(getItemDate(item)))
        .sort((left, right) => {
            if (left.type === 'application' && right.type === 'application') {
                return compareApplicationsByDeadline(left, right, 'asc');
            }

            return getItemDate(left).getTime() - getItemDate(right).getTime();
        });
};

const groupItemsByDate = (items) => {
    return items.reduce((accumulator, item) => {
        const dateKey = getDateKey(getItemDate(item));
        if (!dateKey) {
            return accumulator;
        }

        if (!accumulator[dateKey]) {
            accumulator[dateKey] = [];
        }

        accumulator[dateKey].push(item);
        return accumulator;
    }, {});
};

const formatGoogleEventSubtitle = (event) => {
    if (event.allDay) {
        return 'All day';
    }

    const start = toDate(event.start);
    const end = toDate(event.end);
    if (!start) {
        return 'Google Calendar event';
    }

    const startLabel = start.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit'
    });

    if (!end) {
        return startLabel;
    }

    const endLabel = end.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit'
    });

    return `${startLabel} - ${endLabel}`;
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

const findPreferredVisibleDate = (items) => {
    if (!items.length) {
        return new Date();
    }

    const today = getDateKey(new Date());
    const upcomingItem = items.find((item) => getDateKey(getItemDate(item)) >= today);
    return getItemDate(upcomingItem || items[0]) || new Date();
};

const getPreferredDateForMonth = (month, itemsByDate) => {
    const monthStart = getMonthStart(month);
    const monthEnd = addMonths(monthStart, 1);
    const keysInMonth = Object.keys(itemsByDate)
        .filter((key) => {
            const date = toDate(key);
            return date && date >= monthStart && date < monthEnd;
        })
        .sort();

    if (keysInMonth.length > 0) {
        return keysInMonth[0];
    }

    if (isSameMonth(new Date(), monthStart)) {
        return getDateKey(new Date());
    }

    return getDateKey(monthStart);
};

export default function CalendarScreen({ navigation }) {
    const { user } = useAuth();
    const isFocused = useIsFocused();
    const [applications, setApplications] = useState([]);
    const [googleEvents, setGoogleEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [calendarLoading, setCalendarLoading] = useState(false);
    const [error, setError] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [isPolling, setIsPolling] = useState(false);
    const [lastSyncedAt, setLastSyncedAt] = useState(null);
    const [visibleMonth, setVisibleMonth] = useState(getMonthStart(new Date()));
    const [selectedDateKey, setSelectedDateKey] = useState(getDateKey(new Date()));
    const lastRefreshRef = useRef(0);
    const preferredMonthInitializedRef = useRef(false);

    const isGoogleUser = user?.providerData?.some(
        (provider) => provider?.providerId === 'google.com'
    );

    const markRefreshTime = () => {
        lastRefreshRef.current = Date.now();
    };

    const loadCalendarEvents = useCallback(async () => {
        try {
            const items = await listBackendGoogleCalendarEvents();
            setGoogleEvents(formatGoogleEvents(items));
            setIsConnected(true);
            setError('');
            setLastSyncedAt(Date.now());
            markRefreshTime();
            return true;
        } catch (err) {
            setGoogleEvents([]);
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
    }, []);

    const refreshConnectionState = useCallback(async () => {
        if (!user || user.isGuest || !isGoogleUser) {
            setGoogleEvents([]);
            setIsConnected(false);
            setError('');
            return false;
        }

        try {
            const status = await getGoogleCalendarConnectionStatus();
            if (status?.connected) {
                return loadCalendarEvents();
            }

            setGoogleEvents([]);
            setIsConnected(false);
            setError('');
            return false;
        } catch (err) {
            setGoogleEvents([]);
            setIsConnected(false);

            const code = err?.code || '';
            if (code.includes('not-found') || code.includes('unimplemented')) {
                setError('Backend Google Calendar auth is not deployed yet.');
            } else if (code.includes('unauthenticated')) {
                setError('Sign in with Google before connecting Calendar.');
            } else {
                setError('Google Calendar is not connected yet.');
            }

            return false;
        }
    }, [isGoogleUser, loadCalendarEvents, user]);

    useEffect(() => {
        if (!user) {
            setApplications([]);
            setGoogleEvents([]);
            setLoading(false);
            return undefined;
        }

        setLoading(true);
        const unsubscribe = MobileDataService.subscribeToApplications(user, (apps) => {
            setApplications(apps);
            setLoading(false);
        });

        return () => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        };
    }, [user]);

    useEffect(() => {
        if (!user || user.isGuest || !isGoogleUser) {
            setGoogleEvents([]);
            setIsConnected(false);
            setError('');
            setCalendarLoading(false);
            setIsPolling(false);
            return;
        }

        refreshConnectionState();
    }, [isGoogleUser, refreshConnectionState, user]);

    useEffect(() => {
        if (!isPolling) {
            return undefined;
        }

        let attempts = 0;
        let cancelled = false;
        const intervalId = setInterval(async () => {
            attempts += 1;
            const connected = await refreshConnectionState();
            if (cancelled) {
                return;
            }

            if (connected || attempts >= 30) {
                clearInterval(intervalId);
                setIsPolling(false);
                setCalendarLoading(false);
                if (!connected) {
                    setError((previousError) => previousError || 'Calendar connection is still pending. Finish the Google consent flow, then try again.');
                }
            }
        }, 2000);

        return () => {
            cancelled = true;
            clearInterval(intervalId);
        };
    }, [isPolling, refreshConnectionState]);

    useFocusEffect(
        useCallback(() => {
            if (!user || user.isGuest || !isGoogleUser) {
                return undefined;
            }

            if (Date.now() - lastRefreshRef.current >= FOCUS_REFRESH_DEBOUNCE_MS) {
                refreshConnectionState();
            }

            return undefined;
        }, [isGoogleUser, refreshConnectionState, user])
    );

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextState) => {
            if (nextState !== 'active' || !user || user.isGuest || !isGoogleUser) {
                return;
            }

            if (isPolling) {
                refreshConnectionState().then((connected) => {
                    if (connected) {
                        setIsPolling(false);
                        setCalendarLoading(false);
                    }
                });
                return;
            }

            if (Date.now() - lastRefreshRef.current < FOCUS_REFRESH_DEBOUNCE_MS) {
                return;
            }

            refreshConnectionState();
        });

        return () => subscription.remove();
    }, [isGoogleUser, isPolling, refreshConnectionState, user]);

    useEffect(() => {
        if (!isFocused || !user || user.isGuest || !isGoogleUser || !isConnected) {
            return undefined;
        }

        const intervalId = setInterval(() => {
            refreshConnectionState();
        }, AUTO_REFRESH_MS);

        return () => clearInterval(intervalId);
    }, [isConnected, isFocused, isGoogleUser, refreshConnectionState, user]);

    const handleConnectCalendar = async () => {
        setCalendarLoading(true);
        setError('');

        try {
            const authUrl = await getGoogleCalendarAuthUrl();
            if (!authUrl) {
                throw new Error('No Calendar auth URL returned.');
            }

            await Linking.openURL(authUrl);
            setIsPolling(true);
        } catch (err) {
            console.error('Mobile Google Calendar connect failed', err);
            setCalendarLoading(false);

            const code = err?.code || '';
            if (code.includes('not-found') || code.includes('unimplemented')) {
                setError('Backend Google Calendar auth is not deployed yet.');
            } else if (code.includes('unauthenticated')) {
                setError('Sign in with Google before connecting Calendar.');
            } else {
                setError('Failed to start Google Calendar connection.');
            }
        }
    };

    const handleRefreshCalendar = async () => {
        setCalendarLoading(true);
        try {
            await refreshConnectionState();
        } finally {
            setCalendarLoading(false);
        }
    };

    const handleOpenGoogleEvent = async (url) => {
        if (!url) {
            return;
        }

        try {
            await Linking.openURL(url);
        } catch {
            setError('Could not open that Google Calendar event.');
        }
    };

    const calendarItems = useMemo(
        () => buildCalendarItems(applications, googleEvents),
        [applications, googleEvents]
    );

    const itemsByDate = useMemo(
        () => groupItemsByDate(calendarItems),
        [calendarItems]
    );

    useEffect(() => {
        if (preferredMonthInitializedRef.current || !calendarItems.length) {
            return;
        }

        const preferredDate = findPreferredVisibleDate(calendarItems);
        const preferredMonth = getMonthStart(preferredDate);
        setVisibleMonth(preferredMonth);
        setSelectedDateKey(getDateKey(preferredDate));
        preferredMonthInitializedRef.current = true;
    }, [calendarItems]);

    const monthCells = useMemo(
        () => buildMonthCells(visibleMonth),
        [visibleMonth]
    );

    const selectedDayItems = itemsByDate[selectedDateKey] || [];
    const selectedDateLabel = toDate(selectedDateKey)?.toLocaleDateString([], {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });

    const selectMonth = useCallback((month) => {
        const nextMonth = getMonthStart(month);
        setVisibleMonth(nextMonth);
        setSelectedDateKey(getPreferredDateForMonth(nextMonth, itemsByDate));
    }, [itemsByDate]);

    const handlePreviousMonth = () => {
        selectMonth(addMonths(visibleMonth, -1));
    };

    const handleNextMonth = () => {
        selectMonth(addMonths(visibleMonth, 1));
    };

    const handleToday = () => {
        const today = new Date();
        setVisibleMonth(getMonthStart(today));
        setSelectedDateKey(getDateKey(today));
    };

    const renderAgendaItem = (item) => {
        const isApplication = item.type === 'application';
        const title = isApplication ? item.university : item.title;
        const subtitle = isApplication ? item.program : formatGoogleEventSubtitle(item);
        const footer = isApplication
            ? `Deadline ${formatDeadlineDate(item.deadline, 'None')}`
            : item.allDay
                ? 'Google Calendar event'
                : 'Google Calendar event, tap to open';

        const Wrapper = isApplication || item.htmlLink ? TouchableOpacity : View;
        const wrapperProps = isApplication
            ? { onPress: () => navigation.navigate('Details', { applicationId: item.id }) }
            : item.htmlLink
                ? { onPress: () => handleOpenGoogleEvent(item.htmlLink) }
                : {};

        return (
            <Wrapper key={item.id} style={styles.agendaItem} {...wrapperProps}>
                <View style={styles.agendaHeader}>
                    <Text style={styles.agendaTitle} numberOfLines={1}>
                        {title}
                    </Text>

                    {isApplication ? (
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                            <Text style={styles.statusText}>{item.status}</Text>
                        </View>
                    ) : (
                        <View style={[styles.statusBadge, styles.googleBadge]}>
                            <Text style={styles.statusText}>Google</Text>
                        </View>
                    )}
                </View>

                <Text style={styles.agendaSubtitle}>{subtitle}</Text>
                <Text style={styles.agendaFooter}>{footer}</Text>
            </Wrapper>
        );
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.connectionPanel}>
                {!user || user.isGuest ? (
                    <>
                        <Text style={styles.connectionText}>Google Calendar</Text>
                        <Text style={styles.helperText}>
                            Sign in with Google on the home screen to see Calendar events alongside your application deadlines.
                        </Text>
                    </>
                ) : !isGoogleUser ? (
                    <>
                        <Text style={styles.connectionText}>Google Calendar</Text>
                        <Text style={styles.helperText}>
                            Calendar sync is available after you use Google sign-in on the home screen.
                        </Text>
                    </>
                ) : (
                    <>
                        <View style={styles.connectionHeader}>
                            <View style={styles.connectionCopy}>
                                <Text style={[styles.connectionText, isConnected && styles.connectedText]}>
                                    {isConnected ? 'Google Calendar connected' : 'Google Calendar is not connected'}
                                </Text>
                                {isConnected && lastSyncedAt ? (
                                    <Text style={styles.helperText}>
                                        Last synced at {formatLastSyncedAt(lastSyncedAt)}
                                    </Text>
                                ) : (
                                    <Text style={styles.helperText}>
                                        Google events appear on the month grid alongside your application deadlines.
                                    </Text>
                                )}
                            </View>

                            <View style={styles.connectionActions}>
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={handleConnectCalendar}
                                    disabled={calendarLoading}
                                >
                                    <Text style={styles.actionButtonText}>
                                        {calendarLoading
                                            ? (isPolling ? 'Waiting for Google...' : 'Connecting...')
                                            : isConnected
                                                ? 'Reconnect Google Calendar'
                                                : 'Connect Google Calendar'}
                                    </Text>
                                </TouchableOpacity>

                                {isConnected ? (
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.secondaryActionButton]}
                                        onPress={handleRefreshCalendar}
                                        disabled={calendarLoading}
                                    >
                                        <Text style={styles.actionButtonText}>
                                            {calendarLoading ? 'Refreshing...' : 'Refresh Calendar'}
                                        </Text>
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        </View>

                        {error ? <Text style={styles.errorText}>{error}</Text> : null}
                    </>
                )}
            </View>

            <View style={styles.calendarCard}>
                <View style={styles.monthHeader}>
                    <TouchableOpacity style={styles.monthNavButton} onPress={handlePreviousMonth}>
                        <Text style={styles.monthNavButtonText}>Prev</Text>
                    </TouchableOpacity>

                    <View style={styles.monthHeaderCenter}>
                        <Text style={styles.monthLabel}>
                            {visibleMonth.toLocaleDateString([], {
                                month: 'long',
                                year: 'numeric'
                            })}
                        </Text>
                        <TouchableOpacity onPress={handleToday}>
                            <Text style={styles.todayLink}>Jump to today</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.monthNavButton} onPress={handleNextMonth}>
                        <Text style={styles.monthNavButtonText}>Next</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.weekHeaderRow}>
                    {WEEKDAY_LABELS.map((label) => (
                        <Text key={label} style={styles.weekHeaderText}>
                            {label}
                        </Text>
                    ))}
                </View>

                <View style={styles.grid}>
                    {monthCells.map((cell) => {
                        const dayItems = itemsByDate[cell.dateKey] || [];
                        const applicationCount = dayItems.filter((item) => item.type === 'application').length;
                        const googleCount = dayItems.filter((item) => item.type === 'google').length;
                        const isSelected = selectedDateKey === cell.dateKey;

                        return (
                            <TouchableOpacity
                                key={cell.dateKey}
                                style={[
                                    styles.dayCell,
                                    !cell.inMonth && styles.dayCellOutsideMonth,
                                    isSelected && styles.dayCellSelected,
                                    isToday(cell.date) && styles.dayCellToday
                                ]}
                                onPress={() => setSelectedDateKey(cell.dateKey)}
                            >
                                <Text
                                    style={[
                                        styles.dayNumber,
                                        !cell.inMonth && styles.dayNumberOutsideMonth,
                                        isSelected && styles.dayNumberSelected
                                    ]}
                                >
                                    {cell.date.getDate()}
                                </Text>

                                {dayItems.length > 0 ? (
                                    <View style={styles.dayIndicators}>
                                        {applicationCount > 0 ? <View style={styles.applicationDot} /> : null}
                                        {googleCount > 0 ? <View style={styles.googleDot} /> : null}
                                        <Text style={styles.dayCountText}>{dayItems.length}</Text>
                                    </View>
                                ) : null}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            <View style={styles.agendaSection}>
                <Text style={styles.agendaSectionTitle}>
                    {selectedDateLabel || 'Selected day'}
                </Text>

                {selectedDayItems.length === 0 ? (
                    <Text style={styles.emptyText}>No application deadlines or Google Calendar events for this day.</Text>
                ) : (
                    selectedDayItems.map(renderAgendaItem)
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    content: {
        padding: 16,
        paddingBottom: 32,
    },
    centered: {
        flex: 1,
        backgroundColor: '#0f172a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    connectionPanel: {
        marginBottom: 16,
        padding: 16,
        borderRadius: 14,
        backgroundColor: '#1e293b',
        borderWidth: 1,
        borderColor: '#334155',
        gap: 10,
    },
    connectionHeader: {
        gap: 12,
    },
    connectionCopy: {
        gap: 4,
    },
    connectionText: {
        color: '#cbd5e1',
        fontSize: 18,
        fontWeight: '700',
    },
    connectedText: {
        color: '#4ade80',
    },
    helperText: {
        color: '#94a3b8',
        fontSize: 13,
        lineHeight: 18,
    },
    connectionActions: {
        gap: 10,
    },
    actionButton: {
        backgroundColor: '#3b82f6',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    secondaryActionButton: {
        backgroundColor: '#334155',
    },
    actionButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    errorText: {
        color: '#f87171',
        fontSize: 13,
        lineHeight: 18,
    },
    calendarCard: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#334155',
        padding: 14,
    },
    monthHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
        gap: 10,
    },
    monthHeaderCenter: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    monthLabel: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '700',
    },
    todayLink: {
        color: '#60a5fa',
        fontSize: 13,
        fontWeight: '600',
    },
    monthNavButton: {
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    monthNavButtonText: {
        color: '#cbd5e1',
        fontWeight: '600',
    },
    weekHeaderRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    weekHeaderText: {
        flex: 1,
        textAlign: 'center',
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    dayCell: {
        width: '13.4%',
        aspectRatio: 0.9,
        backgroundColor: '#0f172a',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1e293b',
        padding: 8,
        justifyContent: 'space-between',
    },
    dayCellOutsideMonth: {
        opacity: 0.35,
    },
    dayCellSelected: {
        borderColor: '#60a5fa',
        backgroundColor: '#1d4ed8',
    },
    dayCellToday: {
        borderColor: '#38bdf8',
    },
    dayNumber: {
        color: '#e2e8f0',
        fontSize: 15,
        fontWeight: '700',
    },
    dayNumberOutsideMonth: {
        color: '#64748b',
    },
    dayNumberSelected: {
        color: '#fff',
    },
    dayIndicators: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flexWrap: 'wrap',
    },
    applicationDot: {
        width: 7,
        height: 7,
        borderRadius: 999,
        backgroundColor: '#f59e0b',
    },
    googleDot: {
        width: 7,
        height: 7,
        borderRadius: 999,
        backgroundColor: '#4ade80',
    },
    dayCountText: {
        color: '#cbd5e1',
        fontSize: 10,
        fontWeight: '700',
    },
    agendaSection: {
        marginTop: 18,
        gap: 10,
    },
    agendaSectionTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '700',
    },
    agendaItem: {
        backgroundColor: '#1e293b',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#334155',
        padding: 14,
        gap: 6,
    },
    agendaHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
    },
    agendaTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        flex: 1,
    },
    agendaSubtitle: {
        color: '#cbd5e1',
        fontSize: 14,
    },
    agendaFooter: {
        color: '#94a3b8',
        fontSize: 12,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
    },
    googleBadge: {
        backgroundColor: '#2563eb',
    },
    statusText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    emptyText: {
        color: '#94a3b8',
        textAlign: 'center',
        lineHeight: 20,
        paddingVertical: 12,
    }
});
