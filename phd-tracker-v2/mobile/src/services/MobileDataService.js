import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, onSnapshot, addDoc, deleteDoc, updateDoc, doc, setDoc, writeBatch, query } from 'firebase/firestore';
import {
    createImportedApplications,
    createFirestorePayload,
    createLocalApplication,
    normalizeImportedApplication,
    sortApplications
} from '@phd-tracker/shared/applications';
import { db } from '../config/firebase';

const GUEST_KEY = 'phd-app-guest-data';

const getGuestData = async () => {
    try {
        const jsonValue = await AsyncStorage.getItem(GUEST_KEY);
        return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
        console.error('Error reading guest data', e);
        return [];
    }
};

const saveGuestData = async (data) => {
    try {
        const jsonValue = JSON.stringify(data);
        await AsyncStorage.setItem(GUEST_KEY, jsonValue);
    } catch (e) {
        console.error('Error saving guest data', e);
    }
};

export const MobileDataService = {
    subscribeToApplications: (user, onUpdate) => {
        if (!user || user.isGuest) {
            getGuestData().then(data => onUpdate(sortApplications(data)));

            const interval = setInterval(() => {
                getGuestData().then(data => onUpdate(sortApplications(data)));
            }, 2000);

            return () => clearInterval(interval);
        } else {
            const q = query(collection(db, `users/${user.uid}/applications`));
            return onSnapshot(q, (querySnapshot) => {
                const apps = [];
                querySnapshot.forEach((doc) => {
                    apps.push({ ...doc.data(), id: doc.id });
                });
                onUpdate(sortApplications(apps));
            });
        }
    },

    addApplication: async (user, app) => {
        const normalizedApp = normalizeImportedApplication(app);
        const appPayload = normalizedApp ?? {
            ...app,
            sortOrder: typeof app?.sortOrder === 'number' ? app.sortOrder : undefined
        };

        if (!user || user.isGuest) {
            const apps = await getGuestData();
            const newApp = createLocalApplication(appPayload, {
                id: Date.now().toString(),
                fallbackSortOrder: apps.length
            });
            apps.push(newApp);
            await saveGuestData(apps);
            return newApp;
        } else {
            const payload = createFirestorePayload(appPayload, 0);
            return addDoc(collection(db, `users/${user.uid}/applications`), payload);
        }
    },

    updateApplication: async (user, updatedApp) => {
        if (!user || user.isGuest) {
            const apps = await getGuestData();
            const index = apps.findIndex(a => a.id === updatedApp.id);
            if (index !== -1) {
                apps[index] = { ...apps[index], ...updatedApp };
                await saveGuestData(apps);
            }
        } else {
            const { id, ...data } = updatedApp;
            return setDoc(doc(db, `users/${user.uid}/applications`, id), data, { merge: true });
        }
    },

    deleteApplication: async (user, appId) => {
        if (!user || user.isGuest) {
            const apps = await getGuestData();
            const newApps = apps.filter(a => a.id !== appId);
            await saveGuestData(newApps);
        } else {
            return deleteDoc(doc(db, `users/${user.uid}/applications`, appId));
        }
    },

    updateStatus: async (user, appId, newStatus) => {
        if (!user || user.isGuest) {
            const apps = await getGuestData();
            const index = apps.findIndex(a => a.id === appId);
            if (index !== -1) {
                apps[index].status = newStatus;
                await saveGuestData(apps);
            }
        } else {
            return updateDoc(doc(db, `users/${user.uid}/applications`, appId), { status: newStatus });
        }
    },

    fetchGuestData: async () => {
        return await getGuestData();
    },

    clearGuestData: async () => {
        await AsyncStorage.removeItem(GUEST_KEY);
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
            const existingApps = await getGuestData();
            const importedApps = createImportedApplications(normalizedApps, {
                startingSortOrder: existingApps.length,
                idFactory: () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
            });

            await saveGuestData([...existingApps, ...importedApps]);
            return importedApps;
        }

        const batch = writeBatch(db);
        normalizedApps.forEach((app, index) => {
            const newRef = doc(collection(db, `users/${user.uid}/applications`));
            batch.set(newRef, createFirestorePayload(app, index));
        });

        await batch.commit();
        return normalizedApps;
    }
};
