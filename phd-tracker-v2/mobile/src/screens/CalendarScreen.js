import React, { useState, useEffect } from 'react';
import { View, Text, SectionList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export default function CalendarScreen({ navigation }) {
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        // Fetch applications
        const q = query(
            collection(db, `users/${user.uid}/applications`),
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const apps = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.deadline) {
                    apps.push({ id: doc.id, ...data });
                }
            });

            // Process for SectionList
            // 1. Sort by date
            apps.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

            // 2. Group by Month
            const grouped = {};
            apps.forEach(app => {
                const date = new Date(app.deadline);
                const key = date.toLocaleString('default', { month: 'long', year: 'numeric' });
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(app);
            });

            // 3. Convert to array
            const sectionsLimit = Object.keys(grouped).map(key => ({
                title: key,
                data: grouped[key]
            }));

            setSections(sectionsLimit);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const renderItem = ({ item }) => {
        const date = new Date(item.deadline);
        const day = date.getDate();
        const monthShort = date.toLocaleString('default', { month: 'short' });

        return (
            <TouchableOpacity
                style={styles.item}
                onPress={() => navigation.navigate('Details', { applicationId: item.id })}
            >
                <View style={styles.dateBox}>
                    <Text style={styles.dateDay}>{day}</Text>
                    <Text style={styles.dateMonth}>{monthShort}</Text>
                </View>
                <View style={styles.itemContent}>
                    <Text style={styles.university}>{item.university}</Text>
                    <Text style={styles.program}>{item.program}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                </View>
            </TouchableOpacity>
        );
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

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <SectionList
                sections={sections}
                keyExtractor={(item, index) => item.id + index}
                renderItem={renderItem}
                renderSectionHeader={({ section: { title } }) => (
                    <Text style={styles.header}>{title}</Text>
                )}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No upcoming deadlines.</Text>
                }
            />
        </View>
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
    list: {
        padding: 20,
    },
    header: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        backgroundColor: '#0f172a',
        paddingVertical: 10,
        marginBottom: 10,
    },
    item: {
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#334155',
    },
    dateBox: {
        backgroundColor: '#0f172a',
        borderRadius: 8,
        padding: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        width: 50,
    },
    dateDay: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    dateMonth: {
        color: '#94a3b8',
        fontSize: 12,
        textTransform: 'uppercase',
    },
    itemContent: {
        flex: 1,
    },
    university: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    program: {
        color: '#cbd5e1',
        fontSize: 14,
    },
    statusBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    statusText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
    },
    emptyText: {
        color: '#94a3b8',
        textAlign: 'center',
        marginTop: 40,
    }
});
