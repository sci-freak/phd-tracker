import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { doc, getDoc } from 'firebase/firestore';
import {
    APPLICATION_DOCUMENT_TYPES,
    createApplicationSubmission,
    createEmptyApplicationDraft,
    normalizeDocuments,
    normalizeRequirements
} from '@phd-tracker/shared/applications';
import { formatDeadlineDate, toDateInputValue } from '@phd-tracker/shared/dates';
import { APPLICATION_STATUSES } from '@phd-tracker/shared/statuses';
import CountryPicker from '../components/CountryPicker';
import CustomDatePicker from '../components/CustomDatePicker';
import { MobileDataService } from '../services/MobileDataService';
import { useAuth } from '../context/AuthContext';
import { db } from '../config/firebase';

const MAX_DOCUMENT_SIZE = 2 * 1024 * 1024;

export default function AddEditApplicationScreen({ navigation, route }) {
    const { applicationId } = route.params || {};
    const isEditing = Boolean(applicationId);
    const { user } = useAuth();

    const [loading, setLoading] = useState(false);
    const [showCountryPicker, setShowCountryPicker] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [requirementsList, setRequirementsList] = useState([]);
    const [newRequirement, setNewRequirement] = useState('');
    const [documents, setDocuments] = useState([]);
    const [selectedDocumentType, setSelectedDocumentType] = useState('sop');
    const [formData, setFormData] = useState(() => createEmptyApplicationDraft());

    useEffect(() => {
        if (!isEditing) return;

        let cancelled = false;

        const fetchApplication = async () => {
            setLoading(true);
            try {
                if (user?.isGuest) {
                    const apps = await MobileDataService.fetchGuestData();
                    if (cancelled) return;
                    const app = apps.find((item) => item.id === applicationId);

                    if (!app) {
                        Alert.alert('Error', 'Application not found');
                        navigation.goBack();
                        return;
                    }

                    setFormData(app);
                    setRequirementsList(normalizeRequirements(app.requirements));
                    setDocuments(normalizeDocuments(app.documents, app.file, app.files));
                    return;
                }

                const docRef = doc(db, `users/${user.uid}/applications`, applicationId);
                const docSnap = await getDoc(docRef);
                if (cancelled) return;

                if (!docSnap.exists()) {
                    Alert.alert('Error', 'Application not found');
                    navigation.goBack();
                    return;
                }

                const data = docSnap.data();
                setFormData(data);
                setRequirementsList(normalizeRequirements(data.requirements));
                setDocuments(normalizeDocuments(data.documents, data.file, data.files));
            } catch {
                if (!cancelled) {
                    Alert.alert('Error', 'Failed to fetch application details');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchApplication();

        return () => {
            cancelled = true;
        };
    }, [applicationId, isEditing, user, navigation]);

    const onDateChange = (selectedDate) => {
        if (selectedDate) {
            setFormData({ ...formData, deadline: toDateInputValue(selectedDate) });
        }
    };

    const addRequirement = () => {
        const trimmed = newRequirement.trim();
        if (!trimmed) return;

        setRequirementsList((current) => [...current, trimmed]);
        setNewRequirement('');
    };

    const removeRequirement = (indexToRemove) => {
        setRequirementsList((current) => current.filter((_, index) => index !== indexToRemove));
    };

    const handleDocumentPick = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/*'],
                copyToCacheDirectory: true,
                multiple: false
            });

            if (result.canceled || !result.assets?.length) {
                return;
            }

            const asset = result.assets[0];
            if (asset.size && asset.size > MAX_DOCUMENT_SIZE) {
                Alert.alert('File too large', 'Please choose a document under 2MB.');
                return;
            }

            setDocuments((current) => [
                ...current,
                {
                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    category: selectedDocumentType,
                    name: asset.name,
                    mimeType: asset.mimeType || 'application/octet-stream',
                    size: asset.size || 0,
                    uri: asset.uri,
                    uploadedAt: new Date().toISOString()
                }
            ]);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to pick document');
        }
    };

    const removeDocument = (documentId) => {
        setDocuments((current) => current.filter((document) => document.id !== documentId));
    };

    const handleSave = async () => {
        if (!formData.university || !formData.program) {
            Alert.alert('Error', 'University and Program are required');
            return;
        }

        setLoading(true);
        try {
            const appData = createApplicationSubmission(
                {
                    ...formData,
                    requirements: requirementsList,
                    documents
                },
                {
                    existingCreatedAt: isEditing ? formData.createdAt : undefined
                }
            );

            if (!appData) {
                Alert.alert('Error', 'University and Program are required');
                setLoading(false);
                return;
            }

            if (isEditing) {
                await MobileDataService.updateApplication(user, {
                    id: applicationId,
                    ...appData,
                    previousDocuments: normalizeDocuments(formData.documents, formData.file, formData.files)
                });
            } else {
                await MobileDataService.addApplication(user, appData);
            }

            navigation.goBack();
        } catch (error) {
            console.error('Failed to save application', error);
            Alert.alert(
                'Error',
                `Failed to save application${error?.message ? `\n\n${error.message}` : ''}`
            );
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
            keyboardVerticalOffset={100}
        >
            <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.form}>
                    <Text style={styles.label}>University *</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.university}
                        onChangeText={(text) => setFormData({ ...formData, university: text })}
                        placeholder="e.g. MIT"
                        placeholderTextColor="#64748b"
                    />

                    <Text style={styles.label}>Program *</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.program}
                        onChangeText={(text) => setFormData({ ...formData, program: text })}
                        placeholder="e.g. Computer Science"
                        placeholderTextColor="#64748b"
                    />

                    <Text style={styles.label}>Department</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.department}
                        onChangeText={(text) => setFormData({ ...formData, department: text })}
                        placeholder="e.g. School of Engineering"
                        placeholderTextColor="#64748b"
                    />

                    <Text style={styles.label}>Country</Text>
                    <TouchableOpacity style={styles.input} onPress={() => setShowCountryPicker(true)}>
                        <Text style={{ color: formData.country ? '#fff' : '#64748b' }}>
                            {formData.country || 'Select Country...'}
                        </Text>
                    </TouchableOpacity>

                    <CountryPicker
                        visible={showCountryPicker}
                        onClose={() => setShowCountryPicker(false)}
                        onSelect={(country) => setFormData({ ...formData, country })}
                    />

                    <Text style={styles.label}>Website Link</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.website}
                        onChangeText={(text) => setFormData({ ...formData, website: text })}
                        placeholder="https://university.edu"
                        placeholderTextColor="#64748b"
                        autoCapitalize="none"
                        keyboardType="url"
                    />

                    <Text style={styles.label}>QS Ranking</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.qsRanking}
                        onChangeText={(text) => setFormData({ ...formData, qsRanking: text })}
                        placeholder="e.g. 5"
                        placeholderTextColor="#64748b"
                        keyboardType="numeric"
                    />

                    <Text style={styles.label}>Status</Text>
                    <View style={styles.statusContainer}>
                        {APPLICATION_STATUSES.map((status) => (
                            <TouchableOpacity
                                key={status}
                                style={[
                                    styles.statusButton,
                                    formData.status === status && styles.statusButtonActive
                                ]}
                                onPress={() => setFormData({ ...formData, status })}
                            >
                                <Text
                                    style={[
                                        styles.statusText,
                                        formData.status === status && styles.statusTextActive
                                    ]}
                                >
                                    {status}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.label}>Deadline</Text>
                    <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.input}>
                        <Text style={{ color: formData.deadline ? '#fff' : '#64748b' }}>
                            {formData.deadline ? formatDeadlineDate(formData.deadline, 'DD-MM-YYYY') : 'DD-MM-YYYY'}
                        </Text>
                    </TouchableOpacity>

                    <CustomDatePicker
                        visible={showDatePicker}
                        onClose={() => setShowDatePicker(false)}
                        onSelect={onDateChange}
                        initialDate={formData.deadline}
                    />

                    <Text style={styles.label}>Requirements</Text>
                    <View style={{ marginBottom: 20 }}>
                        <View style={styles.requirementInputRow}>
                            <TextInput
                                style={[styles.input, styles.requirementInput]}
                                value={newRequirement}
                                onChangeText={setNewRequirement}
                                placeholder="Add requirement"
                                placeholderTextColor="#64748b"
                            />
                            <TouchableOpacity onPress={addRequirement} style={styles.addButton}>
                                <Text style={styles.addButtonText}>+</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.requirementBadges}>
                            {requirementsList.map((req, index) => (
                                <View key={`${req}-${index}`} style={styles.badge}>
                                    <Text style={styles.badgeText}>{req}</Text>
                                    <TouchableOpacity onPress={() => removeRequirement(index)}>
                                        <Text style={styles.badgeRemove}>X</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    </View>

                    <Text style={styles.label}>Notes</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={formData.notes}
                        onChangeText={(text) => setFormData({ ...formData, notes: text })}
                        placeholder="Add notes..."
                        placeholderTextColor="#64748b"
                        multiline
                        numberOfLines={4}
                    />

                    <Text style={styles.label}>Documents</Text>
                    <View style={styles.documentsContainer}>
                        <View style={styles.statusContainer}>
                            {APPLICATION_DOCUMENT_TYPES.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[
                                        styles.statusButton,
                                        selectedDocumentType === option.value && styles.statusButtonActive
                                    ]}
                                    onPress={() => setSelectedDocumentType(option.value)}
                                >
                                    <Text
                                        style={[
                                            styles.statusText,
                                            selectedDocumentType === option.value && styles.statusTextActive
                                        ]}
                                    >
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity style={styles.documentPickerButton} onPress={handleDocumentPick}>
                            <Text style={styles.documentPickerButtonText}>Add Document</Text>
                        </TouchableOpacity>

                        {documents.length > 0 ? (
                            <View style={styles.documentsList}>
                                {documents.map((document) => (
                                    <View key={document.id} style={styles.documentRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.documentName}>{document.name}</Text>
                                            <Text style={styles.documentMeta}>
                                                {APPLICATION_DOCUMENT_TYPES.find((option) => option.value === document.category)?.label || 'Document'}
                                            </Text>
                                        </View>
                                        <TouchableOpacity onPress={() => removeDocument(document.id)}>
                                            <Text style={styles.badgeRemove}>X</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <Text style={styles.helperText}>
                                Add recommendation letters, SOPs, or other supporting documents.
                            </Text>
                        )}
                    </View>

                    <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                        <Text style={styles.saveButtonText}>{isEditing ? 'Update' : 'Save'} Application</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    centered: {
        flex: 1,
        backgroundColor: '#0f172a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    form: {
        padding: 20,
    },
    label: {
        color: '#cbd5e1',
        marginBottom: 8,
        fontSize: 16,
        fontWeight: '600',
    },
    input: {
        backgroundColor: '#1e293b',
        color: '#fff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#334155',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    statusContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20,
    },
    statusButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#334155',
        backgroundColor: '#1e293b',
    },
    statusButtonActive: {
        backgroundColor: '#3b82f6',
        borderColor: '#3b82f6',
    },
    statusText: {
        color: '#cbd5e1',
        fontSize: 14,
    },
    statusTextActive: {
        color: '#fff',
        fontWeight: 'bold',
    },
    requirementInputRow: {
        flexDirection: 'row',
        gap: 10,
    },
    requirementInput: {
        flex: 1,
        marginBottom: 0,
    },
    addButton: {
        backgroundColor: '#3b82f6',
        borderRadius: 8,
        width: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButtonText: {
        color: '#fff',
        fontSize: 24,
    },
    requirementBadges: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 10,
    },
    documentsContainer: {
        marginBottom: 20,
        gap: 12,
    },
    documentsList: {
        gap: 10,
    },
    documentPickerButton: {
        backgroundColor: '#334155',
        padding: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    documentPickerButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    documentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#1e293b',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 10,
        padding: 12,
    },
    documentName: {
        color: '#fff',
        fontWeight: '600',
    },
    documentMeta: {
        color: '#94a3b8',
        fontSize: 12,
        marginTop: 4,
    },
    helperText: {
        color: '#94a3b8',
        fontSize: 13,
    },
    badge: {
        backgroundColor: '#334155',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
    },
    badgeText: {
        color: '#fff',
    },
    badgeRemove: {
        color: '#ffadad',
        marginLeft: 6,
        fontWeight: 'bold',
    },
    saveButton: {
        backgroundColor: '#3b82f6',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    }
});
