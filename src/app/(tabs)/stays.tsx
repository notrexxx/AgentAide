import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal, SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { getStays, StayWithProperty } from '../../database/staysQueries';
import { parseTicketText } from '../../utils/ticketParser';

export default function StaysScreen() {
  const [stays, setStays] = useState<StayWithProperty[]>([]);
  const [isModalVisible, setModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = () => {
    const data = getStays();
    setStays(data);
  };

  // --- CORE PARSING LOGIC ---
  const handlePasteTicket = async () => {
    try {
      // 1. Read the raw text directly from the device's clipboard
      const clipboardContent = await Clipboard.getStringAsync();
      
      if (!clipboardContent) {
        Alert.alert('Empty Clipboard', 'Please copy the ticket text before pressing this button.');
        return;
      }

      // 2. Pass the text through our Regex Engine
      const parsedData = parseTicketText(clipboardContent);

      // 3. Display the parsed results (Temporary step for validation)
      Alert.alert(
        'Ticket Parsed Successfully',
        `Flight: ${parsedData.flightInfo || 'Not Found'}\nDate: ${parsedData.arrivalDate || 'Not Found'}\nGuests: ${parsedData.guestCount}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Looks Good', 
            onPress: () => {
              // In our next cycle, we will transition this data into a form to save it to SQLite!
              console.log('Proceeding to form with data:', parsedData);
              setModalVisible(false);
            }
          }
        ]
      );

    } catch (error) {
      Alert.alert('Parsing Error', 'An error occurred while reading the clipboard.');
    }
  };

  const renderStayCard = ({ item }: { item: StayWithProperty }) => (
    <View style={styles.card}>
      <Text style={styles.propertyName}>{item.propertyName}</Text>
      <Text style={styles.dateText}>Arrival: {item.arrivalDate}</Text>
      <Text style={styles.guestText}>Guests: {item.guestCount} | Kids: {item.kidsCount}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        <FlatList
          data={stays}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderStayCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="calendar-clear-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyStateText}>No active stays.</Text>
              <Text style={styles.emptyStateSubtext}>Add an itinerary to track incoming guests.</Text>
            </View>
          }
        />

        <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </TouchableOpacity>

        <Modal
          visible={isModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Import Itinerary</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={28} color="#64748B" />
                </TouchableOpacity>
              </View>

              <Text style={styles.subText}>
                Choose how you want to import the guest's flight and arrival data.
              </Text>

              {/* Option 1: Clipboard / Text Paste */}
              <TouchableOpacity style={styles.actionButton} onPress={handlePasteTicket}>
                <View style={styles.iconCircle}>
                  <Ionicons name="clipboard-outline" size={24} color="#3B82F6" />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={styles.actionTitle}>Paste Ticket Text</Text>
                  <Text style={styles.actionSubtitle}>Instantly parse dates and guests from copied text.</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
              </TouchableOpacity>

              {/* Option 2: Image OCR (Disabled visually for now) */}
              <TouchableOpacity style={[styles.actionButton, styles.actionButtonDisabled]} activeOpacity={1}>
                <View style={[styles.iconCircle, { backgroundColor: '#F1F5F9' }]}>
                  <Ionicons name="scan-outline" size={24} color="#94A3B8" />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={[styles.actionTitle, { color: '#94A3B8' }]}>Scan Ticket Image</Text>
                  <Text style={styles.actionSubtitle}>Requires native compile (Coming Soon).</Text>
                </View>
                <Ionicons name="lock-closed" size={16} color="#94A3B8" />
              </TouchableOpacity>

            </View>
          </View>
        </Modal>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F1F5F9' },
  container: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  propertyName: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  dateText: { fontSize: 14, color: '#475569', marginBottom: 4 },
  guestText: { fontSize: 14, color: '#64748B' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyStateText: { fontSize: 18, fontWeight: '600', color: '#475569', marginTop: 16 },
  emptyStateSubtext: { fontSize: 14, color: '#94A3B8', marginTop: 8, textAlign: 'center' },
  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 60, height: 60,
    borderRadius: 30, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 5,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#0F172A' },
  subText: { fontSize: 14, color: '#64748B', marginBottom: 24, lineHeight: 20 },
  actionButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 16, marginBottom: 12,
  },
  actionButtonDisabled: { backgroundColor: '#FFFFFF', borderStyle: 'dashed' },
  iconCircle: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center', marginRight: 16,
  },
  actionTextContainer: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 4 },
  actionSubtitle: { fontSize: 13, color: '#64748B' },
});