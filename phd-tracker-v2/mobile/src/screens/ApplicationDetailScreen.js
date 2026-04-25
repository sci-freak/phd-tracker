import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Linking } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { APPLICATION_DOCUMENT_TYPES, normalizeDocuments, normalizeRequirements } from '@phd-tracker/shared/applications';
import { formatDeadlineDate } from '@phd-tracker/shared/dates';
import { getStatusColor } from '@phd-tracker/shared/statuses';
import { db } from '../config/firebase';
import { MobileDataService } from '../services/MobileDataService';
import { useAuth } from '../context/AuthContext';

export default function ApplicationDetailScreen({ navigation, route }) {
    const { applicationId } = route.params;
    const { user } = useAuth();
    const [application, setApplication] = useState(null);
    const [loading, setLoading] = useState(true);
    // Tracks which document is currently being downloaded/opened so we can
    // show a per-row spinner and prevent duplicate share invocations.
    const [openingDocId, setOpeningDocId] = useState(null);

    useEffect(() => {
        if (user?.isGuest) {
            const unsubscribe = MobileDataService.subscribeToApplications(user, (apps) => {
                const app = apps.find((candidate) => candidate.id === applicationId);
                if (app) {
                    setApplication(app);
                } else if (navigation.canGoBack()) {
                    navigation.goBack();
                }
                setLoading(false);
            });
            return unsubscribe;
        }

        const docRef = doc(db, `users/${user.uid}/applications`, applicationId);
        const unsubscribe = onSnapshot(
            docRef,
            (docSnap) => {
                if (docSnap.exists()) {
                    setApplication({ id: docSnap.id, ...docSnap.data() });
                } else if (navigation.canGoBack()) {
                    navigation.goBack();
                } else {
                    navigation.navigate('Home');
                }
                setLoading(false);
            },
            () => {
                Alert.alert('Error', 'Failed to fetch application details');
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [applicationId, navigation, user]);

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
                            await MobileDataService.deleteApplication(
                                user,
                                applicationId,
                                normalizeDocuments(application?.documents, application?.file, application?.files)
                            );
                        } catch {
                            Alert.alert('Error', 'Failed to delete application');
                        }
                    }
                }
            ]
        );
    };

    const handleOpenLink = (url) => {
        if (!url) return;

        const finalUrl = url.startsWith('http://') || url.startsWith('https://')
            ? url
            : `https://${url}`;

        Linking.openURL(finalUrl).catch(() => Alert.alert('Error', "Couldn't open link"));
    };

    const handleOpenDocument = async (document) => {
        if (openingDocId) return;
        setOpeningDocId(document.id);
        try {
            await MobileDataService.shareApplicationDocument(document);
        } catch (error) {
            console.warn('shareApplicationDocument failed', error);
            Alert.alert('Error', error?.message || 'Failed to open document');
        } finally {
            setOpeningDocId(null);
        }
    };

    // Pre-warm the local file cache for small remote documents so the user's
    // first tap opens the share sheet without an extra network round-trip.
    useEffect(() => {
        if (!application) return;
        const docs = normalizeDocuments(application.documents, application.file, application.files);
        MobileDataService.prewarmDocumentCache(docs).catch(() => undefined);
    }, [application]);

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    if (!application) return null;

    const requirements = normalizeRequirements(application.requirements);
    const documents = normalizeDocuments(application.documents, application.file, application.files);

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
                    <TouchableOpacity style={styles.ctaButton} onPress={() => handleOpenLink(application.website)}>
                        <Text style={styles.ctaButtonText}>Website ↗</Text>
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
                    {application.deadline ? formatDeadlineDate(application.deadline, 'None') : 'None'}
                </Text>
            </View>

            {requirements.length > 0 ? (
                <View style={styles.section}>
                    <Text style={styles.label}>Requirements</Text>
                    <View style={styles.requirementsWrap}>
                        {requirements.map((requirement) => (
                            <View key={requirement} style={styles.reqBadge}>
                                <Text style={styles.reqText}>{requirement}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            ) : null}

            {documents.length > 0 ? (
                <View style={styles.section}>
                    <Text style={styles.label}>Documents</Text>
                    <View style={styles.documentsList}>
                        {documents.map((document) => {
                            const isOpening = openingDocId === document.id;
                            const isAnotherOpening = openingDocId && !isOpening;
                            return (
                                <TouchableOpacity
                                    key={document.id}
                                    style={[styles.documentButton, isAnotherOpening && styles.documentButtonDisabled]}
                                    onPress={() => handleOpenDocument(document)}
                                    disabled={!!openingDocId}
                                >
                                    <View style={styles.documentRow}>
                                        <View style={styles.documentTextWrap}>
                                            <Text style={styles.documentTitle}>{document.name}</Text>
                                            <Text style={styles.documentMeta}>
                                                {APPLICATION_DOCUMENT_TYPES.find((option) => option.value === document.category)?.label || 'Document'}
                                            </Text>
                                        </View>
                                        {isOpening ? (
                                            <ActivityIndicator size="small" color="#3b82f6" />
                                        ) : null}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            ) : null}

            {application.notes ? (
                <View style={styles.section}>
                    <Text style={styles.label}>Notes</Text>
                    <Text style={styles.value}>{application.notes}</Text>
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
        marginBottom: 6,
    },
    value: {
        color: '#fff',
        fontSize: 18,
    },
    ctaButton: {
        backgroundColor: 'rgba(59, 130, 246, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.4)',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        alignSelf: 'flex-start',
    },
    ctaButtonText: {
        color: '#60a5fa',
        fontSize: 16,
        fontWeight: '700',
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
    requirementsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 4,
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
    },
    documentsList: {
        gap: 10,
    },
    documentButton: {
        backgroundColor: '#1e293b',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 10,
        padding: 12,
    },
    documentButtonDisabled: {
        opacity: 0.5,
    },
    documentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    documentTextWrap: {
        flex: 1,
    },
    documentTitle: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
    },
    documentMeta: {
        color: '#94a3b8',
        fontSize: 12,
        marginTop: 4,
    }
});
