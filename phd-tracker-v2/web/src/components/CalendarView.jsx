import React, { useState } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useTheme } from '../context/ThemeContext';
import GoogleConnect from './GoogleConnect';

const localizer = momentLocalizer(moment);

const CalendarView = ({ events = [], onSelectEvent }) => {
    const { theme } = useTheme();
    const [googleEvents, setGoogleEvents] = useState([]);

    const allEvents = [...events, ...googleEvents];

    // Custom styling for calendar events
    const eventStyleGetter = (event, start, end, isSelected) => {
        let backgroundColor = 'var(--accent-primary)';
        if (event.type === 'deadline') backgroundColor = 'var(--accent-danger)';
        if (event.type === 'interview') backgroundColor = 'var(--accent-success)';
        if (event.type === 'google') backgroundColor = 'var(--accent-secondary)';

        return {
            style: {
                backgroundColor,
                borderRadius: '4px',
                opacity: 0.8,
                color: '#fff',
                border: '0px',
                display: 'block'
            }
        };
    };

    return (
        <div style={{
            height: '600px',
            background: 'var(--bg-card)',
            padding: '1rem',
            borderRadius: '1rem',
            border: 'var(--glass-border)',
            backdropFilter: 'var(--backdrop-blur)',
            marginTop: '2rem'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>📅 Application Calendar</h2>
            </div>

            <GoogleConnect onEventsLoaded={setGoogleEvents} />

            <Calendar
                localizer={localizer}
                events={allEvents}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 500, color: 'var(--text-primary)' }}
                eventPropGetter={eventStyleGetter}
                views={['month', 'week', 'day', 'agenda']}
                onSelectEvent={event => {
                    if (onSelectEvent) {
                        onSelectEvent(event);
                    }
                }}
            />
            <style>{`
        .rbc-calendar { color: var(--text-primary); }
        .rbc-toolbar button { color: var(--text-primary); }
        .rbc-toolbar button:active, .rbc-toolbar button.rbc-active {
          background-color: var(--accent-primary);
          color: white;
        }
        .rbc-off-range-bg { background: var(--bg-secondary); opacity: 0.5; }
        .rbc-today { background: rgba(56, 189, 248, 0.1); }
        .rbc-header { color: var(--text-primary); }
        .rbc-month-view, .rbc-time-view, .rbc-agenda-view { border-color: var(--glass-border); }
        .rbc-day-bg + .rbc-day-bg { border-left: 1px solid rgba(255,255,255,0.1); }
        .rbc-month-row + .rbc-month-row { border-top: 1px solid rgba(255,255,255,0.1); }
      `}</style>
        </div>
    );
};

export default CalendarView;
