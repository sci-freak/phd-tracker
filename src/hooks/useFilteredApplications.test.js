import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFilteredApplications } from './useFilteredApplications';

const apps = [
    { id: 'a', university: 'MIT', program: 'CS', country: 'United States', status: 'Submitted', sortOrder: 2, deadline: '2030-12-31' },
    { id: 'b', university: 'Oxford', program: 'Physics', country: 'United Kingdom', status: 'Accepted', sortOrder: 0, deadline: '2030-06-15' },
    { id: 'c', university: 'ETH Zurich', program: 'Math', country: 'Switzerland', status: 'Rejected', sortOrder: 1, deadline: '2030-09-30' }
];

const defaultArgs = {
    applications: apps,
    searchTerm: '',
    statusFilter: 'All',
    countryFilter: 'All',
    sortOption: 'manual',
    sortDirection: 'asc'
};

describe('useFilteredApplications', () => {
    it('returns all apps in manual sortOrder when no filters', () => {
        const { result } = renderHook(() => useFilteredApplications(defaultArgs));
        expect(result.current.filtered.map((a) => a.id)).toEqual(['b', 'c', 'a']);
    });

    it('filters by search term against university and program', () => {
        const { result } = renderHook(() =>
            useFilteredApplications({ ...defaultArgs, searchTerm: 'physics' })
        );
        expect(result.current.filtered.map((a) => a.id)).toEqual(['b']);
    });

    it('filters by status', () => {
        const { result } = renderHook(() =>
            useFilteredApplications({ ...defaultArgs, statusFilter: 'Accepted' })
        );
        expect(result.current.filtered.map((a) => a.id)).toEqual(['b']);
    });

    it('filters by country', () => {
        const { result } = renderHook(() =>
            useFilteredApplications({ ...defaultArgs, countryFilter: 'Switzerland' })
        );
        expect(result.current.filtered.map((a) => a.id)).toEqual(['c']);
    });

    it('sorts by deadline ascending', () => {
        const { result } = renderHook(() =>
            useFilteredApplications({ ...defaultArgs, sortOption: 'deadline', sortDirection: 'asc' })
        );
        expect(result.current.filtered.map((a) => a.id)).toEqual(['b', 'c', 'a']);
    });

    it('sorts by deadline descending', () => {
        const { result } = renderHook(() =>
            useFilteredApplications({ ...defaultArgs, sortOption: 'deadline', sortDirection: 'desc' })
        );
        expect(result.current.filtered.map((a) => a.id)).toEqual(['a', 'c', 'b']);
    });

    it('returns unique countries with All prepended', () => {
        const { result } = renderHook(() => useFilteredApplications(defaultArgs));
        expect(result.current.uniqueCountries).toEqual([
            'All',
            'United States',
            'United Kingdom',
            'Switzerland'
        ]);
    });

    it('produces stats grouped by status', () => {
        const { result } = renderHook(() => useFilteredApplications(defaultArgs));
        expect(result.current.stats).toEqual({
            Submitted: 1,
            Accepted: 1,
            Rejected: 1
        });
    });

    it('disables drag when any filter is active', () => {
        const { result } = renderHook(() =>
            useFilteredApplications({ ...defaultArgs, searchTerm: 'mit' })
        );
        expect(result.current.dragEnabled).toBe(false);
    });

    it('disables drag when sort is non-manual', () => {
        const { result } = renderHook(() =>
            useFilteredApplications({ ...defaultArgs, sortOption: 'deadline' })
        );
        expect(result.current.dragEnabled).toBe(false);
    });

    it('enables drag when no filters and manual sort', () => {
        const { result } = renderHook(() => useFilteredApplications(defaultArgs));
        expect(result.current.dragEnabled).toBe(true);
    });
});
