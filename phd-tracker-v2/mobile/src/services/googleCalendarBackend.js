import { auth } from '../config/firebase';

const FUNCTION_BASE_URL = 'https://us-central1-phd-tracker-ae84e.cloudfunctions.net';

const getFirebaseIdToken = async () => {
    const user = auth.currentUser;
    if (!user) {
        const error = new Error('You must be signed in.');
        error.code = 'auth/unauthenticated';
        throw error;
    }

    return user.getIdToken();
};

const callCalendarEndpoint = async (path) => {
    const idToken = await getFirebaseIdToken();
    const response = await fetch(`${FUNCTION_BASE_URL}/${path}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${idToken}`
        }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error(data?.error || `Calendar request failed with status ${response.status}`);
        if (response.status === 401) {
            error.code = 'auth/unauthenticated';
        } else if (response.status === 404) {
            error.code = 'functions/not-found';
        } else if (response.status === 412) {
            error.code = 'functions/failed-precondition';
        } else if (response.status === 403) {
            error.code = 'functions/permission-denied';
        } else {
            error.code = `http/${response.status}`;
        }
        throw error;
    }

    return data;
};

export const getGoogleCalendarAuthUrl = async () => {
    const result = await callCalendarEndpoint('getGoogleCalendarAuthUrlHttp');
    return result?.authUrl || '';
};

export const getGoogleCalendarConnectionStatus = async () => {
    return callCalendarEndpoint('getGoogleCalendarConnectionStatusHttp');
};

export const listBackendGoogleCalendarEvents = async () => {
    const result = await callCalendarEndpoint('listGoogleCalendarEventsHttp');
    return result?.items || [];
};
