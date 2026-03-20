export const APPLICATION_STATUSES = [
    'Not Started',
    'In Progress',
    'Submitted',
    'Interview',
    'Accepted',
    'Rejected',
    'Deadline Missed'
];

export const STATUS_FILTER_OPTIONS = ['All', ...APPLICATION_STATUSES];

export const STATUS_COLORS = {
    'Not Started': '#64748b',
    'In Progress': '#eab308',
    'Submitted': '#3b82f6',
    'Interview': '#f59e0b',
    'Accepted': '#22c55e',
    'Rejected': '#ef4444',
    'Deadline Missed': '#ef4444'
};

export const getStatusColor = (status) => {
    return STATUS_COLORS[status] || STATUS_COLORS['Not Started'];
};
