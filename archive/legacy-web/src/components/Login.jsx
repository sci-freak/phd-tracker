import React, { useState } from 'react';
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleGoogleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Error signing in with Google", error);
            alert(`Failed to sign in: ${error.message}`);
        }
    };

    const handleEmailLogin = async (e) => {
        e.preventDefault();
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error("Error signing in with Email", error);
            alert(`Failed to sign in: ${error.message}`);
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)'
        }}>
            <h1>PhD Tracker</h1>
            <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>Sign in to sync your applications across devices.</p>

            <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '300px', marginBottom: '2rem' }}>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ padding: '0.8rem', borderRadius: '4px', border: '1px solid #ccc' }}
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ padding: '0.8rem', borderRadius: '4px', border: '1px solid #ccc' }}
                    required
                />
                <button
                    type="submit"
                    className="btn-action"
                    style={{ padding: '0.8rem', background: 'var(--accent-primary)', color: 'white' }}
                >
                    Sign In with Email
                </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', width: '300px' }}>
                <div style={{ flex: 1, height: '1px', background: '#ccc' }}></div>
                <span style={{ color: 'var(--text-secondary)' }}>OR</span>
                <div style={{ flex: 1, height: '1px', background: '#ccc' }}></div>
            </div>

            <button
                onClick={handleGoogleLogin}
                className="btn-action"
                style={{
                    padding: '1rem 2rem',
                    fontSize: '1.1rem',
                    background: 'white',
                    color: '#333',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                }}
            >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '24px' }} />
                Sign in with Google
            </button>
        </div>
    );
};

export default Login;
