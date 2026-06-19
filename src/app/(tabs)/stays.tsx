import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert, FlatList, Image, Modal, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, useColorScheme, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import HeroHeader from '../../components/HeroHeader';
import { getProperties } from '../../database/propertyQueries';
import { addStay, deleteStay, getStays } from '../../database/staysQueries';
import { Colors } from '../../theme/colors';
import { Property, Stay } from '../../types';
import { parseTicketText } from '../../utils/ticketParser';
import { shareStayToClient, shareStayToDriver } from '../../utils/whatsappFormatter';

// 🚨 FAIL-SAFE: Defined locally to instantly bypass the 'never' import bug
interface LocalStayWithProperty extends Stay {
  propertyName: string;
  mainImageUri?: string;
}

export default function StaysScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[isDark ? 'dark' : 'light'];

  // 🚨 Forced local type
  const [stays, setStays] = useState<LocalStayWithProperty[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  
  const [isModalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'options' | 'form'>('options');
  const [isPropertyModalVisible, setPropertyModalVisible] = useState(false);
  
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [flightInfo, setFlightInfo] = useState('');
  const [arrivalDate, setArrivalDate] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [guestCount, setGuestCount] = useState('1');

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = () => {
    // 🚨 Forced cast to guarantee TS reads the array correctly
    setStays((getStays() as unknown) as LocalStayWithProperty[] || []);
    setProperties(getProperties() || []);
  };

  const openModal = () => {
    setModalMode('options');
    setSelectedPropertyId(null);
    setFlightInfo('');
    setArrivalDate('');
    setArrivalTime('');
    setDepartureDate('');
    setGuestCount('1');
    setModalVisible(true);
  };

  const openManualForm = () => {
    setModalMode('form');
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
    if (!selectedPropertyId || !arrivalDate) {
      Alert.alert('Missing Info', 'Property and Arrival Date are required.');
      return;
    }
    try {
      const finalArrival = arrivalTime ? `${arrivalDate} at ${arrivalTime}` : arrivalDate;
      const finalDeparture = departureDate || 'TBD';

      addStay(selectedPropertyId, parseInt(guestCount) || 1, 0, 0, '', finalArrival, finalDeparture, flightInfo);
      setModalVisible(false);
      loadData();
    } catch (error) {
      Alert.alert('Database Error', 'Could not save the stay.');
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Remove Stay', 'Are you sure you want to remove this active stay?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => { deleteStay(id); loadData(); }}
    ]);
  };

  const getSelectedProperty = () => {
    return properties.find(p => p.id === selectedPropertyId);
  };

  const renderStayCard = ({ item }: { item: LocalStayWithProperty }) => (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}>
      {item.mainImageUri ? (
        <Image source={{ uri: item.mainImageUri }} style={styles.cardBanner} />
      ) : (
        <View style={[styles.cardBannerPlaceholder, { backgroundColor: theme.background }]}>
          <Ionicons name="image-outline" size={32} color={theme.subText} />
        </View>
      )}

      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={[styles.propertyName, { color: theme.text }]}>{item.propertyName}</Text>
          <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.iconButton}>
            <Ionicons name="trash-outline" size={20} color={theme.danger} />
          </TouchableOpacity>
        </View>
        <View style={styles.row}>
          <Ionicons name="airplane-outline" size={16} color={theme.subText} />
          <Text style={[styles.infoText, { color: theme.subText }]}> Flight: {item.flightInfo || 'N/A'}  •  Arrival: {item.arrivalDate}</Text>
        </View>
        {item.departureDate !== 'TBD' && (
          <View style={styles.row}>
            <Ionicons name="calendar-outline" size={16} color={theme.subText} />
            <Text style={[styles.infoText, { color: theme.subText }]}> Departure: {item.departureDate}</Text>
          </View>
        )}
        <View style={styles.row}>
          <Ionicons name="people-outline" size={16} color={theme.subText} />
          <Text style={[styles.infoText, { color: theme.subText }]}> Guests: {item.guestCount}</Text>
        </View>
        
        <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
          <View style={styles.dualActionRow}>
            <TouchableOpacity style={styles.clientButton} onPress={() => shareStayToClient(item)}>
              <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}> Client</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.driverButton, { backgroundColor: theme.background, borderColor: theme.border }]} onPress={() => shareStayToDriver(item)}>
              <Ionicons name="car-outline" size={18} color={theme.text} />
              <Text style={[styles.driverButtonText, { color: theme.text }]}> Driver</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.hero }]} edges={['top', 'left', 'right']}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        
        <FlatList
          data={stays}
          keyExtractor={(item) => item.id}
          renderItem={renderStayCard}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <HeroHeader title="Active Stays" subtitle="Track guest check-ins, flight schedules, and coordinate partner dispatches." iconName="calendar-outline" statLabel="Current Active Stays" statValue={stays.length} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="calendar-clear-outline" size={48} color={theme.subText} />
              <Text style={[styles.emptyStateText, { color: theme.subText }]}>No active stays.</Text>
            </View>
          }
        />

        <TouchableOpacity style={[styles.fab, { backgroundColor: theme.primary }]} onPress={openModal}>
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </TouchableOpacity>

        <Modal visible={isModalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => modalMode === 'form' ? setModalMode('options') : setModalVisible(false)}>
                  <Ionicons name={modalMode === 'form' ? "arrow-back" : "close"} size={28} color={theme.subText} />
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: theme.text }]}>{modalMode === 'options' ? 'Import Itinerary' : 'Stay Details'}</Text>
                <View style={{ width: 28 }} /> 
              </View>

              {modalMode === 'options' && (
                <>
                  <Text style={[styles.subText, { color: theme.subText }]}>Choose how you want to input the guest's data.</Text>
                  
                  <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.background, borderColor: theme.border }]} onPress={handlePasteTicket}>
                    <View style={styles.iconCircle}><Ionicons name="clipboard-outline" size={24} color={theme.primary} /></View>
                    <View style={styles.actionTextContainer}>
                      <Text style={[styles.actionTitle, { color: theme.text }]}>Auto-Parse Clipboard</Text>
                      <Text style={[styles.actionSubtitle, { color: theme.subText }]}>Extract dates and guests from copied text.</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.subText} />
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.background, borderColor: theme.border }]} onPress={openManualForm}>
                    <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}><Ionicons name="create-outline" size={24} color="#10B981" /></View>
                    <View style={styles.actionTextContainer}>
                      <Text style={[styles.actionTitle, { color: theme.text }]}>Enter Manually</Text>
                      <Text style={[styles.actionSubtitle, { color: theme.subText }]}>Type the details in yourself.</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.subText} />
                  </TouchableOpacity>
                </>
              )}

              {modalMode === 'form' && (
                <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 20 }}>
                  
                  <Text style={[styles.label, { color: theme.text }]}>Linked Property *</Text>
                  <TouchableOpacity 
                    style={[styles.propertySelectTrigger, { backgroundColor: theme.background, borderColor: theme.border }]}
                    onPress={() => setPropertyModalVisible(true)}
                  >
                    {selectedPropertyId ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="home" size={18} color={theme.primary} style={{ marginRight: 8 }} />
                        <Text style={[styles.propertySelectText, { color: theme.text, fontWeight: '600' }]}>{getSelectedProperty()?.name}</Text>
                      </View>
                    ) : (
                      <Text style={[styles.propertySelectText, { color: theme.subText }]}>Tap to select a property...</Text>
                    )}
                    <Ionicons name="chevron-down" size={20} color={theme.subText} />
                  </TouchableOpacity>

                  <Text style={[styles.label, { color: theme.text, marginTop: 12 }]}>Flight Number</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]} placeholderTextColor={theme.subText} value={flightInfo} onChangeText={setFlightInfo} placeholder="e.g. DL 1234" />

                  <View style={styles.rowInputs}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text style={[styles.label, { color: theme.text }]}>Arrival Date *</Text>
                      <TextInput style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]} placeholderTextColor={theme.subText} value={arrivalDate} onChangeText={setArrivalDate} placeholder="MM/DD/YYYY" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.label, { color: theme.text }]}>Arrival Time</Text>
                      <TextInput style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]} placeholderTextColor={theme.subText} value={arrivalTime} onChangeText={setArrivalTime} placeholder="e.g. 2:00 PM" />
                    </View>
                  </View>

                  <View style={styles.rowInputs}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text style={[styles.label, { color: theme.text }]}>Departure Date</Text>
                      <TextInput style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]} placeholderTextColor={theme.subText} value={departureDate} onChangeText={setDepartureDate} placeholder="MM/DD/YYYY" />
                    </View>
                    <View style={{ flex: 0.5 }}>
                      <Text style={[styles.label, { color: theme.text }]}>Guests</Text>
                      <TextInput style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]} placeholderTextColor={theme.subText} value={guestCount} onChangeText={setGuestCount} keyboardType="numeric" />
                    </View>
                  </View>

                  <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.primary }]} onPress={handleSaveStay}>
                    <Text style={styles.saveButtonText}>Save Itinerary</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        <Modal visible={isPropertyModalVisible} animationType="fade" transparent={true}>
          <View style={styles.modalOverlaySecondary}>
            <View style={[styles.modalContentSecondary, { backgroundColor: theme.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Select Property</Text>
                <TouchableOpacity onPress={() => setPropertyModalVisible(false)}>
                  <Ionicons name="close" size={24} color={theme.subText} />
                </TouchableOpacity>
              </View>
              
              <ScrollView showsVerticalScrollIndicator={false}>
                {properties.map(prop => (
                  <TouchableOpacity 
                    key={prop.id}
                    style={[
                      styles.propertyListItem, 
                      { borderBottomColor: theme.border },
                      selectedPropertyId === prop.id && { backgroundColor: theme.primary + '10' }
                    ]}
                    onPress={() => {
                      setSelectedPropertyId(prop.id);
                      setPropertyModalVisible(false);
                    }}
                  >
                    {prop.mainImageUri ? (
                      <Image source={{ uri: prop.mainImageUri }} style={styles.propertyListThumb} />
                    ) : (
                      <View style={[styles.propertyListThumb, { backgroundColor: theme.border, alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="home" size={20} color={theme.subText} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.propertyListTitle, { color: theme.text }]}>{prop.name}</Text>
                      {prop.address ? <Text style={{ color: theme.subText, fontSize: 12 }}>{prop.address}</Text> : null}
                    </View>
                    {selectedPropertyId === prop.id && (
                      <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                ))}
                {properties.length === 0 && (
                  <Text style={{ textAlign: 'center', color: theme.subText, padding: 20 }}>No properties available.</Text>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  listContent: { paddingBottom: 120 }, 
  card: { borderRadius: 16, marginBottom: 16, marginHorizontal: 16, elevation: 3, overflow: 'hidden' },
  cardBanner: { width: '100%', height: 120, resizeMode: 'cover' },
  cardBannerPlaceholder: { width: '100%', height: 120, alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  propertyName: { fontSize: 18, fontWeight: '700', flex: 1 },
  iconButton: { padding: 4 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  infoText: { fontSize: 14, marginLeft: 4 },
  cardFooter: { marginTop: 16, borderTopWidth: 1, paddingTop: 16 },
  dualActionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  clientButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#25D366', paddingVertical: 10, borderRadius: 8 },
  actionButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginLeft: 4 },
  driverButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, paddingVertical: 10, borderRadius: 8 },
  driverButtonText: { fontSize: 14, fontWeight: '700', marginLeft: 4 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyStateText: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  fab: { position: 'absolute', bottom: 100, right: 24, width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', elevation: 5 }, 
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  subText: { fontSize: 14, marginBottom: 24 },
  actionButton: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 },
  iconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  actionTextContainer: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  actionSubtitle: { fontSize: 13 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 20 },
  rowInputs: { flexDirection: 'row', justifyContent: 'space-between' },
  saveButton: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  propertySelectTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 8, padding: 16, marginBottom: 20 },
  propertySelectText: { fontSize: 16 },
  modalOverlaySecondary: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'center', padding: 20 },
  modalContentSecondary: { borderRadius: 20, padding: 20, maxHeight: '70%' },
  propertyListItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  propertyListThumb: { width: 50, height: 50, borderRadius: 8, marginRight: 12, resizeMode: 'cover' },
  propertyListTitle: { fontSize: 16, fontWeight: '600', marginBottom: 2 }
});