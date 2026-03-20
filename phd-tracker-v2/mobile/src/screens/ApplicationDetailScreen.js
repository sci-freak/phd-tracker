import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Linking } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { MobileDataService } from '../services/MobileDataService';
import { useAuth } from '../context/AuthContext';

export default function ApplicationDetailScreen({ navigation, route }) {
    const { applicationId } = route.params;
    const { user } = useAuth();
    const [application, setApplication] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.isGuest) {
            // For Guest, we can simulate subscription via polling or manual fetch
            // Using MobileDataService.subscribe would be best for consistency if extended to support single doc
            // But MobileDataService currently subscribes to ALL apps.
            // Let's simple fetch for now and maybe poll. 
            // Better: subscribe to all and filter? It's cheap for local.

            const unsubscribe = MobileDataService.subscribeToApplications(user, (apps) => {
                const app = apps.find(a => a.id === applicationId);
                if (app) {
                    setApplication(app);
                } else {
                    // Deleted
                    if (navigation.canGoBack()) navigation.goBack();
                }
                setLoading(false);
            });
            return unsubscribe;
        } else {
            const docRef = doc(db, `users/${user.uid}/applications`, applicationId);
            const unsubscribe = onSnapshot(docRef, (docSnap) => {
                if (docSnap.exists()) {
                    setApplication({ id: docSnap.id, ...docSnap.data() });
                } else {
                    if (navigation.canGoBack()) {
                        navigation.goBack();
                    } else {
                        navigation.navigate('Home');
                    }
                }
                setLoading(false);
            }, (error) => {
                Alert.alert('Error', 'Failed to fetch application details');
                setLoading(false);
            });
            return () => unsubscribe();
        }
    }, [applicationId, user]);

    const handleDelete = async () => {
        Alert.alert(
            'Delete Application',
            'Are you sure you want to delete this application?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await MobileDataService.deleteApplication(user, applicationId);
                            // Navigation handled by listener
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete application');
                        }
                    }
                }
            ]
        );
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Accepted': return '#22c55e';
            case 'Rejected': return '#ef4444';
            case 'Submitted': return '#3b82f6';
            default: return '#64748b';
        }
    };

    const handleOpenLink = (url) => {
        if (!url) return;
        let finalUrl = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            finalUrl = `https://${url}`;
        }
        Linking.openURL(finalUrl).catch(err => Alert.alert("Error", "Couldn't open link"));
    };

    const LinkText = ({ text }) => {
        const urlRegex = /((?:https?:\/\/|www\.)[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/g;
        const parts = text.split(urlRegex);

        return (
            <Text style={styles.value}>
                {parts.map((part, i) => {
                    if (part.match(urlRegex) && (part.includes('.') || part.includes('localhost'))) {
                        return (
                            <Text
                                key={i}
                                style={styles.link}
                                onPress={() => handleOpenLink(part)}
                            >
                                {part}
                            </Text>
                        );
                    }
                    return part;
                })}
            </Text>
        );
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    if (!application) return null;

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.university}>{application.university}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(application.status) }]}>
                    <Text style={styles.statusText}>{application.status}</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Program</Text>
                <Text style={styles.value}>{application.program}</Text>
            </View>

            {application.department ? (
                <View style={styles.section}>
                    <Text style={styles.label}>Department</Text>
                    <Text style={styles.value}>{application.department}</Text>
                </View>
            ) : null}

            <View style={styles.section}>
                <Text style={styles.label}>Country</Text>
                <Text style={styles.value}>{application.country || 'N/A'}</Text>
            </View>

            {application.website ? (
                <View style={styles.section}>
                    <Text style={styles.label}>Website</Text>
                    <TouchableOpacity onPress={() => handleOpenLink(application.website)}>
                        <Text style={[styles.value, styles.link]}>{application.website}</Text>
                    </TouchableOpacity>
                </View>
            ) : null}

            {application.qsRanking ? (
                <View style={styles.section}>
                    <Text style={styles.label}>QS Ranking</Text>
                    <Text style={styles.value}>{application.qsRanking}</Text>
                </View>
            ) : null}

            <View style={styles.section}>
                <Text style={styles.label}>Deadline</Text>
                <Text style={styles.value}>
                    {application.deadline ? (() => {
                        const [y, m, d] = application.deadline.split('-');
                        return `${d}-${m}-${y}`;
                    })() : 'None'}
                </Text>
            </View>

            {application.requirements ? (
                <View style={styles.section}>
                    <Text style={styles.label}>Requirements</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                        {Array.isArray(application.requirements) ? application.requirements.map(req => (
                            <View key={req} style={styles.reqBadge}>
                                <Text style={styles.reqText}>{req}</Text>
                            </View>
                        )) : (
                            <Text style={styles.value}>{application.requirements}</Text>
                        )}
                    </View>
                </View>
            ) : null}

            {application.notes ? (
                <View style={styles.section}>
                    <Text style={styles.label}>Notes</Text>
                    <LinkText text={application.notes} />
                </View>
            ) : null}

            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => navigation.navigate('AddEdit', { applicationId: application.id })}
                >
                    <Text style={styles.buttonText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={handleDelete}
                >
                    <Text style={styles.buttonText}>Delete</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
        padding: 20,
    },
    centered: {
        flex: 1,
        backgroundColor: '#0f172a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        marginBottom: 30,
    },
    university: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    section: {
        marginBottom: 20,
    },
    label: {
        color: '#94a3b8',
        fontSize: 14,
        marginBottom: 4,
    },
    value: {
        color: '#fff',
        fontSize: 18,
    },
    link: {
        color: '#3b82f6',
        textDecorationLine: 'underline',
    },
    actions: {
        flexDirection: 'row',
        gap: 15,
        marginTop: 20,
        marginBottom: 40,
    },
    editButton: {
        flex: 1,
        backgroundColor: '#3b82f6',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    deleteButton: {
        flex: 1,
        backgroundColor: '#ef4444',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    reqBadge: {
        backgroundColor: 'rgba(56, 189, 248, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    reqText: {
        color: '#38bdf8',
        fontSize: 14,
    }
});
