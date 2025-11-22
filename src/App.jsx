import { useState, useEffect } from 'react'
import './styles/App.css'
import ApplicationCard from './components/ApplicationCard'
import ApplicationForm from './components/ApplicationForm'
import TitleBar from './components/TitleBar'
import CalendarView from './components/CalendarView'
import ApplicationDetailModal from './components/ApplicationDetailModal'
import ErrorBoundary from './components/ErrorBoundary';

import Papa from 'papaparse';

import { ThemeProvider } from './context/ThemeContext';

function App() {
  const [applications, setApplications] = useState(() => {
    const saved = localStorage.getItem('phd-applications');
    return saved ? JSON.parse(saved) : [];
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [countryFilter, setCountryFilter] = useState('All');
  const [view, setView] = useState('list'); // 'list' or 'calendar'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editingAppId, setEditingAppId] = useState(null);

  // Map applications to calendar events
  const calendarEvents = applications
    .filter(app => app.deadline)
    .map(app => {
      const hasTime = app.deadline && app.deadline.includes('T');
      return {
        id: app.id,
        title: `${app.university} - ${app.program}`,
        start: new Date(app.deadline),
        end: new Date(app.deadline),
        allDay: !hasTime,
        type: 'deadline',
        resource: app
      };
    });

  useEffect(() => {
    localStorage.setItem('phd-applications', JSON.stringify(applications));
  }, [applications]);

  const addApplication = (app) => {
    setApplications([app, ...applications]);
  };

  const deleteApplication = (id) => {
    setApplications(applications.filter(app => app.id !== id));
  };

  const updateStatus = (id, newStatus) => {
    setApplications(applications.map(app =>
      app.id === id ? { ...app, status: newStatus } : app
    ));
  };

  const editApplication = (updatedApp) => {
    setApplications(applications.map(app =>
      app.id === updatedApp.id ? updatedApp : app
    ));
  };

  const exportData = () => {
    const dataStr = JSON.stringify(applications, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `phd-applications-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;

      if (file.name.endsWith('.json')) {
        try {
          const importedApps = JSON.parse(content);
          if (Array.isArray(importedApps)) {
            setApplications([...importedApps, ...applications]);
            alert('Backup imported successfully!');
          }
        } catch (err) {
          alert('Invalid JSON file');
        }
      } else if (file.name.endsWith('.csv')) {
        Papa.parse(content, {
          header: true,
          complete: (results) => {
            const importedApps = results.data.map(row => ({
              id: Date.now() + Math.random(),
              university: row['University'] || row['Name'] || 'Unknown',
              program: row['Program'] || 'PhD',
              deadline: row['Deadline'] || '',
              status: row['Status'] || 'Not Started',
              notes: row['Notes'] || '',
              files: []
            })).filter(app => app.university !== 'Unknown');

            setApplications([...importedApps, ...applications]);
            alert(`Imported ${importedApps.length} applications from CSV!`);
          }
        });
      }
    };
    reader.readAsText(file);
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch = (app.university.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.program.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
    const matchesCountry = countryFilter === 'All' || app.country === countryFilter;
    return matchesSearch && matchesStatus && matchesCountry;
  });

  const uniqueCountries = ['All', ...new Set(applications.map(app => app.country).filter(Boolean))];

  const stats = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <ThemeProvider>
      <TitleBar />
      <div className="app-container">
        <div className="header">
          <h1>PhD Application Tracker</h1>
          <p>Manage your journey to the doctorate.</p>
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button onClick={exportData} className="btn-action">
              <span>💾</span> Export Backup
            </button>
            <label className="btn-action">
              <span>📥</span> Import Data
              <input
                type="file"
                accept=".json,.csv"
                onChange={importData}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
            <button
              onClick={() => setView('list')}
              className="btn-action"
              style={{
                background: view === 'list' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                color: view === 'list' ? '#fff' : 'var(--text-secondary)'
              }}
            >
              📋 List View
            </button>
            <button
              onClick={() => setView('calendar')}
              className="btn-action"
              style={{
                background: view === 'calendar' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                color: view === 'calendar' ? '#fff' : 'var(--text-secondary)'
              }}
            >
              📅 Calendar
            </button>
          </div>
        </div>

        {view === 'calendar' ? (
          <CalendarView
            events={calendarEvents}
            onSelectEvent={setSelectedEvent}
          />
        ) : (
          <>
            <div style={{
              display: 'flex',
              gap: '1rem',
              marginBottom: '2rem',
              flexWrap: 'wrap',
              background: 'var(--bg-card)',
              padding: '1rem',
              borderRadius: '1rem',
              border: 'var(--glass-border)',
              backdropFilter: 'var(--backdrop-blur)'
            }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                  Total Applications: {applications.length}
                </span>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <span>Submitted: <strong style={{ color: 'var(--text-primary)' }}>{stats['Submitted'] || 0}</strong></span>
                  <span>Accepted: <strong style={{ color: 'var(--accent-success)' }}>{stats['Accepted'] || 0}</strong></span>
                  <span>Rejected: <strong style={{ color: 'var(--accent-danger)' }}>{stats['Rejected'] || 0}</strong></span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '250px' }}>
                <input
                  type="text"
                  placeholder="Search university or program..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ flex: 1 }}
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ width: '150px' }}
                >
                  <option value="All">All Statuses</option>
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Interview">Interview</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Rejected">Rejected</option>
                </select>
                <select
                  value={countryFilter}
                  onChange={(e) => setCountryFilter(e.target.value)}
                  style={{ width: '150px' }}
                >
                  {uniqueCountries.map(country => (
                    <option key={country} value={country}>
                      {country === 'All' ? 'All Countries' : country}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <ApplicationForm onAdd={addApplication} />

            {filteredApplications.length === 0 ? (
              <div className="empty-state">
                {applications.length === 0 ? (
                  <>
                    <h2>No applications yet</h2>
                    <p>Start by adding your dream universities above.</p>
                  </>
                ) : (
                  <>
                    <h2>No matches found</h2>
                    <p>Try adjusting your search or filters.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="grid-container">
                {filteredApplications.map(app => (
                  <ApplicationCard
                    key={app.id}
                    app={app}
                    onDelete={deleteApplication}
                    onStatusChange={updateStatus}
                    onEdit={editApplication}
                    startEditing={app.id === editingAppId}
                    onEditEnd={() => setEditingAppId(null)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {selectedEvent && (
          <ApplicationDetailModal
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
            onEdit={(app) => {
              setEditingAppId(app.id);
              setView('list');
            }}
          />
        )}
      </div>
    </ThemeProvider>
  )
}

export default App
