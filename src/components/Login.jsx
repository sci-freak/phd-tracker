import React, { useState } from 'react';
import { GraduationCap, Minus, Square, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../styles/App.css';

export default function Login() {
    const { signInWithGoogle, signInWithEmail, signUpWithEmail, continueAsGuest } = useAuth();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGoogleLogin = async () => {
        try {
            setError('');
            await signInWithGoogle();
        } catch (err) {
            setError('Failed to sign in with Google');
            console.error(err);
        }
    };

    const handleEmailAuth = async (event) => {
        event.preventDefault();
        if (!email || !password) return;

        try {
            setError('');
            setLoading(true);
            if (isSignUp) {
                await signUpWithEmail(email, password);
            } else {
                await signInWithEmail(email, password);
            }
        } catch (err) {
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const isElectron = typeof window !== 'undefined' && Boolean(window.electronAPI);

    return (
        <div className="login-shell">
            {isElectron && <div className="electron-titlebar" aria-hidden="true" />}
            {isElectron && (
                <div className="electron-window-controls">
                    <button type="button" aria-label="Minimize" onClick={() => window.electronAPI.minimize()}>
                        <Minus size={14} aria-hidden="true" />
                    </button>
                    <button type="button" aria-label="Maximize" onClick={() => window.electronAPI.maximize()}>
                        <Square size={12} aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        aria-label="Close"
                        className="electron-close"
                        onClick={() => window.electronAPI.close()}
                    >
                        <X size={14} aria-hidden="true" />
                    </button>
                </div>
            )}

            <div className="login-card">
                <div className="login-card__brand">
                    <span className="login-card__logo" aria-hidden="true">
                        <GraduationCap size={24} />
                    </span>
                    <h1 className="login-card__title">PhD Tracker</h1>
                    <p className="login-card__subtitle">
                        {isSignUp ? 'Create an account to get started.' : 'Sign in to manage your applications.'}
                    </p>
                </div>

                {error && (
                    <div className="login-card__error" role="alert">
                        {error}
                    </div>
                )}

                <form onSubmit={handleEmailAuth} className="login-card__form">
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete={isSignUp ? 'new-password' : 'current-password'}
                        required
                    />
                    <button
                        type="submit"
                        className="btn-primary btn-block"
                        disabled={loading}
                    >
                        {loading ? 'Processing…' : (isSignUp ? 'Create account' : 'Sign in')}
                    </button>
                </form>

                <div className="login-card__divider">
                    <span>or</span>
                </div>

                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="btn-action btn-block btn-google"
                >
                    <img
                        src="https://www.google.com/favicon.ico"
                        alt=""
                        aria-hidden="true"
                        style={{ width: 18, height: 18 }}
                    />
                    Continue with Google
                </button>

                <button
                    type="button"
                    onClick={continueAsGuest}
                    className="btn-action btn-block"
                >
                    Continue as Guest
                </button>

                <p className="login-card__toggle">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                    <button
                        type="button"
                        onClick={() => setIsSignUp((prev) => !prev)}
                        className="login-card__toggle-button"
                    >
                        {isSignUp ? 'Sign in' : 'Sign up'}
                    </button>
                </p>
            </div>
        </div>
    );
}
