import { db } from '../config/firebase';
import { collection, onSnapshot, addDoc, deleteDoc, updateDoc, doc, setDoc, writeBatch, query } from 'firebase/firestore';
import {
    applyManualSortOrder,
    createFirestorePayload,
    createImportedApplications,
    createLocalApplication,
    normalizeImportedApplication,
    sortApplications
} from '@phd-tracker/shared/applications';

const GUEST_KEY = 'phd-app-guest-data';
const LEGACY_KEY = 'phd-applications';

const getGuestData = () => {
    const data = localStorage.getItem(GUEST_KEY) || localStorage.getItem(LEGACY_KEY);
    return data ? JSON.parse(data) : [];
};

const saveGuestData = (data) => {
    localStorage.setItem(GUEST_KEY, JSON.stringify(data));
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
        } else {
            const q = query(collection(db, `users/${user.uid}/applications`));
            return onSnapshot(q, (querySnapshot) => {
                const apps = [];
                querySnapshot.forEach((docSnapshot) => {
                    apps.push({ ...docSnapshot.data(), id: docSnapshot.id });
                });
                onUpdate(sortApplications(apps));
            });
        }
    },

    addApplication: async (user, app) => {
        if (!user || user.isGuest) {
            const apps = getGuestData();
            const newApp = createLocalApplication(app, {
                id: Date.now().toString(),
                fallbackSortOrder: apps.length
            });
            apps.push(newApp);
            saveGuestData(apps);
            window.dispatchEvent(new Event('guest-data-changed'));
            return newApp;
        } else {
            const payload = createFirestorePayload(app, 0);
            return addDoc(collection(db, `users/${user.uid}/applications`), payload);
        }
    },

    updateApplication: async (user, updatedApp) => {
        if (!user || user.isGuest) {
            const apps = getGuestData();
            const index = apps.findIndex(a => a.id === updatedApp.id);
            if (index !== -1) {
                apps[index] = { ...apps[index], ...updatedApp };
                saveGuestData(apps);
                window.dispatchEvent(new Event('guest-data-changed'));
            }
        } else {
            const { id, ...data } = updatedApp;
            return setDoc(doc(db, `users/${user.uid}/applications`, id), data, { merge: true });
        }
    },

    deleteApplication: async (user, appId) => {
        if (!user || user.isGuest) {
            const apps = getGuestData();
            const newApps = apps.filter(a => a.id !== appId);
            saveGuestData(newApps);
            window.dispatchEvent(new Event('guest-data-changed'));
        } else {
            return deleteDoc(doc(db, `users/${user.uid}/applications`, appId));
        }
    },

    updateStatus: async (user, appId, newStatus) => {
        if (!user || user.isGuest) {
            const apps = getGuestData();
            const index = apps.findIndex(a => a.id === appId);
            if (index !== -1) {
                apps[index].status = newStatus;
                saveGuestData(apps);
                window.dispatchEvent(new Event('guest-data-changed'));
            }
        } else {
            return updateDoc(doc(db, `users/${user.uid}/applications`, appId), { status: newStatus });
        }
    },

    fetchGuestData: () => getGuestData(),

    clearGuestData: () => {
        localStorage.removeItem(GUEST_KEY);
        localStorage.removeItem(LEGACY_KEY);
        window.dispatchEvent(new Event('guest-data-changed'));
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
