import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';

export default function MobileConflictResolutionModal({ visible, onClose, guestApps, onResolve }) {
    const [resolutions, setResolutions] = useState({}); // { [appId]: 'auto' | 'manual' | 'skip' }
    const [manualNames, setManualNames] = useState({}); // { [appId]: 'New Name' }

    if (!visible) return null;

    const handleResolutionChange = (appId, resolution) => {
        setResolutions(prev => ({ ...prev, [appId]: resolution }));
    };

    const handleManualNameChange = (appId, name) => {
        setManualNames(prev => ({ ...prev, [appId]: name }));
    };

    const handleConfirm = () => {
        const resolvedApps = guestApps.map(app => {
            const resolution = resolutions[app.id] || 'auto';
            if (resolution === 'skip') return null;

            let newApp = { ...app };
            // Strip ID to allow Firestore to generate new one
            // delete newApp.id; // Actually, MobileDataService or Firestore will handle ID generation if we pass it without ID or use addDoc.
            // But we should return the object structure we want to save.

            if (resolution === 'auto') {
                newApp.university = `${newApp.university} (Local)`;
            } else if (resolution === 'manual') {
                newApp.university = manualNames[app.id] || `${newApp.university} (Renamed)`;
            }
            return newApp;
        }).filter(Boolean);

        onResolve(resolvedApps);
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Sync Local Data</Text>
                    <Text style={styles.modalSubtitle}>
                        You have applications saved locally. How would you like to merge them with your cloud account?
                    </Text>

                    <ScrollView style={styles.scrollView}>
                        {guestApps.map(app => (
                            <View key={app.id} style={styles.appCard}>
                                <Text style={styles.appName}>{app.university} - {app.program}</Text>

                                <TouchableOpacity
                                    style={styles.optionRow}
                                    onPress={() => handleResolutionChange(app.id, 'auto')}
                                >
                                    <View style={[styles.radio, (!resolutions[app.id] || resolutions[app.id] === 'auto') && styles.radioActive]} />
                                    <Text style={styles.optionText}>Rename Auto (Add "Local")</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.optionRow}
                                    onPress={() => handleResolutionChange(app.id, 'manual')}
                                >
                                    <View style={[styles.radio, resolutions[app.id] === 'manual' && styles.radioActive]} />
                                    <Text style={styles.optionText}>Rename Manually</Text>
                                </TouchableOpacity>

                                {resolutions[app.id] === 'manual' && (
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter new university name"
                                        placeholderTextColor="#94a3b8"
                                        value={manualNames[app.id] || ''}
                                        onChangeText={(text) => handleManualNameChange(app.id, text)}
                                    />
                                )}

                                <TouchableOpacity
                                    style={styles.optionRow}
                                    onPress={() => handleResolutionChange(app.id, 'skip')}
                                >
                                    <View style={[styles.radio, resolutions[app.id] === 'skip' && styles.radioActive]} />
                                    <Text style={styles.optionText}>Skip (Don't Sync)</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={styles.discardButton}
                            onPress={onClose}
                        >
                            <Text style={styles.discardText}>Keep Separate</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.mergeButton}
                            onPress={handleConfirm}
                        >
                            <Text style={styles.mergeText}>Merge Selected</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 20,
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
        textAlign: 'center',
    },
    modalSubtitle: {
        color: '#cbd5e1',
        marginBottom: 20,
        textAlign: 'center',
    },
    scrollView: {
        marginBottom: 20,
    },
    appCard: {
        backgroundColor: '#0f172a',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#334155',
    },
    appName: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 12,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#94a3b8',
        marginRight: 10,
    },
    radioActive: {
        borderColor: '#3b82f6',
        backgroundColor: '#3b82f6',
    },
    optionText: {
        color: '#cbd5e1',
        fontSize: 14,
    },
    input: {
        backgroundColor: '#1e293b',
        color: '#fff',
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom: 10,
        marginLeft: 30,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        justifyContent: 'flex-end',
    },
    discardButton: {
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#475569',
        flex: 1,
        alignItems: 'center',
    },
    discardText: {
        color: '#94a3b8',
        fontWeight: '600',
    },
    mergeButton: {
        backgroundColor: '#3b82f6',
        padding: 12,
        borderRadius: 8,
        flex: 1,
        alignItems: 'center',
    },
    mergeText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});
