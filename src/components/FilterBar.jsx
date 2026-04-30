import React from 'react';
import { ArrowUp, ArrowDown, Search } from 'lucide-react';
import { STATUS_FILTER_OPTIONS } from '@phd-tracker/shared/statuses';

const FilterBar = ({
    totalApplications,
    stats,
    searchTerm,
    onSearchChange,
    statusFilter,
    onStatusFilterChange,
    countryFilter,
    onCountryFilterChange,
    uniqueCountries,
    sortOption,
    onSortOptionChange,
    sortDirection,
    onToggleSortDirection
}) => {
    return (
        <section className="surface toolbar" aria-label="Filters and stats">
            <div className="toolbar__stats">
                <span className="toolbar__stats-label">
                    {totalApplications} {totalApplications === 1 ? 'Application' : 'Applications'}
                </span>
                <div className="toolbar__stats-row">
                    <span className="toolbar__stat">
                        <span className="toolbar__stat-value">{stats['Submitted'] || 0}</span>
                        <span>Submitted</span>
                    </span>
                    <span className="toolbar__stat toolbar__stat--success">
                        <span className="toolbar__stat-value">{stats['Accepted'] || 0}</span>
                        <span>Accepted</span>
                    </span>
                    <span className="toolbar__stat toolbar__stat--danger">
                        <span className="toolbar__stat-value">{stats['Rejected'] || 0}</span>
                        <span>Rejected</span>
                    </span>
                </div>
            </div>

            <div className="toolbar__controls">
                <div className="toolbar__search" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Search
                        size={16}
                        aria-hidden="true"
                        style={{
                            position: 'absolute',
                            left: '0.875rem',
                            color: 'var(--text-tertiary)',
                            pointerEvents: 'none'
                        }}
                    />
                    <input
                        type="text"
                        placeholder="Search university or program…"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        aria-label="Search applications"
                        style={{ width: '100%', paddingLeft: '2.25rem' }}
                    />
                </div>
                <select
                    className="toolbar__select"
                    value={statusFilter}
                    onChange={(e) => onStatusFilterChange(e.target.value)}
                    aria-label="Filter by status"
                >
                    {STATUS_FILTER_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                            {status === 'All' ? 'All Statuses' : status}
                        </option>
                    ))}
                </select>
                <select
                    className="toolbar__select"
                    value={countryFilter}
                    onChange={(e) => onCountryFilterChange(e.target.value)}
                    aria-label="Filter by country"
                >
                    {uniqueCountries.map((country) => (
                        <option key={country} value={country}>
                            {country === 'All' ? 'All Countries' : country}
                        </option>
                    ))}
                </select>
                <select
                    className="toolbar__select"
                    value={sortOption}
                    onChange={(e) => onSortOptionChange(e.target.value)}
                    aria-label="Sort order"
                >
                    <option value="manual">Manual Sort</option>
                    <option value="deadline">Sort by Deadline</option>
                    <option value="status">Sort by Status</option>
                </select>
                {sortOption !== 'manual' && (
                    <button
                        type="button"
                        onClick={onToggleSortDirection}
                        className="btn-action btn-icon"
                        aria-label={sortDirection === 'asc' ? 'Sort ascending' : 'Sort descending'}
                        title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                    >
                        {sortDirection === 'asc'
                            ? <ArrowUp size={16} aria-hidden="true" />
                            : <ArrowDown size={16} aria-hidden="true" />}
                    </button>
                )}
            </div>
        </section>
    );
};

export default FilterBar;
