import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CustomDatePicker({ visible, onClose, onSelect, initialDate }) {
    const [viewDate, setViewDate] = useState(initialDate ? new Date(initialDate) : new Date());
    const [mode, setMode] = useState('calendar'); // 'calendar' | 'month' | 'year'

    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const changeMonth = (delta) => {
        const newDate = new Date(viewDate.setMonth(viewDate.getMonth() + delta));
        setViewDate(new Date(newDate));
    };

    const handleSelectMonth = (monthIndex) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(monthIndex);
        setViewDate(newDate);
        setMode('calendar');
    };

    const handleSelectDay = (day) => {
        const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        onSelect(selected);
        onClose();
    };

    const handleSelectYear = (year) => {
        const newDate = new Date(viewDate);
        newDate.setFullYear(year);
        setViewDate(newDate);
        setMode('calendar');
    };

    const renderCalendar = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);

        const slots = [];
        for (let i = 0; i < firstDay; i++) {
            slots.push(<View key={`empty-${i}`} style={styles.dayCell} />);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            const isSelected = initialDate &&
                new Date(initialDate).getDate() === i &&
                new Date(initialDate).getMonth() === month &&
                new Date(initialDate).getFullYear() === year;

            const isToday = new Date().getDate() === i &&
                new Date().getMonth() === month &&
                new Date().getFullYear() === year;

            slots.push(
                <TouchableOpacity
                    key={i}
                    style={[
                        styles.dayCell,
                        isSelected && styles.selectedDayCell,
                        isToday && !isSelected && styles.todayCell
                    ]}
                    onPress={() => handleSelectDay(i)}
                >
                    <Text style={[
                        styles.dayText,
                        isSelected && styles.selectedDayText
                    ]}>{i}</Text>
                </TouchableOpacity>
            );
        }
        return slots;
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.dialog}>
                    <View style={styles.header}>
                        {mode === 'calendar' && (
                            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navButton}>
                                <Text style={styles.navText}>{'<'}</Text>
                            </TouchableOpacity>
                        )}

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity onPress={() => setMode('month')}>
                                <Text style={[styles.monthTitle, mode === 'month' && { color: '#3b82f6' }]}>
                                    {months[viewDate.getMonth()]}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setMode('year')}>
                                <Text style={[styles.monthTitle, mode === 'year' && { color: '#3b82f6' }]}>
                                    {viewDate.getFullYear()}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {mode === 'calendar' && (
                            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navButton}>
                                <Text style={styles.navText}>{'>'}</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {mode === 'calendar' && (
                        <>
                            <View style={styles.weekRow}>
                                {weekDays.map(d => (
                                    <Text key={d} style={styles.weekDayText}>{d}</Text>
                                ))}
                            </View>
                            <View style={styles.daysGrid}>
                                {renderCalendar()}
                            </View>
                        </>
                    )}

                    {mode === 'year' && (
                        <View style={{ height: 300 }}>
                            <SafeAreaView style={{ flex: 1 }}>
                                <FlatList
                                    data={Array.from({ length: 81 }, (_, i) => new Date().getFullYear() - 50 + i)}
                                    keyExtractor={item => item.toString()}
                                    numColumns={4}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[
                                                styles.yearCell,
                                                item === viewDate.getFullYear() && styles.selectedYearCell
                                            ]}
                                            onPress={() => handleSelectYear(item)}
                                        >
                                            <Text style={[
                                                styles.yearText,
                                                item === viewDate.getFullYear() && styles.selectedYearText
                                            ]}>{item}</Text>
                                        </TouchableOpacity>
                                    )}
                                    getItemLayout={(data, index) => (
                                        { length: 50, offset: 50 * index, index }
                                    )}
                                    initialScrollIndex={50}
                                />
                            </SafeAreaView>
                        </View>
                    )}

                    {mode === 'month' && (
                        <View style={styles.monthsGrid}>
                            {months.map((m, index) => (
                                <TouchableOpacity
                                    key={m}
                                    style={[
                                        styles.monthCell,
                                        index === viewDate.getMonth() && styles.selectedMonthCell
                                    ]}
                                    onPress={() => handleSelectMonth(index)}
                                >
                                    <Text style={[
                                        styles.monthText,
                                        index === viewDate.getMonth() && styles.selectedMonthText
                                    ]}>{m.substring(0, 3)}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dialog: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 20,
        width: '85%',
        borderWidth: 1,
        borderColor: '#334155',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    monthTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    navButton: {
        padding: 10,
    },
    navText: {
        color: '#3b82f6',
        fontSize: 20,
        fontWeight: 'bold',
    },
    weekRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 10,
    },
    weekDayText: {
        color: '#94a3b8',
        width: 30,
        textAlign: 'center',
        fontWeight: '600',
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: '14.28%', // 100% / 7
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 5,
        borderRadius: 20, // Circular
    },
    selectedDayCell: {
        backgroundColor: '#3b82f6',
    },
    todayCell: {
        borderWidth: 1,
        borderColor: '#3b82f6',
    },
    dayText: {
        color: '#fff',
        fontSize: 16,
    },
    selectedDayText: {
        fontWeight: 'bold',
        color: '#fff',
    },
    cancelButton: {
        marginTop: 20,
        alignItems: 'center',
        padding: 10,
    },
    cancelText: {
        color: '#ef4444',
        fontSize: 16,
        fontWeight: '600',
    },
    yearCell: {
        width: '25%', // 4 columns
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
    },
    selectedYearCell: {
        backgroundColor: '#3b82f6',
    },
    yearText: {
        color: '#fff',
        fontSize: 16,
    },
    selectedYearText: {
        fontWeight: 'bold',
        color: '#fff',
    },
    monthsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingVertical: 20,
    },
    monthCell: {
        width: '30%',
        paddingVertical: 15,
        alignItems: 'center',
        borderRadius: 8,
        marginBottom: 10,
        backgroundColor: '#1e293b',
        borderWidth: 1,
        borderColor: '#334155',
    },
    selectedMonthCell: {
        backgroundColor: '#3b82f6',
        borderColor: '#3b82f6',
    },
    monthText: {
        color: '#fff',
        fontSize: 16,
    },
    selectedMonthText: {
        fontWeight: 'bold',
        color: '#fff',
    }
});
