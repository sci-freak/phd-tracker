import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../config/firebase';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            // If we are currently guest, and firebaseUser is null, don't overwrite
            // UNLESS we want to support "auto-logout" or something?
            // Actually, onAuthStateChanged fires on init.
            // If we want Guest to be a valid state, we should handle it.
            // Simple logic: If firebaseUser exists, it wins.
            // If firebaseUser is null, we stay as is (if guest) OR go to null.
            // But initially, 'user' is null.

            if (firebaseUser) {
                setUser(firebaseUser);
            } else {
                setUser(prev => prev?.isGuest ? prev : null);
            }
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const signIn = (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const signUp = (email, password) => {
        return createUserWithEmailAndPassword(auth, email, password);
    };

    const logout = async () => {
        if (user?.isGuest) {
            setUser(null);
            return Promise.resolve();
        }
        return firebaseSignOut(auth);
    };

    const continueAsGuest = () => {
        setUser({ uid: 'guest', email: 'Guest User', isGuest: true });
    };

    const value = {
        user,
        loading,
        signIn,
        signUp,
        logout,
        continueAsGuest
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
