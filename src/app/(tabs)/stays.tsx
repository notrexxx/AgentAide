import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import HeroHeader from '../../components/HeroHeader';
import { getProperties } from '../../database/propertyQueries';
import { addStay, deleteStay, getStays, StayWithProperty } from '../../database/staysQueries';
import { Colors } from '../../theme/colors';
import { Property } from '../../types';
import { parseTicketText } from '../../utils/ticketParser';
import { shareStayToClient, shareStayToDriver } from '../../utils/whatsappFormatter';

export default function StaysScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[isDark ? 'dark' : 'light'];

  const [stays, setStays] = useState<StayWithProperty[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  
  const [isModalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'options' | 'form'>('options');
  
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [flightInfo, setFlightInfo] = useState('');
  const [arrivalDate, setArrivalDate] = useState('');
  const [guestCount, setGuestCount] = useState('1');

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = () => {
    setStays(getStays());
    setProperties(getProperties());
  };

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
    if (!selectedPropertyId || !arrivalDate) {
      Alert.alert('Missing Info', 'Property and Arrival Date are required.');
      return;
    }
    try {
      addStay(selectedPropertyId, parseInt(guestCount) || 1, 0, 0, '', arrivalDate, 'TBD', flightInfo);
      setModalVisible(false);
      loadData();
    } catch (error) {
      Alert.alert('Database Error', 'Could not save the stay.');
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Remove Stay', 'Are you sure you want to remove this active stay?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => { deleteStay(id); loadData(); }}
    ]);
  };

  const renderStayCard = ({ item }: { item: StayWithProperty }) => (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}>
      
      {/* NEW: Edge-to-Edge Image Banner for Stays */}
      {item.mainImageUri ? (
        <Image source={{ uri: item.mainImageUri }} style={styles.cardBanner} />
      ) : (
        <View style={[styles.cardBannerPlaceholder, { backgroundColor: theme.background }]}>
          <Ionicons name="image-outline" size={32} color={theme.subText} />
        </View>
      )}

      {/* NEW: Padded Card Body */}
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
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderStayCard}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <HeroHeader 
              title="Active Stays"
              subtitle="Track guest check-ins, flight schedules, and coordinate partner dispatches."
              iconName="calendar-outline"
              statLabel="Current Active Stays"
              statValue={stays.length}
            />
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
                <Text style={[styles.modalTitle, { color: theme.text }]}>{modalMode === 'options' ? 'Import Itinerary' : 'Confirm Details'}</Text>
                <View style={{ width: 28 }} /> 
              </View>

              {modalMode === 'options' && (
                <>
                  <Text style={[styles.subText, { color: theme.subText }]}>Choose how you want to import the guest's flight data.</Text>
                  <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.background, borderColor: theme.border }]} onPress={handlePasteTicket}>
                    <View style={styles.iconCircle}><Ionicons name="clipboard-outline" size={24} color={theme.primary} /></View>
                    <View style={styles.actionTextContainer}>
                      <Text style={[styles.actionTitle, { color: theme.text }]}>Paste Ticket Text</Text>
                      <Text style={[styles.actionSubtitle, { color: theme.subText }]}>Instantly parse dates and guests.</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.subText} />
                  </TouchableOpacity>
                </>
              )}

              {modalMode === 'form' && (
                <View>
                  <Text style={[styles.label, { color: theme.text }]}>Select Property *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.propertyScroll}>
                    {properties.map(prop => (
                      <TouchableOpacity 
                        key={prop.id} 
                        style={[
                          styles.propertyPill, 
                          { backgroundColor: theme.background, borderColor: theme.border },
                          selectedPropertyId === prop.id && { backgroundColor: theme.primary + '20', borderColor: theme.primary }
                        ]}
                        onPress={() => setSelectedPropertyId(prop.id)}
                      >
                        <Text style={[
                          styles.propertyPillText, 
                          { color: theme.subText },
                          selectedPropertyId === prop.id && { color: theme.primary, fontWeight: '700' }
                        ]}>{prop.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <Text style={[styles.label, { color: theme.text }]}>Flight Number</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]} placeholderTextColor={theme.subText} value={flightInfo} onChangeText={setFlightInfo} placeholder="e.g. DL 1234" />

                  <View style={styles.rowInputs}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text style={[styles.label, { color: theme.text }]}>Arrival Date *</Text>
                      <TextInput style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]} placeholderTextColor={theme.subText} value={arrivalDate} onChangeText={setArrivalDate} />
                    </View>
                    <View style={{ flex: 0.5 }}>
                      <Text style={[styles.label, { color: theme.text }]}>Guests</Text>
                      <TextInput style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]} placeholderTextColor={theme.subText} value={guestCount} onChangeText={setGuestCount} keyboardType="numeric" />
                    </View>
                  </View>

                  <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.primary }]} onPress={handleSaveStay}>
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
  safeArea: { flex: 1 },
  container: { flex: 1 },
  listContent: { paddingBottom: 120 }, 
  
  // NEW: Updated Card styles for Edge-to-Edge Banners
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
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: '60%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  subText: { fontSize: 14, marginBottom: 24 },
  actionButton: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 },
  iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(59, 130, 246, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  actionTextContainer: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  actionSubtitle: { fontSize: 13 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 20 },
  rowInputs: { flexDirection: 'row', justifyContent: 'space-between' },
  propertyScroll: { marginBottom: 20, maxHeight: 50 },
  propertyPill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, marginRight: 8, alignSelf: 'flex-start' },
  propertyPillText: { fontSize: 14, fontWeight: '500' },
  saveButton: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});