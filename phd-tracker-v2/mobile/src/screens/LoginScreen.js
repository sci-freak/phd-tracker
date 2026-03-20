import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useAuth } from '../context/AuthContext';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../config/firebase';

WebBrowser.maybeCompleteAuthSession();

// User should replace this with their actual Firebase Web Client ID
const GOOGLE_WEB_CLIENT_ID = '203521050176-l92asmu4f3i32d88a55dfqeqj5hlrmbr.apps.googleusercontent.com';

export default function LoginScreen() {
    const { signIn, signUp, continueAsGuest } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);

    // Using Expo's native auth configuration instead of the deprecated proxy route
    const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
        clientId: GOOGLE_WEB_CLIENT_ID, // Force the id_token audience to be the Web Client ID for Firebase
        webClientId: GOOGLE_WEB_CLIENT_ID,
        androidClientId: '852501777550-a8q3o4srrpb5cu7rd7hiu1a3rruta3jc.apps.googleusercontent.com', // Actually use the registered Android credentials
        redirectUri: makeRedirectUri({
            scheme: 'com.drharshsriv.phdtracker' // Native Android requires the package name as the scheme
        }),
    });

    useEffect(() => {
        if (request) {
            console.log('Redirect URI:', request.redirectUri);
        }
    }, [request]);

    useEffect(() => {
        if (response?.type === 'success') {
            const { id_token } = response.params;
            const credential = GoogleAuthProvider.credential(id_token);
            setLoading(true);
            signInWithCredential(auth, credential)
                .catch((error) => {
                    Alert.alert('Login Failed', error.message);
                })
                .finally(() => {
                    setLoading(false);
                });
        }
    }, [response]);

    const handleEmailAuth = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter email and password');
            return;
        }
        setLoading(true);
        try {
            if (isSignUp) {
                await signUp(email, password);
            } else {
                await signIn(email, password);
            }
        } catch (error) {
            Alert.alert('Authentication Failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>PhD Tracker</Text>
            <Text style={styles.subtitle}>Sign in to sync your applications</Text>

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#666"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />
                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#666"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />
            </View>

            <TouchableOpacity style={styles.button} onPress={handleEmailAuth} disabled={loading}>
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>{isSignUp ? 'Sign Up' : 'Sign In'} with Email</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={{ marginTop: 15 }}>
                <Text style={{ color: '#3b82f6', fontSize: 16 }}>
                    {isSignUp ? 'Already have an account? Sign In' : 'Don\'t have an account? Sign Up'}
                </Text>
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.divider} />
            </View>

            <TouchableOpacity
                style={[styles.button, styles.googleButton]}
                onPress={() => promptAsync()}
                disabled={!request || loading}
            >
                <Text style={[styles.buttonText, styles.googleButtonText]}>Sign In with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.button, styles.guestButton]}
                onPress={continueAsGuest}
            >
                <Text style={[styles.buttonText, styles.guestButtonText]}>Continue as Guest</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#94a3b8',
        marginBottom: 40,
    },
    inputContainer: {
        width: '100%',
        marginBottom: 20,
    },
    input: {
        backgroundColor: '#1e293b',
        color: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#334155',
    },
    button: {
        backgroundColor: '#3b82f6',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 10,
        width: '100%',
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
        width: '100%',
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: '#334155',
    },
    dividerText: {
        color: '#94a3b8',
        marginHorizontal: 10,
    },
    googleButton: {
        backgroundColor: '#fff',
        marginBottom: 15,
    },
    googleButtonText: {
        color: '#333',
    },
    guestButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#3b82f6',
    },
    guestButtonText: {
        color: '#3b82f6',
    },
});
