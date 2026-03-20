export const sortApplications = (apps) => {
    return [...apps].sort((a, b) => {
        const aOrder = typeof a?.sortOrder === 'number' ? a.sortOrder : Number.MAX_SAFE_INTEGER;
        const bOrder = typeof b?.sortOrder === 'number' ? b.sortOrder : Number.MAX_SAFE_INTEGER;
        return aOrder - bOrder;
    });
};

export const withSortOrder = (app, fallbackSortOrder = 0) => {
    return {
        ...app,
        sortOrder: typeof app?.sortOrder === 'number' ? app.sortOrder : fallbackSortOrder
    };
};

export const createEmptyApplicationDraft = () => {
    return {
        university: '',
        program: '',
        department: '',
        country: '',
        status: 'Not Started',
        deadline: '',
        website: '',
        qsRanking: '',
        requirements: [],
        notes: ''
    };
};

export const createApplicationSubmission = (app, { now = new Date(), existingCreatedAt, file = null } = {}) => {
    const draft = createEmptyApplicationDraft();
    const normalizedApp = normalizeImportedApplication({
        ...draft,
        ...app,
        files: app?.files,
        requirements: app?.requirements
    });

    if (!normalizedApp) {
        return null;
    }

    const timestamp = now.toISOString();

    return {
        ...normalizedApp,
        createdAt: existingCreatedAt || app?.createdAt || timestamp,
        updatedAt: timestamp,
        ...(file ? { file } : {})
    };
};

export const createLocalApplication = (app, { id, fallbackSortOrder = 0 } = {}) => {
    return {
        ...withSortOrder(app, fallbackSortOrder),
        id: app?.id || id
    };
};

export const createFirestorePayload = (app, fallbackSortOrder = 0) => {
    const { id: _id, ...data } = app || {};
    return withSortOrder(data, fallbackSortOrder);
};

export const createImportedApplications = (apps, { startingSortOrder = 0, idFactory } = {}) => {
    return apps.map((app, index) => ({
        ...app,
        id: app.id || (idFactory ? idFactory(index, app) : undefined),
        sortOrder: typeof app.sortOrder === 'number' ? app.sortOrder : startingSortOrder + index
    }));
};

export const applyManualSortOrder = (orderedApps) => {
    return orderedApps.map((app, index) => ({
        ...app,
        sortOrder: index
    }));
};

export const normalizeRequirements = (requirements) => {
    if (Array.isArray(requirements)) {
        return requirements
            .map((item) => typeof item === 'string' ? item.trim() : '')
            .filter(Boolean);
    }

    if (typeof requirements === 'string' && requirements.trim()) {
        return requirements
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return [];
};

export const compareApplicationsByDeadline = (a, b, direction = 'asc') => {
    const dateA = a?.deadline ? new Date(a.deadline) : new Date('9999-12-31');
    const dateB = b?.deadline ? new Date(b.deadline) : new Date('9999-12-31');
    return direction === 'asc' ? dateA - dateB : dateB - dateA;
};

export const compareApplicationsByStatus = (a, b, direction = 'asc') => {
    const statusA = a?.status || '';
    const statusB = b?.status || '';
    return direction === 'asc'
        ? statusA.localeCompare(statusB)
        : statusB.localeCompare(statusA);
};

export const normalizeImportedApplication = (app) => {
    if (!app || typeof app !== 'object') {
        return null;
    }

    const university = typeof app.university === 'string' ? app.university.trim() : '';
    const program = typeof app.program === 'string' ? app.program.trim() : '';

    if (!university || !program) {
        return null;
    }

    const deadline = typeof app.deadline === 'string' ? app.deadline.trim() : '';
    const status = typeof app.status === 'string' && app.status.trim() ? app.status.trim() : 'Not Started';
    const notes = typeof app.notes === 'string' ? app.notes : '';
    const country = typeof app.country === 'string' ? app.country.trim() : '';
    const department = typeof app.department === 'string' ? app.department.trim() : '';
    const website = typeof app.website === 'string' ? app.website.trim() : '';
    const qsRanking = app.qsRanking ?? '';
    const requirements = normalizeRequirements(app.requirements);
    const files = Array.isArray(app.files) ? app.files : [];

    return {
        university,
        program,
        deadline,
        status,
        notes,
        country,
        department,
        website,
        qsRanking,
        requirements,
        files,
        sortOrder: typeof app.sortOrder === 'number' ? app.sortOrder : undefined
    };
};
