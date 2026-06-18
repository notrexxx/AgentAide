import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal, SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { getProperties } from '../../database/propertyQueries';
import { addStay, deleteStay, getStays, StayWithProperty } from '../../database/staysQueries';
import { Property } from '../../types';
import { parseTicketText } from '../../utils/ticketParser';
import { shareToWhatsApp } from '../../utils/whatsappFormatter';

export default function StaysScreen() {
  // --- STATE ---
  const [stays, setStays] = useState<StayWithProperty[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  
  // Modal & Form State
  const [isModalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'options' | 'form'>('options');
  
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [flightInfo, setFlightInfo] = useState('');
  const [arrivalDate, setArrivalDate] = useState('');
  const [guestCount, setGuestCount] = useState('1');

  // --- DATA FETCHING ---
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = () => {
    setStays(getStays());
    setProperties(getProperties());
  };

  // --- PARSING & FORM FLOW ---
  const openModal = () => {
    setModalMode('options');
    setSelectedPropertyId(null);
    setFlightInfo('');
    setArrivalDate('');
    setGuestCount('1');
    setModalVisible(true);
  };

  const handlePasteTicket = async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();
      if (!clipboardContent) {
        Alert.alert('Empty Clipboard', 'Please copy the ticket text before pressing this button.');
        return;
      }

      const parsedData = parseTicketText(clipboardContent);

      setFlightInfo(parsedData.flightInfo);
      setArrivalDate(parsedData.arrivalDate);
      setGuestCount(parsedData.guestCount.toString());

      setModalMode('form');
    } catch (error) {
      Alert.alert('Parsing Error', 'An error occurred while reading the clipboard.');
    }
  };

  const handleSaveStay = () => {
    if (!selectedPropertyId) {
      Alert.alert('Missing Info', 'Please select a property for this stay.');
      return;
    }
    if (!arrivalDate) {
      Alert.alert('Missing Info', 'Arrival Date is required.');
      return;
    }

    try {
      addStay(
        selectedPropertyId,
        parseInt(guestCount) || 1,
        0, 
        0, 
        '', 
        arrivalDate, 
        'TBD', 
        flightInfo
      );
      
      setModalVisible(false);
      loadData();
    } catch (error) {
      Alert.alert('Database Error', 'Could not save the stay.');
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Remove Stay', 'Are you sure you want to remove this active stay?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
        deleteStay(id);
        loadData();
      }}
    ]);
  };

  // --- UI COMPONENTS ---
  const renderStayCard = ({ item }: { item: StayWithProperty }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.propertyName}>{item.propertyName}</Text>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.iconButton}>
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
        <Ionicons name="airplane-outline" size={16} color="#64748B" />
        <Text style={styles.infoText}> Flight: {item.flightInfo || 'N/A'}  •  Arrival: {item.arrivalDate}</Text>
      </View>
      <View style={styles.row}>
        <Ionicons name="people-outline" size={16} color="#64748B" />
        <Text style={styles.infoText}> Guests: {item.guestCount}</Text>
      </View>
      
      {/* NEW: WhatsApp Integration Row */}
      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.whatsappButton} onPress={() => shareToWhatsApp(item)}>
          <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
          <Text style={styles.whatsappButtonText}> Share Details via WhatsApp</Text>
        </TouchableOpacity>
      </View>
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

        <TouchableOpacity style={styles.fab} onPress={openModal}>
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </TouchableOpacity>

        <Modal
          visible={isModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              
              <View style={styles.modalHeader}>
                <TouchableOpacity 
                  onPress={() => modalMode === 'form' ? setModalMode('options') : setModalVisible(false)}
                >
                  <Ionicons name={modalMode === 'form' ? "arrow-back" : "close"} size={28} color="#64748B" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>
                  {modalMode === 'options' ? 'Import Itinerary' : 'Confirm Details'}
                </Text>
                <View style={{ width: 28 }} /> 
              </View>

              {modalMode === 'options' && (
                <>
                  <Text style={styles.subText}>Choose how you want to import the guest's flight and arrival data.</Text>
                  
                  <TouchableOpacity style={styles.actionButton} onPress={handlePasteTicket}>
                    <View style={styles.iconCircle}>
                      <Ionicons name="clipboard-outline" size={24} color="#3B82F6" />
                    </View>
                    <View style={styles.actionTextContainer}>
                      <Text style={styles.actionTitle}>Paste Ticket Text</Text>
                      <Text style={styles.actionSubtitle}>Instantly parse dates and guests.</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                  </TouchableOpacity>

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
                </>
              )}

              {modalMode === 'form' && (
                <View>
                  <Text style={styles.label}>Select Property *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.propertyScroll}>
                    {properties.map(prop => (
                      <TouchableOpacity 
                        key={prop.id} 
                        style={[styles.propertyPill, selectedPropertyId === prop.id && styles.propertyPillActive]}
                        onPress={() => setSelectedPropertyId(prop.id)}
                      >
                        <Text style={[styles.propertyPillText, selectedPropertyId === prop.id && styles.propertyPillTextActive]}>
                          {prop.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  {properties.length === 0 && (
                    <Text style={styles.warningText}>No properties found. Please add one in the Properties tab first.</Text>
                  )}

                  <Text style={styles.label}>Flight Number</Text>
                  <TextInput style={styles.input} value={flightInfo} onChangeText={setFlightInfo} placeholder="e.g. DL 1234" />

                  <View style={styles.rowInputs}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text style={styles.label}>Arrival Date *</Text>
                      <TextInput style={styles.input} value={arrivalDate} onChangeText={setArrivalDate} placeholder="e.g. Oct 12" />
                    </View>
                    <View style={{ flex: 0.5 }}>
                      <Text style={styles.label}>Guests</Text>
                      <TextInput style={styles.input} value={guestCount} onChangeText={setGuestCount} keyboardType="numeric" />
                    </View>
                  </View>

                  <TouchableOpacity style={styles.saveButton} onPress={handleSaveStay}>
                    <Text style={styles.saveButtonText}>Save Itinerary</Text>
                  </TouchableOpacity>
                </View>
              )}

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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  propertyName: { fontSize: 18, fontWeight: '700', color: '#0F172A', flex: 1 },
  iconButton: { padding: 4 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  infoText: { fontSize: 14, color: '#475569', marginLeft: 4 },
  
  // New Footer Styles
  cardFooter: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16 },
  whatsappButton: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
    backgroundColor: '#25D366', // Official WhatsApp Green
    paddingVertical: 10, borderRadius: 8 
  },
  whatsappButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginLeft: 6 },
  
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyStateText: { fontSize: 18, fontWeight: '600', color: '#475569', marginTop: 16 },
  emptyStateSubtext: { fontSize: 14, color: '#94A3B8', marginTop: 8, textAlign: 'center' },
  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 60, height: 60,
    borderRadius: 30, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 5,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: '60%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  subText: { fontSize: 14, color: '#64748B', marginBottom: 24, lineHeight: 20 },
  actionButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 16, marginBottom: 12,
  },
  actionButtonDisabled: { backgroundColor: '#FFFFFF', borderStyle: 'dashed' },
  iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  actionTextContainer: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 4 },
  actionSubtitle: { fontSize: 13, color: '#64748B' },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
  input: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8,
    padding: 12, fontSize: 16, color: '#0F172A', marginBottom: 20,
  },
  rowInputs: { flexDirection: 'row', justifyContent: 'space-between' },
  propertyScroll: { marginBottom: 20, maxHeight: 50 },
  propertyPill: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0', marginRight: 8,
    alignSelf: 'flex-start'
  },
  propertyPillActive: { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' },
  propertyPillText: { fontSize: 14, fontWeight: '500', color: '#64748B' },
  propertyPillTextActive: { color: '#2563EB', fontWeight: '700' },
  warningText: { color: '#EF4444', fontSize: 12, marginBottom: 16 },
  saveButton: { backgroundColor: '#0F172A', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});