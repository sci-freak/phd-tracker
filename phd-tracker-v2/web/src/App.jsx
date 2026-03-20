import { useState, useEffect } from 'react'
import './styles/App.css'
import ApplicationCard from './components/ApplicationCard'
import ApplicationForm from './components/ApplicationForm'
import TitleBar from './components/TitleBar'
import CalendarView from './components/CalendarView'
import ApplicationDetailModal from './components/ApplicationDetailModal'
import ErrorBoundary from './components/ErrorBoundary';
import Login from './components/Login';

import Papa from 'papaparse';

import { ThemeProvider } from './context/ThemeContext';

import { countries } from './constants/countries';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import SortableItem from './components/SortableItem';
import SearchModal from './components/SearchModal';
import SettingsModal from './components/SettingsModal';

import { db, auth } from './services/firebase';
import { collection, query, onSnapshot, addDoc, deleteDoc, updateDoc, doc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [countryFilter, setCountryFilter] = useState('All');
  const [view, setView] = useState('list'); // 'list' or 'calendar'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editingAppId, setEditingAppId] = useState(null);
  const [sortOption, setSortOption] = useState('manual');
  const [sortDirection, setSortDirection] = useState('asc');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [shortcut, setShortcut] = useState(() => localStorage.getItem('searchShortcut') || 'Ctrl+K');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Listener
  useEffect(() => {
    if (!user) {
      setApplications([]);
      return;
    }

    // Reference to user's applications collection
    // Structure: users/{userId}/applications/{appId}
    const q = query(collection(db, `users/${user.uid}/applications`));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const apps = [];
      querySnapshot.forEach((doc) => {
        apps.push({ id: doc.id, ...doc.data() });
      });
      setApplications(apps);
    }, (error) => {
      console.error("Error fetching applications:", error);
    });

    return () => unsubscribe();
  }, [user]);

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
    const handleKeyDown = (e) => {
      const keys = shortcut.split('+');
      const mainKey = keys[keys.length - 1].toLowerCase();
      const hasCtrl = keys.includes('Ctrl');
      const hasCmd = keys.includes('Cmd');
      const hasAlt = keys.includes('Alt');
      const hasShift = keys.includes('Shift');

      const eventKey = e.key.toLowerCase();
      const eventCtrl = e.ctrlKey;
      const eventMeta = e.metaKey; // Cmd
      const eventAlt = e.altKey;
      const eventShift = e.shiftKey;

      // Check modifiers
      const modifiersMatch =
        (hasCtrl === eventCtrl) &&
        (hasCmd === eventMeta) &&
        (hasAlt === eventAlt) &&
        (hasShift === eventShift);

      if (modifiersMatch && eventKey === mainKey) {
        e.preventDefault();
        setIsSearchOpen(true);
      }

      // Fail-safe Sign Out: Ctrl+Shift+L
      if (e.ctrlKey && e.shiftKey && e.key?.toLowerCase() === 'l') {
        e.preventDefault();
        signOut(auth);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcut]);

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      // Optimistic update for UI smoothness
      const oldIndex = applications.findIndex((item) => item.id === active.id);
      const newIndex = applications.findIndex((item) => item.id === over.id);
      const newOrder = arrayMove(applications, oldIndex, newIndex);
      setApplications(newOrder);
      setSortOption('manual');

      // TODO: Persist order to Firestore (requires an 'order' field)
    }
  };

  const addApplication = async (app) => {
    if (!user) return;
    try {
      // Remove id from app object as Firestore generates it (or we use the one we generated if we want)
      // But better to let Firestore generate or use setDoc with the UUID
      const { id, ...appData } = app;
      await setDoc(doc(db, `users/${user.uid}/applications`, id), appData);
    } catch (e) {
      console.error("Error adding document: ", e);
      alert("Failed to add application");
    }
  };

  const deleteApplication = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/applications`, id));
    } catch (e) {
      console.error("Error deleting document: ", e);
    }
  };

  const updateStatus = async (id, newStatus) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, `users/${user.uid}/applications`, id), {
        status: newStatus
      });
    } catch (e) {
      console.error("Error updating status: ", e);
    }
  };

  const editApplication = async (updatedApp) => {
    if (!user) return;
    try {
      const { id, ...appData } = updatedApp;
      await updateDoc(doc(db, `users/${user.uid}/applications`, id), appData);
    } catch (e) {
      console.error("Error updating application: ", e);
    }
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
            // Batch add to Firestore
            importedApps.forEach(app => addApplication(app));
            alert('Backup import started! Data will appear as it syncs.');
          }
        } catch (err) {
          alert('Invalid JSON file');
        }
      } else if (file.name.endsWith('.csv')) {
        Papa.parse(content, {
          header: true,
          complete: (results) => {
            const importedApps = results.data.map(row => ({
              id: crypto.randomUUID(),
              university: row['University'] || row['Name'] || 'Unknown',
              program: row['Program'] || 'PhD',
              deadline: row['Deadline'] || '',
              status: row['Status'] || 'Not Started',
              notes: row['Notes'] || '',
              files: []
            })).filter(app => app.university !== 'Unknown');

            importedApps.forEach(app => addApplication(app));
            alert(`Import started for ${importedApps.length} applications!`);
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
  }).sort((a, b) => {
    if (sortOption === 'deadline') {
      const dateA = a.deadline ? new Date(a.deadline) : new Date('9999-12-31');
      const dateB = b.deadline ? new Date(b.deadline) : new Date('9999-12-31');
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    }
    if (sortOption === 'status') {
      return sortDirection === 'asc'
        ? a.status.localeCompare(b.status)
        : b.status.localeCompare(a.status);
    }
    return 0;
  });

  const uniqueCountries = ['All', ...new Set(applications.map(app => app.country).filter(Boolean))];

  const stats = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {});

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white' }}>Loading...</div>;

  if (!user) {
    return (
      <ThemeProvider>
        <Login />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <TitleBar />
      <div className="app-container">
        <datalist id="country-list">
          {countries.map(country => (
            <option key={country} value={country} />
          ))}
        </datalist>
        <div className="header" style={{ textAlign: 'center' }}>
          <h1>PhD Application Tracker</h1>
          <p>Manage your journey to the doctorate.</p>

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
            {user && (
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginRight: '0.5rem' }}>
                Signed in as <strong>{user.email}</strong>
              </span>
            )}
            <button onClick={() => setIsSettingsOpen(true)} className="btn-action">
              <span>⚙️</span> Settings
            </button>
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
            <button 
              onClick={() => signOut(auth)} 
              className="btn-action" 
              style={{ borderColor: '#ef4444', color: '#ef4444' }}
            >
              Sign Out
            </button>
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

              <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '250px', flexWrap: 'wrap' }}>
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
                  <option value="Deadline Missed">Deadline Missed</option>
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
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  style={{ width: '170px' }}
                >
                  <option value="manual">Manual Sort</option>
                  <option value="deadline">Sort by Deadline</option>
                  <option value="status">Sort by Status</option>
                </select>
                {sortOption !== 'manual' && (
                  <button
                    onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="btn-action"
                    style={{ padding: '0.5rem', minWidth: '40px', justifyContent: 'center' }}
                    title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                  >
                    {sortDirection === 'asc' ? '⬆️' : '⬇️'}
                  </button>
                )}
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
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={filteredApplications.map(app => app.id)}
                    strategy={rectSortingStrategy}
                  >
                    {filteredApplications.map(app => (
                      <SortableItem key={app.id} id={app.id}>
                        <ApplicationCard
                          app={app}
                          onDelete={deleteApplication}
                          onStatusChange={updateStatus}
                          onEdit={editApplication}
                          startEditing={app.id === editingAppId}
                          onEditEnd={() => setEditingAppId(null)}
                        />
                      </SortableItem>
                    ))}
                  </SortableContext>
                </DndContext>
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
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        applications={applications}
        onSelect={(app) => {
          setEditingAppId(app.id);
          setView('list');
          // Optional: scroll to item
          setTimeout(() => {
            const el = document.getElementById(`app-card-${app.id}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        }}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentShortcut={shortcut}
        onSaveShortcut={(newShortcut) => {
          setShortcut(newShortcut);
          localStorage.setItem('searchShortcut', newShortcut);
        }}
      />
    </ThemeProvider>
  )
}

export default App
