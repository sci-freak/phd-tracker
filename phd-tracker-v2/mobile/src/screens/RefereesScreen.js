import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    TextInput,
    Modal,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createEmptyRefereeDraft } from '@phd-tracker/shared/referees';
import { useAuth } from '../context/AuthContext';
import { MobileDataService } from '../services/MobileDataService';

export default function RefereesScreen() {
    const { user } = useAuth();
    const [referees, setReferees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editorVisible, setEditorVisible] = useState(false);
    const [draft, setDraft] = useState(createEmptyRefereeDraft());
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!user) return;
        const unsubscribe = MobileDataService.subscribeToReferees(user, (next) => {
            setReferees(next);
            setLoading(false);
        });
        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, [user]);

    const isEditing = editingId !== null;
    const headerTitle = useMemo(() => (isEditing ? 'Edit Referee' : 'Add Referee'), [isEditing]);

    const openForNew = () => {
        setDraft(createEmptyRefereeDraft());
        setEditingId(null);
        setEditorVisible(true);
    };

    const openForEdit = (referee) => {
        setDraft({
            name: referee.name || '',
            email: referee.email || '',
            notes: referee.notes || '',
            documents: referee.documents || []
        });
        setEditingId(referee.id);
        setEditorVisible(true);
    };

    const closeEditor = () => {
        if (saving) return;
        setEditorVisible(false);
        setDraft(createEmptyRefereeDraft());
        setEditingId(null);
    };

    const handleSave = async () => {
        const trimmedEmail = draft.email.trim();
        if (!trimmedEmail) {
            Alert.alert('Email required', 'Please enter the referee\u2019s email address.');
            return;
        }

        setSaving(true);
        try {
            if (isEditing) {
                await MobileDataService.updateReferee(user, { ...draft, id: editingId });
            } else {
                await MobileDataService.addReferee(user, draft);
            }
            setEditorVisible(false);
            setDraft(createEmptyRefereeDraft());
            setEditingId(null);
        } catch (error) {
            console.error(error);
            Alert.alert('Save failed', error?.message || 'Could not save referee.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (referee) => {
        Alert.alert(
            'Delete referee?',
            `Remove ${referee.name || referee.email} and their documents?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await MobileDataService.deleteReferee(user, referee.id, referee.documents || []);
                        } catch (error) {
                            console.error(error);
                            Alert.alert('Delete failed', error?.message || 'Could not delete referee.');
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => openForEdit(item)} activeOpacity={0.85}>
            <View style={styles.cardHeader}>
                <Text style={styles.name} numberOfLines={1}>
                    {item.name || item.email}
                </Text>
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(item)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
            </View>
            <Text style={styles.email}>{item.email}</Text>
            {item.notes ? <Text style={styles.notes} numberOfLines={3}>{item.notes}</Text> : null}
            {item.documents && item.documents.length > 0 ? (
                <Text style={styles.docsMeta}>
                    {item.documents.length} document{item.documents.length === 1 ? '' : 's'}
                </Text>
            ) : null}
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <FlatList
                data={referees}
                keyExtractor={(item) => item.id || item.email}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>
                        No referees yet. Tap + to add one.
                    </Text>
                }
            />

            <TouchableOpacity style={styles.fab} onPress={openForNew} activeOpacity={0.85}>
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>

            <Modal
                visible={editorVisible}
                animationType="slide"
                transparent
                onRequestClose={closeEditor}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>{headerTitle}</Text>
                        <ScrollView keyboardShouldPersistTaps="handled">
                            <Text style={styles.label}>Name</Text>
                            <TextInput
                                style={styles.input}
                                value={draft.name}
                                onChangeText={(value) => setDraft((prev) => ({ ...prev, name: value }))}
                                placeholder="Full name"
                                placeholderTextColor="#64748b"
                                editable={!saving}
                            />

                            <Text style={styles.label}>Email *</Text>
                            <TextInput
                                style={styles.input}
                                value={draft.email}
                                onChangeText={(value) => setDraft((prev) => ({ ...prev, email: value }))}
                                placeholder="name@example.com"
                                placeholderTextColor="#64748b"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                editable={!saving}
                            />

                            <Text style={styles.label}>Notes</Text>
                            <TextInput
                                style={[styles.input, styles.multiline]}
                                value={draft.notes}
                                onChangeText={(value) => setDraft((prev) => ({ ...prev, notes: value }))}
                                placeholder="Any relevant context..."
                                placeholderTextColor="#64748b"
                                multiline
                                editable={!saving}
                            />
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={closeEditor}
                                disabled={saving}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton, saving && styles.disabledButton]}
                                onPress={handleSave}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.saveButtonText}>Save</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a'
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#0f172a',
        alignItems: 'center',
        justifyContent: 'center'
    },
    list: {
        padding: 16,
        paddingBottom: 120
    },
    emptyText: {
        color: '#94a3b8',
        textAlign: 'center',
        marginTop: 40
    },
    card: {
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#334155'
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
        gap: 8
    },
    name: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
        flex: 1
    },
    email: {
        color: '#60a5fa',
        fontSize: 14,
        marginBottom: 6
    },
    notes: {
        color: '#cbd5e1',
        fontSize: 13,
        marginBottom: 6
    },
    docsMeta: {
        color: '#94a3b8',
        fontSize: 12
    },
    deleteButton: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.4)'
    },
    deleteButtonText: {
        color: '#f87171',
        fontSize: 12,
        fontWeight: '600'
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        backgroundColor: '#3b82f6',
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4
    },
    fabText: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '600',
        lineHeight: 30
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        padding: 16
    },
    modalCard: {
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 20,
        borderWidth: 1,
        borderColor: '#334155',
        maxHeight: '85%'
    },
    modalTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12
    },
    label: {
        color: '#cbd5e1',
        fontSize: 13,
        marginTop: 8,
        marginBottom: 4
    },
    input: {
        backgroundColor: '#0f172a',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#334155',
        color: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14
    },
    multiline: {
        minHeight: 80,
        textAlignVertical: 'top'
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        marginTop: 14
    },
    modalButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        minWidth: 88,
        alignItems: 'center',
        justifyContent: 'center'
    },
    cancelButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#334155'
    },
    cancelButtonText: {
        color: '#cbd5e1',
        fontWeight: '600'
    },
    saveButton: {
        backgroundColor: '#3b82f6'
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: '700'
    },
    disabledButton: {
        opacity: 0.7
    }
});
