import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, FlatList, TextInput, SafeAreaView } from 'react-native';
import { countries } from '../constants/countries';

export default function CountryPicker({ visible, onClose, onSelect }) {
    const [search, setSearch] = useState('');

    const filteredCountries = countries.filter(c =>
        c.toLowerCase().includes(search.toLowerCase())
    );

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.item}
            onPress={() => {
                onSelect(item);
                onClose();
            }}
        >
            <Text style={styles.itemText}>{item}</Text>
        </TouchableOpacity>
    );

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.modalContainer}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Select Country</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={styles.closeText}>Close</Text>
                        </TouchableOpacity>
                    </View>

                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search countries..."
                        placeholderTextColor="#94a3b8"
                        value={search}
                        onChangeText={setSearch}
                        autoFocus={false}
                    />

                    <FlatList
                        data={filteredCountries}
                        renderItem={renderItem}
                        keyExtractor={item => item}
                        style={styles.list}
                        keyboardShouldPersistTaps="handled"
                    />
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    closeButton: {
        padding: 10,
    },
    closeText: {
        color: '#3b82f6',
        fontSize: 16,
        fontWeight: '600',
    },
    searchInput: {
        backgroundColor: '#1e293b',
        color: '#fff',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom: 20,
        fontSize: 16,
    },
    list: {
        flex: 1,
    },
    item: {
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    itemText: {
        color: '#fff',
        fontSize: 16,
    }
});
