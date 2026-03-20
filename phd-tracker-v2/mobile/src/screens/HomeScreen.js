import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal, Linking, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { getCountryCode } from '../utils/countryFlags';
import { useAuth } from '../context/AuthContext';
import { MobileDataService } from '../services/MobileDataService';
import MobileConflictResolutionModal from '../components/MobileConflictResolutionModal';

export default function HomeScreen({ navigation }) {
    const { user, logout } = useAuth();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [sortOption, setSortOption] = useState('deadline'); // deadline, status
    const [isFilterModalVisible, setFilterModalVisible] = useState(false);

    // Conflict Logic
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
            // Clear data only after successful merge of selected items
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
                        // Do NOT clear data
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
        } catch (error) {
            Alert.alert('Error', 'Failed to sign out');
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

    const formatUrl = (url) => {
        if (!url) return '';
        return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Accepted': return '#22c55e';
            case 'Rejected': return '#ef4444';
            case 'Submitted': return '#3b82f6';
            case 'In Progress': return '#eab308';
            default: return '#64748b';
        }
    };

    const handleDelete = async (id) => {
        try {
            await MobileDataService.deleteApplication(user, id);
        } catch (error) {
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

    const filteredApplications = applications.filter(app => {
        const matchesSearch = (app.university?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (app.program?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
        return matchesSearch && matchesStatus;
    }).sort((a, b) => {
        if (sortOption === 'deadline') {
            const dateA = a.deadline ? new Date(a.deadline) : new Date('9999-12-31');
            const dateB = b.deadline ? new Date(b.deadline) : new Date('9999-12-31');
            return dateA - dateB;
        }
        if (sortOption === 'status') {
            return (a.status || '').localeCompare(b.status || '');
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

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 }}>
                        {item.country ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                {countryCode ? (
                                    <Image
                                        source={{ uri: `https://flagcdn.com/w40/${countryCode}.png` }}
                                        style={{ width: 20, height: 14, borderRadius: 2 }}
                                    />
                                ) : (
                                    <Text>🌍</Text>
                                )}
                                <Text style={{ color: '#94a3b8', fontSize: 13 }}>{item.country}</Text>
                            </View>
                        ) : null}
                        {item.deadline ? (
                            <Text style={{ color: '#94a3b8', fontSize: 13 }}>
                                📅 {(() => {
                                    const [y, m, d] = item.deadline.split('-');
                                    return `${d}-${m}-${y}`;
                                })()}
                            </Text>
                        ) : null}
                    </View>

                    {item.requirements && Array.isArray(item.requirements) && item.requirements.length > 0 && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                            {item.requirements.slice(0, 3).map(req => (
                                <View key={req} style={styles.miniBadge}>
                                    <Text style={styles.miniBadgeText}>{req}</Text>
                                </View>
                            ))}
                            {item.requirements.length > 3 && (
                                <View style={styles.miniBadge}>
                                    <Text style={styles.miniBadgeText}>+{item.requirements.length - 3}</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {item.website ? (
                        <TouchableOpacity
                            style={{ alignSelf: 'flex-start', marginTop: 4 }}
                            onPress={() => handleOpenLink(item.website)}
                        >
                            <Text style={{ color: '#3b82f6', fontSize: 13 }}>🔗 {formatUrl(item.website)}</Text>
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
                    <Text style={styles.subtitle}>{filteredApplications.length} Applications {user.isGuest ? '(Guest)' : ''}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity onPress={() => navigation.navigate('Calendar')} style={styles.iconButton}>
                        <Text style={styles.iconButtonText}>📅</Text>
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
                    <Text style={styles.filterButtonText}>⚙️</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={filteredApplications}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>
                        {applications.length === 0 ? "No applications found. Add some!" : "No matches found."}
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
                transparent={true}
                animationType="slide"
                onRequestClose={() => setFilterModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Filters & Sort</Text>

                        <Text style={styles.modalLabel}>Status</Text>
                        <View style={styles.modalOptions}>
                            {['All', 'Not Started', 'In Progress', 'Submitted', 'Accepted', 'Rejected'].map(status => (
                                <TouchableOpacity
                                    key={status}
                                    style={[styles.optionButton, statusFilter === status && styles.optionButtonActive]}
                                    onPress={() => setStatusFilter(status)}
                                >
                                    <Text style={[styles.optionText, statusFilter === status && styles.optionTextActive]}>{status}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.modalLabel}>Sort By</Text>
                        <View style={styles.modalOptions}>
                            <TouchableOpacity
                                style={[styles.optionButton, sortOption === 'deadline' && styles.optionButtonActive]}
                                onPress={() => setSortOption('deadline')}
                            >
                                <Text style={[styles.optionText, sortOption === 'deadline' && styles.optionTextActive]}>Deadline</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.optionButton, sortOption === 'status' && styles.optionButtonActive]}
                                onPress={() => setSortOption('status')}
                            >
                                <Text style={[styles.optionText, sortOption === 'status' && styles.optionTextActive]}>Status</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setFilterModalVisible(false)}
                        >
                            <Text style={styles.closeButtonText}>Done</Text>
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
        fontSize: 16,
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
    },
    filterButtonText: {
        fontSize: 18,
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
    },
    university: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        flex: 1,
        marginRight: 8,
    },
    program: {
        fontSize: 16,
        color: '#cbd5e1',
        marginBottom: 8,
    },
    deadline: {
        fontSize: 14,
        color: '#94a3b8',
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
    modalContent: {
        backgroundColor: '#1e293b',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '80%',
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
    closeButton: {
        marginTop: 20,
        backgroundColor: '#3b82f6',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
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
