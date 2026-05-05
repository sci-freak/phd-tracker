import { lazy, Suspense, useCallback, useState } from 'react';
import { Inbox, SearchX } from 'lucide-react';
import './styles/App.css';

import TitleBar from './components/TitleBar';
import Login from './components/Login';
import AppHeader from './components/AppHeader';
import FilterBar from './components/FilterBar';
import ApplicationsGrid from './components/ApplicationsGrid';
import ApplicationForm from './components/ApplicationForm';

// Lazy-loaded — only fetched when the user opens these views/modals.
const CalendarView = lazy(() => import('./components/CalendarView'));
const ApplicationDetailModal = lazy(() => import('./components/ApplicationDetailModal'));
const ConflictResolutionModal = lazy(() => import('./components/ConflictResolutionModal'));
const SearchModal = lazy(() => import('./components/SearchModal'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));
const RefereesModal = lazy(() => import('./components/RefereesModal'));

import { useAuth } from './context/AuthContext';
import { useConfirm } from './hooks/useConfirm';
import { useApplications } from './hooks/useApplications';
import { useImportExport } from './hooks/useImportExport';
import { useGuestMerge } from './hooks/useGuestMerge';
import { useGlobalShortcut } from './hooks/useGlobalShortcut';
import { useFilteredApplications } from './hooks/useFilteredApplications';

import { countries } from './constants/countries';

function App() {
  const { currentUser, signOut } = useAuth();
  const confirm = useConfirm();

  const {
    applications,
    isLoading,
    addApplication,
    deleteApplication,
    updateStatus,
    editApplication,
    reorder
  } = useApplications(currentUser);

  const { exportData, importData } = useImportExport({ currentUser, applications, confirm });
  const guestMerge = useGuestMerge({ currentUser, confirm });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [countryFilter, setCountryFilter] = useState('All');
  const [view, setView] = useState('list');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editingAppId, setEditingAppId] = useState(null);
  const [sortOption, setSortOption] = useState('manual');
  const [sortDirection, setSortDirection] = useState('asc');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRefereesOpen, setIsRefereesOpen] = useState(false);
  const [shortcut, setShortcut] = useState(() => localStorage.getItem('searchShortcut') || 'Ctrl+K');

  const openSearch = useCallback(() => setIsSearchOpen(true), []);
  useGlobalShortcut({ shortcut, onShortcut: openSearch, onSignOut: signOut });

  const { filtered, uniqueCountries, stats, dragEnabled } = useFilteredApplications({
    applications,
    searchTerm,
    statusFilter,
    countryFilter,
    sortOption,
    sortDirection
  });

  const handleReorder = useCallback((activeId, overId) => {
    reorder(activeId, overId);
    setSortOption('manual');
  }, [reorder]);

  const calendarEvents = applications
    .filter((app) => app.deadline)
    .map((app) => {
      const hasTime = app.deadline.includes('T');
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

  if (!currentUser) {
    return <Login />;
  }

  return (
    <>
      <TitleBar />
      <div className="app-container">
        <datalist id="country-list">
          {countries.map((country) => (
            <option key={country} value={country} />
          ))}
        </datalist>

        <AppHeader
          currentUser={currentUser}
          view={view}
          onViewChange={setView}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenReferees={() => setIsRefereesOpen(true)}
          onExport={exportData}
          onImport={importData}
          onSignOut={signOut}
        />

        {view === 'calendar' ? (
          <Suspense fallback={<div className="loading-state" role="status"><div className="spinner" aria-hidden="true" /><p>Loading calendar…</p></div>}>
            <CalendarView events={calendarEvents} onSelectEvent={setSelectedEvent} />
          </Suspense>
        ) : (
          <>
            <FilterBar
              totalApplications={applications.length}
              stats={stats}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              countryFilter={countryFilter}
              onCountryFilterChange={setCountryFilter}
              uniqueCountries={uniqueCountries}
              sortOption={sortOption}
              onSortOptionChange={setSortOption}
              sortDirection={sortDirection}
              onToggleSortDirection={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            />

            <ApplicationForm onAdd={addApplication} />

            {isLoading ? (
              <div className="loading-state" role="status" aria-live="polite">
                <div className="spinner" aria-hidden="true" />
                <p>Loading your applications…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                {applications.length === 0 ? (
                  <>
                    <span className="empty-state__icon" aria-hidden="true">
                      <Inbox size={24} />
                    </span>
                    <h2>No applications yet</h2>
                    <p>Start by adding your dream universities above.</p>
                  </>
                ) : (
                  <>
                    <span className="empty-state__icon" aria-hidden="true">
                      <SearchX size={24} />
                    </span>
                    <h2>No matches found</h2>
                    <p>Try adjusting your search or filters.</p>
                  </>
                )}
              </div>
            ) : (
              <ApplicationsGrid
                applications={filtered}
                dragEnabled={dragEnabled}
                onReorder={handleReorder}
                editingAppId={editingAppId}
                onDelete={deleteApplication}
                onStatusChange={updateStatus}
                onEdit={editApplication}
                onEditEnd={() => setEditingAppId(null)}
              />
            )}
          </>
        )}

        {selectedEvent && (
          <Suspense fallback={null}>
            <ApplicationDetailModal
              event={selectedEvent}
              onClose={() => setSelectedEvent(null)}
              onEdit={(app) => {
                setEditingAppId(app.id);
                setView('list');
              }}
            />
          </Suspense>
        )}
      </div>

      {isSearchOpen && (
        <Suspense fallback={null}>
          <SearchModal
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            applications={applications}
            onSelect={(app) => {
              setEditingAppId(app.id);
              setView('list');
              setTimeout(() => {
                const el = document.getElementById(`app-card-${app.id}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 100);
            }}
          />
        </Suspense>
      )}
      {isSettingsOpen && (
        <Suspense fallback={null}>
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            currentShortcut={shortcut}
            onSaveShortcut={(newShortcut) => {
              setShortcut(newShortcut);
              localStorage.setItem('searchShortcut', newShortcut);
            }}
          />
        </Suspense>
      )}
      {isRefereesOpen && (
        <Suspense fallback={null}>
          <RefereesModal
            isOpen={isRefereesOpen}
            onClose={() => setIsRefereesOpen(false)}
            currentUser={currentUser}
          />
        </Suspense>
      )}
      {guestMerge.conflictModalOpen && (
        <Suspense fallback={null}>
          <ConflictResolutionModal
            isOpen={guestMerge.conflictModalOpen}
            onClose={guestMerge.discard}
            guestApps={guestMerge.guestDataToMerge}
            onResolve={guestMerge.resolve}
          />
        </Suspense>
      )}
    </>
  );
}

export default App;
