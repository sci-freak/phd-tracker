import React from 'react';
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
                    Total Applications: {totalApplications}
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
                    onChange={(e) => onSearchChange(e.target.value)}
                    style={{ flex: 1 }}
                />
                <select
                    value={statusFilter}
                    onChange={(e) => onStatusFilterChange(e.target.value)}
                    style={{ width: '150px' }}
                >
                    {STATUS_FILTER_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                            {status === 'All' ? 'All Statuses' : status}
                        </option>
                    ))}
                </select>
                <select
                    value={countryFilter}
                    onChange={(e) => onCountryFilterChange(e.target.value)}
                    style={{ width: '150px' }}
                >
                    {uniqueCountries.map((country) => (
                        <option key={country} value={country}>
                            {country === 'All' ? 'All Countries' : country}
                        </option>
                    ))}
                </select>
                <select
                    value={sortOption}
                    onChange={(e) => onSortOptionChange(e.target.value)}
                    style={{ width: '170px' }}
                >
                    <option value="manual">Manual Sort</option>
                    <option value="deadline">Sort by Deadline</option>
                    <option value="status">Sort by Status</option>
                </select>
                {sortOption !== 'manual' && (
                    <button
                        onClick={onToggleSortDirection}
                        className="btn-action"
                        style={{ padding: '0.5rem', minWidth: '40px', justifyContent: 'center' }}
                        title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                    >
                        {sortDirection === 'asc' ? 'Up' : 'Down'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default FilterBar;
