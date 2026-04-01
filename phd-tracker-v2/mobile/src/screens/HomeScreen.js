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
    Linking,
    Image,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { compareApplicationsByDeadline, compareApplicationsByStatus } from '@phd-tracker/shared/applications';
import { countries } from '@phd-tracker/shared/countries';
import { formatDeadlineDate, getBackupDateStamp } from '@phd-tracker/shared/dates';
import { mapImportedCsvRow, parseImportedJson } from '@phd-tracker/shared/imports';
import { STATUS_FILTER_OPTIONS, getStatusColor } from '@phd-tracker/shared/statuses';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Papa from 'papaparse';
import { getCountryCode } from '../utils/countryFlags';
import { useAuth } from '../context/AuthContext';
import { MobileDataService } from '../services/MobileDataService';
import MobileConflictResolutionModal from '../components/MobileConflictResolutionModal';

const ALL_COUNTRIES_LABEL = 'All Countries';

export default function HomeScreen({ navigation }) {
    const { user, logout } = useAuth();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [countryFilter, setCountryFilter] = useState(ALL_COUNTRIES_LABEL);
    const [sortOption, setSortOption] = useState('deadline');
    const [isFilterModalVisible, setFilterModalVisible] = useState(false);
    const [isActionsModalVisible, setActionsModalVisible] = useState(false);
    const [conflictModalVisible, setConflictModalVisible] = useState(false);
    const [guestDataToMerge, setGuestDataToMerge] = useState([]);

    useEffect(() => {
        if (!user) return;

        const checkGuestData = async () => {
            if (!user.isGuest) {
                const guestData = await MobileDataService.fetchGuestData();
                if (guestData.length > 0) {
                    setGuestDataToMerge(guestData);
                    setConflictModalVisible(true);
                }
            }
        };

        checkGuestData();

        const unsubscribe = MobileDataService.subscribeToApplications(user, (apps) => {
            setApplications(apps);
            setLoading(false);
        });

        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, [user]);

    const handleMergeResolution = async (resolvedApps) => {
        try {
            setLoading(true);
            if (resolvedApps.length > 0) {
                await MobileDataService.batchAdd(user, resolvedApps);
            }
            await MobileDataService.clearGuestData();
            setConflictModalVisible(false);
            setGuestDataToMerge([]);
            Alert.alert('Success', 'Applications merged successfully!');
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to merge applications.');
        } finally {
            setLoading(false);
        }
    };

    const handleMergeDiscard = () => {
        Alert.alert(
            'Keep Separate?',
            'Your local guest data will remain on this device. You can access it again by logging out and continuing as Guest.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Keep Separate',
                    onPress: () => {
                        setConflictModalVisible(false);
                        setGuestDataToMerge([]);
                    }
                }
            ]
        );
    };

    const handleSignOut = async () => {
        try {
            await logout();
        } catch {
            Alert.alert('Error', 'Failed to sign out');
        }
    };

    const handleOpenLink = (url) => {
        if (!url) return;

        const finalUrl = url.startsWith('http://') || url.startsWith('https://')
            ? url
            : `https://${url}`;

        Linking.openURL(finalUrl).catch(() => Alert.alert('Error', "Couldn't open link"));
    };

    const getWebsiteHost = (url) => {
        if (!url) return '';

        try {
            const finalUrl = url.startsWith('http://') || url.startsWith('https://')
                ? url
                : `https://${url}`;
            return new URL(finalUrl).hostname.replace(/^www\./, '');
        } catch {
            return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
        }
    };

    const handleExport = async () => {
        try {
            setActionsModalVisible(false);
            const fileName = `phd-applications-${getBackupDateStamp()}.json`;
            const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

            await FileSystem.writeAsStringAsync(
                fileUri,
                JSON.stringify(applications, null, 2),
                { encoding: FileSystem.EncodingType.UTF8 }
            );

            const canShare = await Sharing.isAvailableAsync();
            if (!canShare) {
                Alert.alert('Export Ready', `Backup saved to cache as ${fileName}. Sharing is not available on this device.`);
                return;
            }

            await Sharing.shareAsync(fileUri, {
                mimeType: 'application/json',
                dialogTitle: 'Export Application Backup'
            });
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to export backup');
        }
    };

    const confirmImport = (count) => {
        return new Promise((resolve) => {
            const destination = user?.isGuest ? 'local guest storage' : 'your cloud account';
            Alert.alert(
                'Import Applications',
                `Import ${count} applications into ${destination}?`,
                [
                    { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                    { text: 'Import', onPress: () => resolve(true) }
                ]
            );
        });
    };

    const handleImport = async () => {
        try {
            setActionsModalVisible(false);
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/json', 'text/csv', 'text/comma-separated-values', 'text/plain'],
                copyToCacheDirectory: true,
                multiple: false
            });

            if (result.canceled || !result.assets?.length) {
                return;
            }

            const asset = result.assets[0];
            const content = await FileSystem.readAsStringAsync(asset.uri, {
                encoding: FileSystem.EncodingType.UTF8
            });

            let importedApps = [];
            const lowerName = asset.name?.toLowerCase() || '';

            if (lowerName.endsWith('.json')) {
                importedApps = parseImportedJson(content);
            } else if (lowerName.endsWith('.csv')) {
                const parsed = Papa.parse(content, { header: true });
                importedApps = parsed.data.map(mapImportedCsvRow).filter(Boolean);
            } else {
                Alert.alert('Unsupported File', 'Please choose a JSON or CSV file.');
                return;
            }

            if (importedApps.length === 0) {
                Alert.alert('No Data', 'No valid applications were found in that file.');
                return;
            }

            const confirmed = await confirmImport(importedApps.length);
            if (!confirmed) {
                return;
            }

            await MobileDataService.importApplications(user, importedApps);
            Alert.alert('Success', 'Import successful!');
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Import failed');
        }
    };

    const handleDelete = async (id) => {
        try {
            await MobileDataService.deleteApplication(user, id);
        } catch {
            Alert.alert('Error', 'Failed to delete application');
        }
    };

    const renderRightActions = (id) => {
        return (
            <TouchableOpacity
                style={styles.deleteAction}
                onPress={() => handleDelete(id)}
            >
                <Text style={styles.deleteActionText}>Delete</Text>
            </TouchableOpacity>
        );
    };

    const availableCountries = useMemo(() => {
        const usedCountries = new Set(
            applications
                .map((app) => app.country)
                .filter(Boolean)
        );

        return countries
            .filter((country) => usedCountries.has(country))
            .sort((a, b) => a.localeCompare(b));
    }, [applications]);

    const activeFilterCount = (statusFilter !== 'All' ? 1 : 0) + (countryFilter !== ALL_COUNTRIES_LABEL ? 1 : 0);

    const filteredApplications = applications
        .filter((app) => {
            const search = searchTerm.toLowerCase();
            const matchesSearch =
                (app.university?.toLowerCase() || '').includes(search) ||
                (app.program?.toLowerCase() || '').includes(search);
            const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
            const matchesCountry = countryFilter === ALL_COUNTRIES_LABEL || app.country === countryFilter;
            return matchesSearch && matchesStatus && matchesCountry;
        })
        .sort((a, b) => {
            if (sortOption === 'deadline') {
                return compareApplicationsByDeadline(a, b, 'asc');
            }
            if (sortOption === 'status') {
                return compareApplicationsByStatus(a, b, 'asc');
            }
            return 0;
        });

    const renderItem = ({ item }) => {
        const countryCode = getCountryCode(item.country);

        return (
            <Swipeable renderRightActions={() => renderRightActions(item.id)}>
                <TouchableOpacity
                    style={styles.card}
                    onPress={() => navigation.navigate('Details', { applicationId: item.id })}
                >
                    <View style={styles.cardHeader}>
                        <Text style={styles.university}>{item.university}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                            <Text style={styles.statusText}>{item.status}</Text>
                        </View>
                    </View>

                    <Text style={styles.program}>{item.program}</Text>

                    <View style={styles.metaRow}>
                        {item.country ? (
                            <View style={styles.metaItem}>
                                {countryCode ? (
                                    <Image
                                        source={{ uri: `https://flagcdn.com/w40/${countryCode}.png` }}
                                        style={styles.flag}
                                    />
                                ) : (
                                    <Text style={styles.metaFallback}>Country</Text>
                                )}
                                <Text style={styles.metaText}>{item.country}</Text>
                            </View>
                        ) : null}

                        {item.deadline ? (
                            <Text style={styles.metaText}>
                                Due {formatDeadlineDate(item.deadline, 'No Deadline')}
                            </Text>
                        ) : null}
                    </View>

                    {Array.isArray(item.requirements) && item.requirements.length > 0 ? (
                        <View style={styles.requirementsRow}>
                            {item.requirements.slice(0, 3).map((req) => (
                                <View key={req} style={styles.miniBadge}>
                                    <Text style={styles.miniBadgeText}>{req}</Text>
                                </View>
                            ))}
                            {item.requirements.length > 3 ? (
                                <View style={styles.miniBadge}>
                                    <Text style={styles.miniBadgeText}>+{item.requirements.length - 3}</Text>
                                </View>
                            ) : null}
                        </View>
                    ) : null}

                    {item.website ? (
                        <TouchableOpacity
                            style={styles.websiteButton}
                            onPress={() => handleOpenLink(item.website)}
                        >
                            <Text style={styles.websiteButtonText}>Website ↗</Text>
                            <Text style={styles.websiteHostText} numberOfLines={1}>
                                {getWebsiteHost(item.website)}
                            </Text>
                        </TouchableOpacity>
                    ) : null}
                </TouchableOpacity>
            </Swipeable>
        );
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>PhD Applications</Text>
                    <Text style={styles.subtitle}>
                        {filteredApplications.length} Applications {user.isGuest ? '(Guest)' : ''}
                    </Text>
                </View>

                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={() => navigation.navigate('Calendar')} style={styles.iconButton}>
                        <Text style={styles.iconButtonText}>Cal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setActionsModalVisible(true)} style={styles.iconButton}>
                        <Text style={styles.iconButtonText}>More</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
                        <Text style={styles.signOutText}>Sign Out</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search university or program..."
                    placeholderTextColor="#94a3b8"
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                />
                <TouchableOpacity
                    style={styles.filterButton}
                    onPress={() => setFilterModalVisible(true)}
                >
                    <Text style={styles.filterButtonText}>
                        {activeFilterCount > 0 ? `Filters ${activeFilterCount}` : 'Filters'}
                    </Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={filteredApplications}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>
                        {applications.length === 0 ? 'No applications found. Add some!' : 'No matches found.'}
                    </Text>
                }
            />

            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('AddEdit')}
            >
                <Text style={styles.fabIcon}>+</Text>
            </TouchableOpacity>

            <Modal
                visible={isFilterModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setFilterModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <ScrollView contentContainerStyle={styles.modalScrollContent}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Filters & Sort</Text>

                            <Text style={styles.modalLabel}>Status</Text>
                            <View style={styles.modalOptions}>
                                {STATUS_FILTER_OPTIONS.map((status) => (
                                    <TouchableOpacity
                                        key={status}
                                        style={[styles.optionButton, statusFilter === status && styles.optionButtonActive]}
                                        onPress={() => setStatusFilter(status)}
                                    >
                                        <Text style={[styles.optionText, statusFilter === status && styles.optionTextActive]}>
                                            {status}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.modalLabel}>Country</Text>
                            <View style={styles.modalOptions}>
                                <TouchableOpacity
                                    style={[styles.optionButton, countryFilter === ALL_COUNTRIES_LABEL && styles.optionButtonActive]}
                                    onPress={() => setCountryFilter(ALL_COUNTRIES_LABEL)}
                                >
                                    <Text style={[styles.optionText, countryFilter === ALL_COUNTRIES_LABEL && styles.optionTextActive]}>
                                        {ALL_COUNTRIES_LABEL}
                                    </Text>
                                </TouchableOpacity>
                                {availableCountries.map((country) => (
                                    <TouchableOpacity
                                        key={country}
                                        style={[styles.optionButton, countryFilter === country && styles.optionButtonActive]}
                                        onPress={() => setCountryFilter(country)}
                                    >
                                        <Text style={[styles.optionText, countryFilter === country && styles.optionTextActive]}>
                                            {country}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.modalLabel}>Sort By</Text>
                            <View style={styles.modalOptions}>
                                <TouchableOpacity
                                    style={[styles.optionButton, sortOption === 'deadline' && styles.optionButtonActive]}
                                    onPress={() => setSortOption('deadline')}
                                >
                                    <Text style={[styles.optionText, sortOption === 'deadline' && styles.optionTextActive]}>
                                        Deadline
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.optionButton, sortOption === 'status' && styles.optionButtonActive]}
                                    onPress={() => setSortOption('status')}
                                >
                                    <Text style={[styles.optionText, sortOption === 'status' && styles.optionTextActive]}>
                                        Status
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.filterFooter}>
                                <TouchableOpacity
                                    style={[styles.closeButton, styles.secondaryCloseButton]}
                                    onPress={() => {
                                        setStatusFilter('All');
                                        setCountryFilter(ALL_COUNTRIES_LABEL);
                                        setSortOption('deadline');
                                    }}
                                >
                                    <Text style={styles.closeButtonText}>Reset</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={() => setFilterModalVisible(false)}
                                >
                                    <Text style={styles.closeButtonText}>Done</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </Modal>

            <Modal
                visible={isActionsModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setActionsModalVisible(false)}
            >
                <View style={styles.actionsOverlay}>
                    <View style={styles.actionsSheet}>
                        <Text style={styles.actionsTitle}>Backup & Tools</Text>

                        <TouchableOpacity style={styles.actionsButton} onPress={handleExport}>
                            <Text style={styles.actionsButtonText}>Export Backup</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionsButton} onPress={handleImport}>
                            <Text style={styles.actionsButtonText}>Import Backup</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionsButton, styles.actionsButtonSecondary]}
                            onPress={() => setActionsModalVisible(false)}
                        >
                            <Text style={styles.actionsButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <MobileConflictResolutionModal
                visible={conflictModalVisible}
                onClose={handleMergeDiscard}
                guestApps={guestDataToMerge}
                onResolve={handleMergeResolution}
            />
        </SafeAreaView>
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#1e293b',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    subtitle: {
        fontSize: 12,
        color: '#94a3b8',
    },
    iconButton: {
        padding: 8,
        backgroundColor: '#334155',
        borderRadius: 8,
    },
    iconButtonText: {
        fontSize: 14,
        color: '#cbd5e1',
        fontWeight: '600',
    },
    signOutButton: {
        padding: 8,
    },
    signOutText: {
        color: '#ef4444',
        fontWeight: '600',
    },
    searchContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        backgroundColor: '#1e293b',
        color: '#fff',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#334155',
    },
    filterButton: {
        backgroundColor: '#1e293b',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#334155',
        minWidth: 86,
    },
    filterButtonText: {
        color: '#cbd5e1',
        fontWeight: '600',
    },
    list: {
        padding: 16,
        paddingTop: 0,
    },
    card: {
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#334155',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    university: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        flex: 1,
    },
    program: {
        fontSize: 16,
        color: '#cbd5e1',
        marginBottom: 8,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 10,
        flexWrap: 'wrap',
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        color: '#94a3b8',
        fontSize: 13,
    },
    metaFallback: {
        color: '#94a3b8',
        fontSize: 12,
    },
    flag: {
        width: 20,
        height: 14,
        borderRadius: 2,
    },
    requirementsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 8,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    websiteButton: {
        marginTop: 6,
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(59, 130, 246, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.4)',
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
        maxWidth: '100%',
        gap: 2,
    },
    websiteButtonText: {
        color: '#60a5fa',
        fontSize: 13,
        fontWeight: '700',
    },
    websiteHostText: {
        color: '#93c5fd',
        fontSize: 12,
    },
    emptyText: {
        color: '#94a3b8',
        textAlign: 'center',
        marginTop: 40,
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
        shadowRadius: 4,
    },
    fabIcon: {
        fontSize: 32,
        color: '#fff',
        marginTop: -4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalScrollContent: {
        flexGrow: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1e293b',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '85%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 20,
        textAlign: 'center',
    },
    modalLabel: {
        color: '#94a3b8',
        marginBottom: 10,
        fontWeight: '600',
        marginTop: 10,
    },
    modalOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 10,
    },
    optionButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#334155',
        backgroundColor: '#0f172a',
    },
    optionButtonActive: {
        backgroundColor: '#3b82f6',
        borderColor: '#3b82f6',
    },
    optionText: {
        color: '#cbd5e1',
    },
    optionTextActive: {
        color: '#fff',
        fontWeight: '600',
    },
    filterFooter: {
        flexDirection: 'row',
        gap: 12,
    },
    closeButton: {
        marginTop: 20,
        backgroundColor: '#3b82f6',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        flex: 1,
    },
    secondaryCloseButton: {
        backgroundColor: '#334155',
    },
    closeButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    actionsOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        padding: 24,
    },
    actionsSheet: {
        backgroundColor: '#1e293b',
        borderRadius: 18,
        padding: 20,
        borderWidth: 1,
        borderColor: '#334155',
        gap: 12,
    },
    actionsTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    actionsButton: {
        backgroundColor: '#3b82f6',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    actionsButtonSecondary: {
        backgroundColor: '#334155',
    },
    actionsButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
    },
    deleteAction: {
        backgroundColor: '#ef4444',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        height: '100%',
        marginBottom: 16,
        borderRadius: 12,
        marginLeft: 10,
    },
    deleteActionText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    miniBadge: {
        backgroundColor: 'rgba(148, 163, 184, 0.2)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    miniBadgeText: {
        color: '#cbd5e1',
        fontSize: 11,
    }
});
