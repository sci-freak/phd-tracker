import { db } from '../config/firebase';
import { collection, onSnapshot, addDoc, deleteDoc, updateDoc, doc, setDoc, writeBatch, getDocs, query } from 'firebase/firestore';

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
            // Guest Mode: Poll or just return initial and rely on manual triggers? 
            // Better: Return a function to force update? 
            // For simplicity in this architecture, we will just call onUpdate immediately 
            // and rely on the UI to call proper methods that update the state.
            // But App.jsx expects a listener. We can simulate it.
            const initialData = getGuestData();
            onUpdate(initialData);

            // We listen to 'storage' events for multi-tab sync
            const handleStorageChange = () => {
                onUpdate(getGuestData());
            };
            window.addEventListener('storage', handleStorageChange);
            // Also custom event for same-tab updates
            window.addEventListener('guest-data-changed', handleStorageChange);

            return () => {
                window.removeEventListener('storage', handleStorageChange);
                window.removeEventListener('guest-data-changed', handleStorageChange);
            };
        } else {
            // Firestore Mode
            const q = query(collection(db, `users/${user.uid}/applications`));
            return onSnapshot(q, (querySnapshot) => {
                const apps = [];
                querySnapshot.forEach((doc) => {
                    apps.push({ ...doc.data(), id: doc.id });
                });
                onUpdate(apps);
            });
        }
    },

    addApplication: async (user, app) => {
        if (!user || user.isGuest) {
            const apps = getGuestData();
            const newApp = { ...app, id: Date.now().toString() };
            apps.push(newApp);
            saveGuestData(apps);
            window.dispatchEvent(new Event('guest-data-changed'));
            return newApp;
        } else {
            return addDoc(collection(db, `users/${user.uid}/applications`), app);
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

    // Utilities for Merge Flow
    fetchGuestData: () => getGuestData(),

    clearGuestData: () => {
        localStorage.removeItem(GUEST_KEY);
        localStorage.removeItem(LEGACY_KEY);
        window.dispatchEvent(new Event('guest-data-changed'));
    },

    batchAdd: async (user, apps) => {
        if (!user || user.isGuest) return; // Shouldn't happen in merge flow
        const batch = writeBatch(db);
        apps.forEach(app => {
            const newRef = doc(collection(db, `users/${user.uid}/applications`));
            const { id, ...data } = app; // Drop ID to let Firestore generate new one, or keep? Better new.
            batch.set(newRef, data);
        });
        return batch.commit();
    }
};
