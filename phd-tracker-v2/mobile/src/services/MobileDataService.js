import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { collection, onSnapshot, deleteDoc, updateDoc, doc, setDoc, writeBatch, query } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadString } from 'firebase/storage';
import {
    applyManualSortOrder,
    createImportedApplications,
    createFirestorePayload,
    createLocalApplication,
    normalizeDocuments,
    normalizeImportedApplication,
    sortApplications
} from '@phd-tracker/shared/applications';
import { normalizeReferee, sortReferees } from '@phd-tracker/shared/referees';
import { auth, db, storage } from '../config/firebase';

const GUEST_KEY = 'phd-app-guest-data';
const GUEST_REFEREES_KEY = 'phd-referees-guest-data';

const getGuestData = async () => {
    try {
        const jsonValue = await AsyncStorage.getItem(GUEST_KEY);
        return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (error) {
        console.error('Error reading guest data', error);
        return [];
    }
};

const saveGuestData = async (data) => {
    try {
        await AsyncStorage.setItem(GUEST_KEY, JSON.stringify(data));
    } catch (error) {
        console.error('Error saving guest data', error);
    }
};

const getGuestReferees = async () => {
    try {
        const jsonValue = await AsyncStorage.getItem(GUEST_REFEREES_KEY);
        return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (error) {
        console.error('Error reading guest referees', error);
        return [];
    }
};

const saveGuestReferees = async (data) => {
    try {
        await AsyncStorage.setItem(GUEST_REFEREES_KEY, JSON.stringify(data));
    } catch (error) {
        console.error('Error saving guest referees', error);
    }
};

const sanitizeFileName = (name = 'document') => {
    return name.replace(/[^a-zA-Z0-9._-]/g, '-');
};

const uploadLocalFileToStorage = async (storageRef, localUri, mimeType) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error('Cannot upload to Firebase Storage without an authenticated user.');
    }

    const token = await currentUser.getIdToken();
    const bucket = storageRef.bucket;
    const objectPath = storageRef.fullPath;
    const endpoint = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(objectPath)}`;

    const result = await FileSystem.uploadAsync(endpoint, localUri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {
            Authorization: `Firebase ${token}`,
            'Content-Type': mimeType || 'application/octet-stream'
        }
    });

    if (result.status < 200 || result.status >= 300) {
        throw new Error(`Firebase Storage REST upload failed with status ${result.status}: ${result.body}`);
    }
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

        if (document.uri) {
            const base64 = await FileSystem.readAsStringAsync(document.uri, {
                encoding: FileSystem.EncodingType.Base64
            });
            return createDocumentMetadata(document, {
                dataUrl: `data:${document.mimeType || 'application/octet-stream'};base64,${base64}`
            });
        }

        return createDocumentMetadata(document);
    }));
};

const uploadDocumentForUser = async (user, storageBasePath, document) => {
    if (document.downloadUrl && document.storagePath && !document.uri && !document.dataUrl) {
        return createDocumentMetadata(document, {
            downloadUrl: document.downloadUrl,
            storagePath: document.storagePath
        });
    }

    const storagePath = document.storagePath || `${storageBasePath}/${document.id}-${sanitizeFileName(document.name)}`;
    const storageRef = ref(storage, storagePath);

    try {
        if (document.uri) {
            // The Firebase JS SDK's Blob-based upload paths (`uploadBytes`,
            // `uploadString(..., 'base64')`, etc.) all hit
            // `new Blob([ArrayBuffer])` internally, which React Native's Blob
            // polyfill does not support. Instead, stream the local file
            // straight to the Firebase Storage REST API via expo-file-system.
            await uploadLocalFileToStorage(storageRef, document.uri, document.mimeType);
        } else if (document.dataUrl) {
            // data URLs come from legacy inline-base64 storage; uploadString
            // handles these without triggering the Blob path.
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

        let dataUrl = document.dataUrl || '';
        if (!dataUrl && document.uri) {
            const base64 = await FileSystem.readAsStringAsync(document.uri, {
                encoding: FileSystem.EncodingType.Base64
            });
            dataUrl = `data:${document.mimeType || 'application/octet-stream'};base64,${base64}`;
        }

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

    return syncCloudDocuments(user, `users/${user.uid}/applications/${appId}/documents`, documentCandidates, previousDocuments);
};

// The list view only needs document *metadata* (id, name, category, etc.) —
// never the raw file contents. Legacy inline-base64 `dataUrl` values can be
// hundreds of KB to multiple MB each; keeping them in the subscribed
// `applications` state causes heavy per-render clones and native OOM crashes
// when the FlatList re-renders (e.g. when a modal opens). Strip them here so
// only detail/edit screens (which `getDoc` the full record separately) ever
// load the heavy content.
const LIST_DOCUMENT_HEAVY_FIELDS = ['dataUrl', 'content', 'file', 'uri'];

const stripDocumentContentForList = (document) => {
    if (!document || typeof document !== 'object') return document;
    const rest = {};
    for (const [key, value] of Object.entries(document)) {
        if (!LIST_DOCUMENT_HEAVY_FIELDS.includes(key)) {
            rest[key] = value;
        }
    }
    return rest;
};

const stripDocumentsContentFromApp = (app) => {
    if (!app || typeof app !== 'object') return app;
    const documents = Array.isArray(app.documents) ? app.documents.map(stripDocumentContentForList) : app.documents;
    return { ...app, documents };
};

const prepareRefereeDocuments = async (user, refereeId, referee, previousDocuments = []) => {
    const documentCandidates = normalizeDocuments(referee?.documents);

    if (!user || user.isGuest) {
        return prepareGuestDocuments(documentCandidates);
    }

    return syncCloudDocuments(user, `users/${user.uid}/referees/${refereeId}/documents`, documentCandidates, previousDocuments);
};

// expo-sharing throws "Another share request is being processed now" if you
// invoke `shareAsync` while a previous call hasn't resolved (e.g. user
// double-taps a document while the first download is still in flight).
// Track the in-flight promise so concurrent callers wait on the same work
// instead of starting parallel downloads + share intents.
let activeShare = null;

const resolveDocumentExtension = (document) => {
    if (document.name && document.name.includes('.')) {
        return document.name.split('.').pop();
    }
    if (document.mimeType && document.mimeType.includes('/')) {
        return document.mimeType.split('/').pop();
    }
    return 'bin';
};

const ensureDocumentLocalCopy = async (document) => {
    const extension = resolveDocumentExtension(document);
    const safeBase = sanitizeFileName(
        document.name?.replace(/\.[^.]+$/, '') ||
        document.id ||
        `document-${Date.now()}`
    );
    const localUri = `${FileSystem.cacheDirectory}${safeBase}.${extension}`;

    // Cache hit: skip the network round-trip. We treat any existing file
    // with non-zero size as good enough; Firebase Storage URLs are immutable
    // (their token would change if the underlying object changed), so
    // collisions on `safeBase` won't serve stale content.
    const info = await FileSystem.getInfoAsync(localUri).catch(() => null);
    if (info?.exists && info.size > 0) {
        return localUri;
    }

    const { uri } = await FileSystem.downloadAsync(document.downloadUrl, localUri);
    return uri;
};

const shareApplicationDocument = async (document) => {
    if (!document) return;
    if (activeShare) return activeShare;

    const run = (async () => {
        if (document.downloadUrl) {
            try {
                const localUri = await ensureDocumentLocalCopy(document);
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(localUri, {
                        mimeType: document.mimeType || 'application/octet-stream',
                        dialogTitle: document.name
                    });
                    return;
                }
                await Linking.openURL(document.downloadUrl);
                return;
            } catch (error) {
                console.warn('Failed to share remote document, falling back to Linking', error);
                await Linking.openURL(document.downloadUrl);
                return;
            }
        }

        if (document.dataUrl) {
            const [, meta = 'application/octet-stream', base64 = ''] = document.dataUrl.match(/^data:(.*?);base64,(.*)$/) || [];
            const extension = resolveDocumentExtension(document);
            const fileUri = `${FileSystem.cacheDirectory}${document.id || Date.now()}.${extension}`;

            await FileSystem.writeAsStringAsync(fileUri, base64, {
                encoding: FileSystem.EncodingType.Base64
            });

            await Sharing.shareAsync(fileUri, {
                mimeType: meta,
                dialogTitle: document.name
            });
        }
    })();

    activeShare = run.finally(() => {
        activeShare = null;
    });

    return activeShare;
};

export const MobileDataService = {
    subscribeToApplications: (user, onUpdate) => {
        const deliver = (apps) => onUpdate(sortApplications(apps.map(stripDocumentsContentFromApp)));

        if (!user || user.isGuest) {
            getGuestData().then(deliver);

            const interval = setInterval(() => {
                getGuestData().then(deliver);
            }, 2000);

            return () => clearInterval(interval);
        }

        const q = query(collection(db, `users/${user.uid}/applications`));
        return onSnapshot(q, (querySnapshot) => {
            const apps = [];
            querySnapshot.forEach((docSnapshot) => {
                apps.push({ ...docSnapshot.data(), id: docSnapshot.id });
            });
            deliver(apps);
        });
    },

    subscribeToReferees: (user, onUpdate) => {
        if (!user || user.isGuest) {
            getGuestReferees().then((data) => onUpdate(sortReferees(data)));

            const interval = setInterval(() => {
                getGuestReferees().then((data) => onUpdate(sortReferees(data)));
            }, 2000);

            return () => clearInterval(interval);
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
        const normalizedApp = normalizeImportedApplication(app);
        const appPayload = normalizedApp ?? {
            ...app,
            ...(typeof app?.sortOrder === 'number' ? { sortOrder: app.sortOrder } : {})
        };

        if (!user || user.isGuest) {
            const apps = await getGuestData();
            const documents = await prepareApplicationDocuments(user, app.id, appPayload);
            const newApp = createLocalApplication({ ...appPayload, documents }, {
                id: Date.now().toString(),
                fallbackSortOrder: apps.length
            });
            apps.push(newApp);
            await saveGuestData(apps);
            return newApp;
        }

        const newRef = doc(collection(db, `users/${user.uid}/applications`));
        const documents = await prepareApplicationDocuments(user, newRef.id, appPayload);
        const payload = createFirestorePayload({ ...appPayload, documents }, 0);
        await setDoc(newRef, payload);
        return newRef;
    },

    updateApplication: async (user, updatedApp) => {
        const hasDocumentPayload = Array.isArray(updatedApp?.documents) || Boolean(updatedApp?.file) || Array.isArray(updatedApp?.files);

        if (!user || user.isGuest) {
            const apps = await getGuestData();
            const index = apps.findIndex((app) => app.id === updatedApp.id);
            if (index !== -1) {
                const previousApp = apps[index];
                const documents = hasDocumentPayload
                    ? await prepareApplicationDocuments(user, updatedApp.id, updatedApp, previousApp.documents || [])
                    : previousApp.documents || [];
                apps[index] = { ...previousApp, ...updatedApp, documents };
                await saveGuestData(apps);
            }
            return;
        }

        // Pull out both `id` (Firestore doc ID, not a field) and
        // `previousDocuments` (transient metadata used only for storage
        // cleanup) so neither leaks into the persisted payload. Leaving
        // `previousDocuments` in the write has caused Firestore to reject the
        // payload with "Property array contains an invalid nested entity"
        // when the previous docs carried legacy non-POJO fields.
        const { id, previousDocuments: previousDocumentsRaw, ...data } = updatedApp;
        const previousDocuments = Array.isArray(previousDocumentsRaw) ? previousDocumentsRaw : [];
        const documents = hasDocumentPayload
            ? await prepareApplicationDocuments(user, id, updatedApp, previousDocuments)
            : updatedApp.documents || previousDocuments;

        return setDoc(doc(db, `users/${user.uid}/applications`, id), { ...data, documents }, { merge: true });
    },

    deleteApplication: async (user, appId, documents = []) => {
        if (!user || user.isGuest) {
            const apps = await getGuestData();
            const newApps = apps.filter((app) => app.id !== appId);
            await saveGuestData(newApps);
            return;
        }

        await deleteCloudDocuments(documents);
        return deleteDoc(doc(db, `users/${user.uid}/applications`, appId));
    },

    updateStatus: async (user, appId, newStatus) => {
        if (!user || user.isGuest) {
            const apps = await getGuestData();
            const index = apps.findIndex((app) => app.id === appId);
            if (index !== -1) {
                apps[index].status = newStatus;
                await saveGuestData(apps);
            }
            return;
        }

        return updateDoc(doc(db, `users/${user.uid}/applications`, appId), { status: newStatus });
    },

    fetchGuestData: async () => getGuestData(),

    clearGuestData: async () => {
        await AsyncStorage.removeItem(GUEST_KEY);
    },

    fetchGuestReferees: async () => getGuestReferees(),

    addReferee: async (user, referee) => {
        const normalizedReferee = normalizeReferee(referee);
        if (!normalizedReferee) {
            throw new Error('Referee email is required');
        }

        if (!user || user.isGuest) {
            const referees = await getGuestReferees();
            const refereeId = normalizedReferee.id || Date.now().toString();
            const documents = await prepareRefereeDocuments(user, refereeId, normalizedReferee);
            const nextReferee = { ...normalizedReferee, id: refereeId, documents };
            await saveGuestReferees([...referees, nextReferee]);
            return nextReferee;
        }

        const refereeRef = doc(collection(db, `users/${user.uid}/referees`));
        const documents = await prepareRefereeDocuments(user, refereeRef.id, normalizedReferee);
        await setDoc(refereeRef, { ...normalizedReferee, documents });
        return refereeRef;
    },

    updateReferee: async (user, referee) => {
        const normalizedReferee = normalizeReferee(referee);
        if (!normalizedReferee?.id) {
            throw new Error('Referee id is required');
        }

        if (!user || user.isGuest) {
            const referees = await getGuestReferees();
            const index = referees.findIndex((candidate) => candidate.id === normalizedReferee.id);
            if (index !== -1) {
                const previousReferee = referees[index];
                const documents = await prepareRefereeDocuments(user, normalizedReferee.id, normalizedReferee, previousReferee.documents || []);
                referees[index] = { ...previousReferee, ...normalizedReferee, documents };
                await saveGuestReferees(referees);
            }
            return;
        }

        const previousDocuments = Array.isArray(referee.previousDocuments) ? referee.previousDocuments : [];
        const documents = await prepareRefereeDocuments(user, normalizedReferee.id, normalizedReferee, previousDocuments);
        await setDoc(doc(db, `users/${user.uid}/referees`, normalizedReferee.id), { ...normalizedReferee, documents }, { merge: true });
    },

    deleteReferee: async (user, refereeId, documents = []) => {
        if (!user || user.isGuest) {
            const referees = (await getGuestReferees()).filter((candidate) => candidate.id !== refereeId);
            await saveGuestReferees(referees);
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
    },

    reorderApplications: async (user, orderedApps) => {
        if (!Array.isArray(orderedApps) || orderedApps.length === 0) {
            return [];
        }

        const reorderedApps = applyManualSortOrder(orderedApps);

        if (!user || user.isGuest) {
            const existingApps = await getGuestData();
            const orderIndex = new Map(reorderedApps.map((app, index) => [app.id, index]));
            const merged = existingApps.map((app) => {
                if (orderIndex.has(app.id)) {
                    return { ...app, sortOrder: orderIndex.get(app.id) };
                }
                return app;
            });
            await saveGuestData(merged);
            return reorderedApps;
        }

        const batch = writeBatch(db);
        reorderedApps.forEach(({ id, sortOrder }) => {
            if (!id) return;
            batch.update(doc(db, `users/${user.uid}/applications`, id), { sortOrder });
        });
        await batch.commit();
        return reorderedApps;
    },

    shareApplicationDocument: shareApplicationDocument,

    // Fire-and-forget pre-fetch of remote documents into the local cache so
    // the first tap opens the share sheet without a network round-trip.
    // Skips documents larger than `maxBytes` (default 5 MB) to avoid burning
    // mobile data on big files the user may never open.
    prewarmDocumentCache: async (documents = [], { maxBytes = 5 * 1024 * 1024 } = {}) => {
        if (!Array.isArray(documents) || documents.length === 0) return;
        const candidates = documents.filter((document) =>
            document?.downloadUrl &&
            (typeof document.size !== 'number' || document.size <= maxBytes)
        );
        await Promise.all(
            candidates.map((document) => ensureDocumentLocalCopy(document).catch(() => undefined))
        );
    }
};
