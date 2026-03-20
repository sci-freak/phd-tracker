export const parseImportedJson = (content) => {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
};

export const mapImportedCsvRow = (row) => {
    const university = row?.University || row?.Name || '';

    if (!university) {
        return null;
    }

    return {
        university,
        program: row?.Program || 'PhD',
        deadline: row?.Deadline || '',
        status: row?.Status || 'Not Started',
        notes: row?.Notes || '',
        files: []
    };
};
