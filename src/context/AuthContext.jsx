
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider } from '../config/firebase';
import {
    signInWithPopup,
    signInWithCredential,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword
} from 'firebase/auth';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    async function signInWithGoogle() {
        // In Electron, use the custom IPC-based flow
        if (window.electronAPI?.firebaseGoogleLogin) {
            const { idToken, accessToken } = await window.electronAPI.firebaseGoogleLogin();
            const credential = GoogleAuthProvider.credential(idToken, accessToken || undefined);
            const userCredential = await signInWithCredential(auth, credential);
            return userCredential;
        }
        // In browser, use the standard popup flow
        const result = await signInWithPopup(auth, googleProvider);
        return result;
    }

    function signInWithEmail(email, password) {
        return signInWithEmailAndPassword(auth, email, password);
    }

    function signUpWithEmail(email, password) {
        return createUserWithEmailAndPassword(auth, email, password);
    }

    async function signOut() {
        if (window.electronAPI?.logoutGoogle) {
            try {
                await window.electronAPI.logoutGoogle();
            } catch (error) {
                console.error('Failed to clear stored Google calendar session', error);
            }
        }
        if (currentUser?.isGuest) {
            setCurrentUser(null);
            return Promise.resolve();
        }
        return firebaseSignOut(auth);
    }

    function continueAsGuest() {
        setCurrentUser({ uid: 'guest', isGuest: true, email: 'Guest User' });
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            // Only update if we are not currently in guest mode, 
            // or if we want real login to override guest mode (which we do)
            if (user) {
                setCurrentUser(user);
            } else {
                // If we were guest, stay guest? No, usually auth state change means logout or init.
                // But if we explicitly logout (signOut called), we want to go to null.
                // If init, we default to null.
                // If we are guest, 'user' is null. We should check if we *intent* to be guest.
                // Actually, simple logic: if firebase user exists, use it. Else null (unless manually set to guest).

                setCurrentUser(prev => prev?.isGuest ? prev : null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        continueAsGuest
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
