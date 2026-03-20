import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

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

    const handleEmailAuth = async (e) => {
        e.preventDefault();
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
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        width: '100%',
        padding: '0.75rem',
        marginBottom: '1rem',
        backgroundColor: '#0f172a',
        border: '1px solid #334155',
        borderRadius: '0.5rem',
        color: '#fff',
        fontSize: '1rem'
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0f172a',
            color: '#fff'
        }}>
            {window.electronAPI && (
                <div style={{
                    position: 'fixed', top: 0, right: 0, display: 'flex', zIndex: 9999,
                    WebkitAppRegion: 'no-drag'
                }}>
                    <button onClick={() => window.electronAPI.minimize()}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', width: 46, height: 32, cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>-</button>
                    <button onClick={() => window.electronAPI.maximize()}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1rem', width: 46, height: 32, cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>[ ]</button>
                    <button onClick={() => window.electronAPI.close()}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.5rem', width: 46, height: 32, cursor: 'pointer' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = 'white'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}>X</button>
                </div>
            )}
            {window.electronAPI && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 140, height: 32, WebkitAppRegion: 'drag', zIndex: 9998 }} />
            )}
            <div style={{
                padding: '2rem',
                backgroundColor: '#1e293b',
                borderRadius: '1rem',
                textAlign: 'center',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                width: '100%',
                maxWidth: '400px'
            }}>
                <h1 style={{ marginBottom: '0.5rem' }}>PhD Tracker</h1>
                <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>
                    {isSignUp ? 'Create an account' : 'Sign in to manage your applications'}
                </p>

                {error && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}

                <form onSubmit={handleEmailAuth} style={{ marginBottom: '1.5rem' }}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={inputStyle}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={inputStyle}
                        required
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            backgroundColor: '#3b82f6',
                            color: '#fff',
                            border: 'none',
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            fontSize: '1rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
                    </button>
                </form>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.5rem 0' }}>
                    <div style={{ flex: 1, height: '1px', backgroundColor: '#334155' }}></div>
                    <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>OR</span>
                    <div style={{ flex: 1, height: '1px', backgroundColor: '#334155' }}></div>
                </div>

                <button
                    onClick={handleGoogleLogin}
                    style={{
                        width: '100%',
                        backgroundColor: '#fff',
                        color: '#333',
                        border: 'none',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        fontSize: '1rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        marginBottom: '1rem'
                    }}
                >
                    <img src="https://www.google.com/favicon.ico" alt="Google" style={{ width: 18, height: 18 }} />
                    Sign In with Google
                </button>

                <button
                    onClick={continueAsGuest}
                    style={{
                        width: '100%',
                        backgroundColor: 'transparent',
                        color: '#94a3b8',
                        border: '1px solid #334155',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.borderColor = '#94a3b8';
                        e.currentTarget.style.color = '#e2e8f0';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.borderColor = '#334155';
                        e.currentTarget.style.color = '#94a3b8';
                    }}
                >
                    Continue as Guest
                </button>

                <p style={{ marginTop: '1.5rem', color: '#94a3b8', fontSize: '0.9rem' }}>
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#3b82f6',
                            cursor: 'pointer',
                            marginLeft: '0.5rem',
                            fontWeight: '600',
                            fontSize: 'inherit'
                        }}
                    >
                        {isSignUp ? 'Sign In' : 'Sign Up'}
                    </button>
                </p>
            </div>
        </div>
    );
}
