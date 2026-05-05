import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterBar from './FilterBar';

const baseProps = (overrides = {}) => ({
    totalApplications: 5,
    stats: { Submitted: 2, Accepted: 1, Rejected: 1 },
    searchTerm: '',
    onSearchChange: vi.fn(),
    statusFilter: 'All',
    onStatusFilterChange: vi.fn(),
    countryFilter: 'All',
    onCountryFilterChange: vi.fn(),
    uniqueCountries: ['All', 'United States', 'United Kingdom'],
    sortOption: 'manual',
    onSortOptionChange: vi.fn(),
    sortDirection: 'asc',
    onToggleSortDirection: vi.fn(),
    ...overrides
});

describe('FilterBar', () => {
    it('renders the total applications count with correct pluralization', () => {
        const { rerender } = render(<FilterBar {...baseProps({ totalApplications: 1 })} />);
        expect(screen.getByText(/1 Application$/)).toBeInTheDocument();
        rerender(<FilterBar {...baseProps({ totalApplications: 5 })} />);
        expect(screen.getByText(/5 Applications$/)).toBeInTheDocument();
    });

    it('shows the stat values from props', () => {
        render(<FilterBar {...baseProps()} />);
        // Stats render as <span class="toolbar__stat-value">N</span> followed by label
        const submittedStat = screen.getByText('Submitted', { selector: 'span:not(option)' });
        expect(submittedStat).toBeInTheDocument();
        expect(submittedStat.previousSibling).toHaveTextContent('2');
        expect(screen.getByText('Accepted', { selector: 'span:not(option)' })).toBeInTheDocument();
        expect(screen.getByText('Rejected', { selector: 'span:not(option)' })).toBeInTheDocument();
    });

    it('reports search input changes', async () => {
        const user = userEvent.setup();
        const props = baseProps();
        render(<FilterBar {...props} />);
        await user.type(screen.getByRole('textbox', { name: /search applications/i }), 'MIT');
        expect(props.onSearchChange).toHaveBeenCalled();
    });

    it('reports status filter changes', async () => {
        const user = userEvent.setup();
        const props = baseProps();
        render(<FilterBar {...props} />);
        await user.selectOptions(screen.getByRole('combobox', { name: /filter by status/i }), 'Submitted');
        expect(props.onStatusFilterChange).toHaveBeenCalledWith('Submitted');
    });

    it('reports country filter changes', async () => {
        const user = userEvent.setup();
        const props = baseProps();
        render(<FilterBar {...props} />);
        await user.selectOptions(
            screen.getByRole('combobox', { name: /filter by country/i }),
            'United Kingdom'
        );
        expect(props.onCountryFilterChange).toHaveBeenCalledWith('United Kingdom');
    });

    it('hides the sort direction button when sort is manual', () => {
        render(<FilterBar {...baseProps({ sortOption: 'manual' })} />);
        expect(screen.queryByRole('button', { name: /sort ascending|sort descending/i })).toBeNull();
    });

    it('shows the sort direction toggle when sort is non-manual', async () => {
        const user = userEvent.setup();
        const props = baseProps({ sortOption: 'deadline', sortDirection: 'asc' });
        render(<FilterBar {...props} />);
        const toggle = screen.getByRole('button', { name: /sort ascending/i });
        await user.click(toggle);
        expect(props.onToggleSortDirection).toHaveBeenCalledTimes(1);
    });
});
