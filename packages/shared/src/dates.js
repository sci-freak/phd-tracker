export const getBackupDateStamp = (date = new Date()) => {
    return date.toISOString().split('T')[0];
};

export const toDateInputValue = (date = new Date()) => {
    return date.toISOString().split('T')[0];
};

export const formatDeadlineDate = (dateString, fallback = 'No Deadline') => {
    if (!dateString) return fallback;

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return fallback;

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
};

export const formatReadableDate = (date, fallback = 'No Date') => {
    if (!date) return fallback;

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return fallback;

    return parsedDate.toLocaleDateString();
};

export const formatReadableTime = (date, allDay = false, fallback = '') => {
    if (allDay) return 'All Day';
    if (!date) return fallback;

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return fallback;

    return parsedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const getDaysUntilDeadline = (dateString, now = new Date()) => {
    if (!dateString) return null;

    const deadline = new Date(dateString);
    if (Number.isNaN(deadline.getTime())) return null;

    return Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
};
