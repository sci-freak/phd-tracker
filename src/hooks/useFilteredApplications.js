import { useMemo } from 'react';
import { compareApplicationsByDeadline, compareApplicationsByStatus } from '@phd-tracker/shared/applications';

export function useFilteredApplications({ applications, searchTerm, statusFilter, countryFilter, sortOption, sortDirection }) {
    const filtered = useMemo(() => {
        const term = (searchTerm || '').toLowerCase();
        return applications
            .filter((app) => {
                if (!app) return false;
                const u = app.university?.toLowerCase() || '';
                const p = app.program?.toLowerCase() || '';
                const matchesSearch = u.includes(term) || p.includes(term);
                const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
                const matchesCountry = countryFilter === 'All' || app.country === countryFilter;
                return matchesSearch && matchesStatus && matchesCountry;
            })
            .sort((a, b) => {
                if (sortOption === 'deadline') {
                    return compareApplicationsByDeadline(a, b, sortDirection);
                }
                if (sortOption === 'status') {
                    return compareApplicationsByStatus(a, b, sortDirection);
                }
                const orderA = typeof a.sortOrder === 'number' ? a.sortOrder : Number.MAX_SAFE_INTEGER;
                const orderB = typeof b.sortOrder === 'number' ? b.sortOrder : Number.MAX_SAFE_INTEGER;
                return orderA - orderB;
            });
    }, [applications, searchTerm, statusFilter, countryFilter, sortOption, sortDirection]);

    const uniqueCountries = useMemo(() => {
        return ['All', ...new Set(applications.map((app) => app.country).filter(Boolean))];
    }, [applications]);

    const stats = useMemo(() => {
        return applications.reduce((acc, app) => {
            acc[app.status] = (acc[app.status] || 0) + 1;
            return acc;
        }, {});
    }, [applications]);

    const isFiltering = (searchTerm || '').trim() !== '' || statusFilter !== 'All' || countryFilter !== 'All';
    const isManualSort = sortOption === 'manual';
    const dragEnabled = !isFiltering && isManualSort;

    return { filtered, uniqueCountries, stats, dragEnabled };
}
