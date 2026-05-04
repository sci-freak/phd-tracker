import React, { useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useTheme } from '../context/ThemeContext';
import GoogleConnect from './GoogleConnect';

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
    getDay,
    locales: { 'en-US': enUS }
});

const CalendarView = ({ events = [], onSelectEvent }) => {
    useTheme();
    const [googleEvents, setGoogleEvents] = useState([]);
    const [view, setView] = useState('month');
    const [date, setDate] = useState(new Date());

    const allEvents = [...events, ...googleEvents];

    const eventStyleGetter = (event) => {
        let backgroundColor = 'var(--accent-primary)';
        if (event.type === 'deadline') backgroundColor = 'var(--accent-danger)';
        if (event.type === 'interview') backgroundColor = 'var(--accent-success)';
        if (event.type === 'google') backgroundColor = 'var(--accent-secondary)';

        return {
            style: {
                backgroundColor,
                borderRadius: '4px',
                opacity: 0.85,
                color: '#fff',
                border: '0',
                display: 'block'
            }
        };
    };

    return (
        <section className="surface calendar-card" aria-label="Application calendar">
            <header className="calendar-card__header">
                <h2 className="calendar-card__title">Application Calendar</h2>
            </header>

            <GoogleConnect onEventsLoaded={setGoogleEvents} />

            <div className="calendar-card__grid">
                <Calendar
                    localizer={localizer}
                    events={allEvents}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: 560 }}
                    eventPropGetter={eventStyleGetter}
                    views={['month', 'week', 'day', 'agenda']}
                    view={view}
                    onView={setView}
                    date={date}
                    onNavigate={setDate}
                    onSelectEvent={(event) => onSelectEvent?.(event)}
                />
            </div>

            {/* Inline so it loads AFTER the imported react-big-calendar.css. */}
            <style>{`
                .rbc-calendar { color: var(--text-primary); font-family: var(--font-sans); background: transparent; }
                .rbc-toolbar { color: var(--text-primary); margin-bottom: 1rem; gap: 0.5rem; flex-wrap: wrap; }
                .rbc-toolbar-label { font-weight: 600; font-size: 1.05rem; color: var(--text-primary); }
                .rbc-toolbar button {
                    color: var(--text-primary);
                    border: 1px solid var(--border-default);
                    background: rgba(255, 255, 255, 0.04);
                    border-radius: 0.5rem;
                    padding: 0.5rem 0.75rem;
                    font-weight: 500;
                    transition: background 150ms, border-color 150ms;
                }
                .rbc-toolbar button:hover, .rbc-toolbar button:focus {
                    background: rgba(255, 255, 255, 0.1);
                    color: var(--text-primary);
                    border-color: var(--border-strong);
                }
                .rbc-toolbar button:active,
                .rbc-toolbar button.rbc-active,
                .rbc-toolbar button.rbc-active:hover,
                .rbc-toolbar button.rbc-active:focus {
                    background: var(--accent-primary);
                    color: #fff;
                    border-color: var(--accent-primary);
                }

                .rbc-month-view, .rbc-time-view, .rbc-agenda-view {
                    border: 1px solid var(--border-default);
                    border-radius: 0.75rem;
                    overflow: hidden;
                    background: transparent;
                }

                .rbc-header {
                    color: var(--text-secondary);
                    font-weight: 600;
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    padding: 0.5rem;
                    border-color: var(--border-default);
                    background: transparent;
                }
                .rbc-header + .rbc-header { border-left: 1px solid var(--border-subtle); }

                .rbc-month-row, .rbc-row-bg, .rbc-day-bg {
                    background: transparent;
                }
                .rbc-month-row + .rbc-month-row { border-top: 1px solid var(--border-subtle); }
                .rbc-day-bg + .rbc-day-bg { border-left: 1px solid var(--border-subtle); }

                .rbc-off-range-bg { background: var(--bg-secondary); opacity: 0.4; }
                .rbc-off-range { color: var(--text-tertiary); }
                .rbc-today { background: rgba(56, 189, 248, 0.12); }

                /* Week / Day (time) view */
                .rbc-time-view { background: transparent; border-color: var(--border-default); }
                .rbc-time-content { background: transparent; border-top: 1px solid var(--border-default); }
                .rbc-time-content > * + * > * { border-color: var(--border-subtle); }
                .rbc-time-header { background: transparent; border-bottom: 1px solid var(--border-default); }
                .rbc-time-header-content { background: transparent; border-color: var(--border-subtle); }
                .rbc-time-header.rbc-overflowing { border-right-color: var(--border-default); }
                .rbc-time-gutter, .rbc-header-gutter { background: transparent; color: var(--text-secondary); }
                .rbc-time-slot { color: var(--text-tertiary); border-color: var(--border-subtle); }
                .rbc-timeslot-group { background: transparent; border-color: var(--border-subtle); }
                .rbc-day-slot .rbc-time-slot { border-top-color: var(--border-subtle); }
                .rbc-current-time-indicator { background-color: var(--accent-primary); height: 1px; }
                .rbc-allday-cell { background: transparent; }
                .rbc-label { color: var(--text-secondary); }

                /* Agenda view */
                .rbc-agenda-view { background: transparent; }
                .rbc-agenda-empty { color: var(--text-secondary); padding: 2rem; }
                .rbc-agenda-time-cell, .rbc-agenda-date-cell, .rbc-agenda-event-cell {
                    background: transparent;
                    color: var(--text-primary);
                }

                .rbc-date-cell {
                    color: var(--text-secondary);
                    padding: 0.25rem 0.5rem;
                    font-size: 0.85rem;
                    text-align: right;
                }
                .rbc-date-cell.rbc-now { color: var(--accent-primary); font-weight: 700; }
                .rbc-button-link { color: inherit; text-decoration: none; font-weight: inherit; }

                .rbc-event { font-size: 0.75rem; padding: 2px 6px; border-radius: 0.25rem; }
                .rbc-show-more { color: var(--accent-primary); font-weight: 500; }

                .rbc-agenda-view table { color: var(--text-primary); }
                .rbc-agenda-view table.rbc-agenda-table thead > tr > th {
                    color: var(--text-secondary);
                    border-bottom: 1px solid var(--border-default);
                }
                .rbc-agenda-view table.rbc-agenda-table tbody > tr > td {
                    color: var(--text-primary);
                    border-top-color: var(--border-subtle);
                }

                [data-theme='light'] .rbc-toolbar button { background: rgba(15, 23, 42, 0.04); }
                [data-theme='light'] .rbc-toolbar button:hover { background: rgba(15, 23, 42, 0.08); }
                [data-theme='light'] .rbc-off-range-bg { background: rgba(15, 23, 42, 0.04); opacity: 1; }
                [data-theme='light'] .rbc-today { background: rgba(14, 165, 233, 0.08); }
            `}</style>
        </section>
    );
};

export default CalendarView;
