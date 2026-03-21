import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyBMKamRH46rYKo3fyrA34DUss3ittZQOvQ",
    authDomain: "phd-tracker-ae84e.firebaseapp.com",
    projectId: "phd-tracker-ae84e",
    storageBucket: "phd-tracker-ae84e.firebasestorage.app",
    messagingSenderId: "852501777550",
    appId: "1:852501777550:web:d8e1d1f1cd63ced6e18ddf",
    measurementId: "G-V9PE12DENN"
};

export const GOOGLE_WEB_CLIENT_ID = "852501777550-7vlcc4vq4pn4ar50in5qg6879n87d0b4.apps.googleusercontent.com";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events.readonly');

export default app;
