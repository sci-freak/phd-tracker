import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, onSnapshot, addDoc, deleteDoc, updateDoc, doc, setDoc, writeBatch, query } from 'firebase/firestore';
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
            // Guest Mode
            // Initial load
            getGuestData().then(data => onUpdate(data));

            // Polling approach for simplicity since AsyncStorage doesn't have listeners
            // or we could rely on UI to trigger re-fetches. 
            // For a robust experience, we can expose a 'refresh' method or just poll.
            // Let's polling every 2 seconds for now to simulate real-time feels, 
            // but in reality, screens will just call CRUD methods which will trigger updates.
            // But if multiple screens need sync, polling is easiest quick fix.

            const interval = setInterval(() => {
                getGuestData().then(data => onUpdate(data));
            }, 2000);

            return () => clearInterval(interval);
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
            const apps = await getGuestData();
            const newApp = { ...app, id: Date.now().toString() };
            apps.push(newApp);
            await saveGuestData(apps);
            return newApp;
        } else {
            return addDoc(collection(db, `users/${user.uid}/applications`), app);
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
        apps.forEach(app => {
            const newRef = doc(collection(db, `users/${user.uid}/applications`));
            const { id, ...data } = app;
            batch.set(newRef, data);
        });
        return batch.commit();
    }
};
