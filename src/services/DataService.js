import { db, storage } from '../config/firebase';
import { collection, onSnapshot, deleteDoc, updateDoc, doc, setDoc, writeBatch, query } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes, uploadString } from 'firebase/storage';
import {
    applyManualSortOrder,
    createFirestorePayload,
    createImportedApplications,
    createLocalApplication,
    normalizeDocuments,
    normalizeImportedApplication,
    sortApplications
} from '@phd-tracker/shared/applications';
import { normalizeReferee, sortReferees } from '@phd-tracker/shared/referees';

const GUEST_KEY = 'phd-app-guest-data';
const GUEST_REFEREES_KEY = 'phd-referees-guest-data';
const LEGACY_KEY = 'phd-applications';

const getGuestData = () => {
    const data = localStorage.getItem(GUEST_KEY) || localStorage.getItem(LEGACY_KEY);
    return data ? JSON.parse(data) : [];
};

const saveGuestData = (data) => {
    localStorage.setItem(GUEST_KEY, JSON.stringify(data));
};

const getGuestReferees = () => {
    const data = localStorage.getItem(GUEST_REFEREES_KEY);
    return data ? JSON.parse(data) : [];
};

const saveGuestReferees = (data) => {
    localStorage.setItem(GUEST_REFEREES_KEY, JSON.stringify(data));
};

const sanitizeFileName = (name = 'document') => {
    return name.replace(/[^a-zA-Z0-9._-]/g, '-');
};

const convertFileToDataUrl = (selectedFile) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(selectedFile);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });
};

const createDocumentMetadata = (document, overrides = {}) => ({
    id: document.id,
    name: document.name,
    category: document.category,
    mimeType: document.mimeType || document.type || '',
    size: typeof document.size === 'number' ? document.size : 0,
    uploadedAt: document.uploadedAt || new Date().toISOString(),
    refereeEmail: document.refereeEmail || '',
    ...overrides
});

const prepareGuestDocuments = async (documents) => {
    const normalizedDocuments = normalizeDocuments(documents);

    return Promise.all(normalizedDocuments.map(async (document) => {
        if (document.dataUrl) {
            return createDocumentMetadata(document, { dataUrl: document.dataUrl });
        }

        if (document.file) {
            const dataUrl = await convertFileToDataUrl(document.file);
            return createDocumentMetadata(document, { dataUrl });
        }

        return createDocumentMetadata(document);
    }));
};

const uploadDocumentForUser = async (user, storageBasePath, document) => {
    if (document.downloadUrl && document.storagePath && !document.file && !document.dataUrl) {
        return createDocumentMetadata(document, {
            downloadUrl: document.downloadUrl,
            storagePath: document.storagePath
        });
    }

    const storagePath = document.storagePath || `${storageBasePath}/${document.id}-${sanitizeFileName(document.name)}`;
    const storageRef = ref(storage, storagePath);

    try {
        if (document.file) {
            await uploadBytes(storageRef, document.file, { contentType: document.mimeType || document.file.type || 'application/octet-stream' });
        } else if (document.dataUrl) {
            await uploadString(storageRef, document.dataUrl, 'data_url');
        }

        const downloadUrl = await getDownloadURL(storageRef);

        return createDocumentMetadata(document, {
            downloadUrl,
            storagePath,
            uploadedAt: new Date().toISOString()
        });
    } catch (error) {
        console.warn('Falling back to inline document storage after Firebase Storage upload failed.', error);

        const dataUrl = document.dataUrl || (document.file ? await convertFileToDataUrl(document.file) : '');

        return createDocumentMetadata(document, {
            dataUrl,
            uploadedAt: new Date().toISOString()
        });
    }
};

const syncCloudDocuments = async (user, storageBasePath, documents, previousDocuments = []) => {
    const normalizedDocuments = normalizeDocuments(documents);
    const nextIds = new Set(normalizedDocuments.map((document) => document.id));

    await Promise.all(
        previousDocuments
            .filter((document) => document?.storagePath && !nextIds.has(document.id))
            .map((document) => deleteObject(ref(storage, document.storagePath)).catch(() => undefined))
    );

    return Promise.all(normalizedDocuments.map((document) => uploadDocumentForUser(user, storageBasePath, document)));
};

const deleteCloudDocuments = async (documents = []) => {
    await Promise.all(
        documents
            .filter((document) => document?.storagePath)
            .map((document) => deleteObject(ref(storage, document.storagePath)).catch(() => undefined))
    );
};

const prepareApplicationDocuments = async (user, appId, app, previousDocuments = []) => {
    const documentCandidates = normalizeDocuments(app?.documents, app?.file, app?.files);

    if (!user || user.isGuest) {
        return prepareGuestDocuments(documentCandidates);
    }

    try {
        return await syncCloudDocuments(user, `users/${user.uid}/applications/${appId}/documents`, documentCandidates, previousDocuments);
    } catch (error) {
        console.warn('Falling back to inline application document storage after sync failed.', error);
        return prepareGuestDocuments(documentCandidates);
    }
};

const prepareRefereeDocuments = async (user, refereeId, referee, previousDocuments = []) => {
    const documentCandidates = normalizeDocuments(referee?.documents);

    if (!user || user.isGuest) {
        return prepareGuestDocuments(documentCandidates);
    }

    try {
        return await syncCloudDocuments(user, `users/${user.uid}/referees/${refereeId}/documents`, documentCandidates, previousDocuments);
    } catch (error) {
        console.warn('Falling back to inline referee document storage after sync failed.', error);
        return prepareGuestDocuments(documentCandidates);
    }
};

export const DataService = {
    subscribeToApplications: (user, onUpdate) => {
        if (!user || user.isGuest) {
            const initialData = sortApplications(getGuestData());
            onUpdate(initialData);

            const handleStorageChange = () => {
                onUpdate(sortApplications(getGuestData()));
            };
            window.addEventListener('storage', handleStorageChange);
            window.addEventListener('guest-data-changed', handleStorageChange);

            return () => {
                window.removeEventListener('storage', handleStorageChange);
                window.removeEventListener('guest-data-changed', handleStorageChange);
            };
        }

        const q = query(collection(db, `users/${user.uid}/applications`));
        return onSnapshot(q, (querySnapshot) => {
            const apps = [];
            querySnapshot.forEach((docSnapshot) => {
                apps.push({ ...docSnapshot.data(), id: docSnapshot.id });
            });
            onUpdate(sortApplications(apps));
        });
    },

    subscribeToReferees: (user, onUpdate) => {
        if (!user || user.isGuest) {
            onUpdate(sortReferees(getGuestReferees()));

            const handleStorageChange = () => {
                onUpdate(sortReferees(getGuestReferees()));
            };
            window.addEventListener('storage', handleStorageChange);
            window.addEventListener('guest-referees-changed', handleStorageChange);

            return () => {
                window.removeEventListener('storage', handleStorageChange);
                window.removeEventListener('guest-referees-changed', handleStorageChange);
            };
        }

        const q = query(collection(db, `users/${user.uid}/referees`));
        return onSnapshot(q, (querySnapshot) => {
            const referees = [];
            querySnapshot.forEach((docSnapshot) => {
                referees.push({ ...docSnapshot.data(), id: docSnapshot.id });
            });
            onUpdate(sortReferees(referees));
        });
    },

    addApplication: async (user, app) => {
        if (!user || user.isGuest) {
            const apps = getGuestData();
            const documents = await prepareApplicationDocuments(user, app.id, app);
            const newApp = createLocalApplication({ ...app, documents }, {
                id: Date.now().toString(),
                fallbackSortOrder: apps.length
            });
            apps.push(newApp);
            saveGuestData(apps);
            window.dispatchEvent(new Event('guest-data-changed'));
            return newApp;
        }

        const newRef = doc(collection(db, `users/${user.uid}/applications`));
        const documents = await prepareApplicationDocuments(user, newRef.id, app);
        const payload = createFirestorePayload({ ...app, documents }, 0);
        await setDoc(newRef, payload);
        return newRef;
    },

    updateApplication: async (user, updatedApp) => {
        const hasDocumentPayload = Array.isArray(updatedApp?.documents) || Boolean(updatedApp?.file) || Array.isArray(updatedApp?.files);

        if (!user || user.isGuest) {
            const apps = getGuestData();
            const index = apps.findIndex((app) => app.id === updatedApp.id);
            if (index !== -1) {
                const previousApp = apps[index];
                const documents = hasDocumentPayload
                    ? await prepareApplicationDocuments(user, updatedApp.id, updatedApp, previousApp.documents || [])
                    : previousApp.documents || [];
                apps[index] = { ...previousApp, ...updatedApp, documents };
                saveGuestData(apps);
                window.dispatchEvent(new Event('guest-data-changed'));
            }
            return;
        }

        const { id, ...data } = updatedApp;
        const previousDocuments = Array.isArray(updatedApp.previousDocuments) ? updatedApp.previousDocuments : [];
        const documents = hasDocumentPayload
            ? await prepareApplicationDocuments(user, id, updatedApp, previousDocuments)
            : updatedApp.documents || previousDocuments;

        return setDoc(doc(db, `users/${user.uid}/applications`, id), { ...data, documents }, { merge: true });
    },

    deleteApplication: async (user, appId, documents = []) => {
        if (!user || user.isGuest) {
            const apps = getGuestData();
            const newApps = apps.filter((app) => app.id !== appId);
            saveGuestData(newApps);
            window.dispatchEvent(new Event('guest-data-changed'));
            return;
        }

        await deleteCloudDocuments(documents);
        return deleteDoc(doc(db, `users/${user.uid}/applications`, appId));
    },

    updateStatus: async (user, appId, newStatus) => {
        if (!user || user.isGuest) {
            const apps = getGuestData();
            const index = apps.findIndex((app) => app.id === appId);
            if (index !== -1) {
                apps[index].status = newStatus;
                saveGuestData(apps);
                window.dispatchEvent(new Event('guest-data-changed'));
            }
            return;
        }

        return updateDoc(doc(db, `users/${user.uid}/applications`, appId), { status: newStatus });
    },

    fetchGuestData: () => getGuestData(),

    clearGuestData: () => {
        localStorage.removeItem(GUEST_KEY);
        localStorage.removeItem(LEGACY_KEY);
        window.dispatchEvent(new Event('guest-data-changed'));
    },

    fetchGuestReferees: () => getGuestReferees(),

    addReferee: async (user, referee) => {
        const normalizedReferee = normalizeReferee(referee);
        if (!normalizedReferee) {
            throw new Error('Referee email is required');
        }

        if (!user || user.isGuest) {
            const referees = getGuestReferees();
            const refereeId = normalizedReferee.id || Date.now().toString();
            const documents = await prepareRefereeDocuments(user, refereeId, normalizedReferee);
            const nextReferee = { ...normalizedReferee, id: refereeId, documents };
            saveGuestReferees([...referees, nextReferee]);
            window.dispatchEvent(new Event('guest-referees-changed'));
            return nextReferee;
        }

        const refereeRef = doc(collection(db, `users/${user.uid}/referees`));
        const documents = await prepareRefereeDocuments(user, refereeRef.id, normalizedReferee);
        const { id: _id, ...refereeData } = normalizedReferee;
        await setDoc(refereeRef, { ...refereeData, documents });
        return refereeRef;
    },

    updateReferee: async (user, referee) => {
        const normalizedReferee = normalizeReferee(referee);
        if (!normalizedReferee?.id) {
            throw new Error('Referee id is required');
        }

        if (!user || user.isGuest) {
            const referees = getGuestReferees();
            const index = referees.findIndex((candidate) => candidate.id === normalizedReferee.id);
            if (index !== -1) {
                const previousReferee = referees[index];
                const documents = await prepareRefereeDocuments(user, normalizedReferee.id, normalizedReferee, previousReferee.documents || []);
                referees[index] = { ...previousReferee, ...normalizedReferee, documents };
                saveGuestReferees(referees);
                window.dispatchEvent(new Event('guest-referees-changed'));
            }
            return;
        }

        const previousDocuments = Array.isArray(referee.previousDocuments) ? referee.previousDocuments : [];
        const documents = await prepareRefereeDocuments(user, normalizedReferee.id, normalizedReferee, previousDocuments);
        await setDoc(doc(db, `users/${user.uid}/referees`, normalizedReferee.id), { ...normalizedReferee, documents }, { merge: true });
    },

    deleteReferee: async (user, refereeId, documents = []) => {
        if (!user || user.isGuest) {
            const referees = getGuestReferees().filter((candidate) => candidate.id !== refereeId);
            saveGuestReferees(referees);
            window.dispatchEvent(new Event('guest-referees-changed'));
            return;
        }

        await deleteCloudDocuments(documents);
        await deleteDoc(doc(db, `users/${user.uid}/referees`, refereeId));
    },

    batchAdd: async (user, apps) => {
        if (!user || user.isGuest) return;
        const batch = writeBatch(db);
        apps.forEach((app, index) => {
            const newRef = doc(collection(db, `users/${user.uid}/applications`));
            batch.set(newRef, createFirestorePayload(app, index));
        });
        return batch.commit();
    },

    importApplications: async (user, apps) => {
        if (!Array.isArray(apps) || apps.length === 0) {
            return [];
        }

        const normalizedApps = apps
            .map(normalizeImportedApplication)
            .filter(Boolean);

        if (normalizedApps.length === 0) {
            throw new Error('No valid applications found in import');
        }

        if (!user || user.isGuest) {
            const existingApps = getGuestData();
            const importedApps = createImportedApplications(normalizedApps, {
                startingSortOrder: existingApps.length,
                idFactory: () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
            });

            saveGuestData([...existingApps, ...importedApps]);
            window.dispatchEvent(new Event('guest-data-changed'));
            return importedApps;
        }

        const batch = writeBatch(db);
        normalizedApps.forEach((app, index) => {
            const newRef = doc(collection(db, `users/${user.uid}/applications`));
            batch.set(newRef, createFirestorePayload(app, index));
        });

        await batch.commit();
        return normalizedApps;
    },

    reorderApplications: async (user, orderedApps) => {
        if (!Array.isArray(orderedApps)) {
            return [];
        }

        const reorderedApps = applyManualSortOrder(orderedApps);

        if (!user || user.isGuest) {
            saveGuestData(reorderedApps);
            window.dispatchEvent(new Event('guest-data-changed'));
            return reorderedApps;
        }

        const batch = writeBatch(db);
        reorderedApps.forEach(({ id, sortOrder }) => {
            if (!id) return;
            batch.update(doc(db, `users/${user.uid}/applications`, id), { sortOrder });
        });

        await batch.commit();
        return reorderedApps;
    }
};
