export const listUpcomingEvents = async (accessToken) => {
    try {
        const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=' + (new Date()).toISOString() + '&showDeleted=false&singleEvents=true&maxResults=100&orderBy=startTime', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            const error = new Error('Failed to fetch events');
            error.status = response.status;
            throw error;
        }

        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.error("Error fetching events", error);
        throw error; // Re-throw so GoogleConnect.jsx can handle it
    }
};
