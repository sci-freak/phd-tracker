import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
    apiKey: "AIzaSyBMKamRH46rYKo3fyrA34DUss3ittZQOvQ",
    authDomain: "phd-tracker-ae84e.firebaseapp.com",
    projectId: "phd-tracker-ae84e",
    storageBucket: "phd-tracker-ae84e.firebasestorage.app",
    messagingSenderId: "852501777550",
    appId: "1:852501777550:web:d8e1d1f1cd63ced6e18ddf",
    measurementId: "G-V9PE12DENN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export const db = getFirestore(app);
export { auth };
export const googleProvider = new GoogleAuthProvider();

export default app;
