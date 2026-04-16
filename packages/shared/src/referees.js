import { normalizeDocuments } from './applications.js';

export const REFEREE_DOCUMENT_TYPES = [
    { value: 'recommendation', label: 'Recommendation Letter' },
    { value: 'supporting', label: 'Supporting Document' },
    { value: 'other', label: 'Other Document' }
];

export const createEmptyRefereeDraft = () => ({
    name: '',
    email: '',
    notes: '',
    documents: []
});

export const normalizeReferee = (referee) => {
    if (!referee || typeof referee !== 'object') {
        return null;
    }

    const email = typeof referee.email === 'string' ? referee.email.trim() : '';
    if (!email) {
        return null;
    }

    return {
        id: referee.id,
        name: typeof referee.name === 'string' ? referee.name.trim() : '',
        email,
        notes: typeof referee.notes === 'string' ? referee.notes : '',
        documents: normalizeDocuments(referee.documents)
    };
};

export const sortReferees = (referees) => {
    return [...referees]
        .map(normalizeReferee)
        .filter(Boolean)
        .sort((left, right) => {
            const leftKey = (left.name || left.email).toLowerCase();
            const rightKey = (right.name || right.email).toLowerCase();
            return leftKey.localeCompare(rightKey);
        });
};
