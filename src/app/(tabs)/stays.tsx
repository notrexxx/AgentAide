import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, Modal,
  Platform,
  ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, useColorScheme, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import HeroHeader from '../../components/HeroHeader';
import { getProperties } from '../../database/propertyQueries';
import { addStay, deleteStay, getStays, updateStay } from '../../database/staysQueries';
import { Colors } from '../../theme/colors';
import { Property, Stay } from '../../types';
import { processImageForOCR } from '../../utils/ocrService';
import { parseTicketText } from '../../utils/ticketParser';
import { shareStayToClient, shareStayToDriver } from '../../utils/whatsappFormatter';

interface LocalStayWithProperty extends Stay {
  propertyName: string;
  mainImageUri?: string;
}

export default function StaysScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[isDark ? 'dark' : 'light'];

  const [stays, setStays] = useState<LocalStayWithProperty[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  
  const [isModalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'options' | 'form'>('options');
  const [isPropertyModalVisible, setPropertyModalVisible] = useState(false);
  const [activeStayDetails, setActiveStayDetails] = useState<LocalStayWithProperty | null>(null);
  const [editingStayId, setEditingStayId] = useState<string | null>(null);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);

  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [flightInfo, setFlightInfo] = useState('');
  const [guestCount, setGuestCount] = useState('1');
  const [specialRequests, setSpecialRequests] = useState('');

  const [arrivalDateObj, setArrivalDateObj] = useState(new Date());
  const [departureDateObj, setDepartureDateObj] = useState(new Date());
  const [arrivalTimeObj, setArrivalTimeObj] = useState(new Date());

  const [showArrivalPicker, setShowArrivalPicker] = useState(false);
  const [showDeparturePicker, setShowDeparturePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const formatDate = (date: Date) => date.toLocaleDateString('en-US'); 
  const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = () => {
    setStays((getStays() as unknown) as LocalStayWithProperty[] || []);
    setProperties(getProperties() || []);
  };

  const openCreateModal = () => {
    setEditingStayId(null);
    setModalMode('options');
    setSelectedPropertyId(null);
    setFlightInfo('');
    setArrivalDateObj(new Date());
    setDepartureDateObj(new Date());
    setArrivalTimeObj(new Date());
    setGuestCount('1');
    setSpecialRequests('');
    setModalVisible(true);
  };

  const handleEditStay = (stay: LocalStayWithProperty) => {
    setEditingStayId(stay.id);
    setSelectedPropertyId(stay.propertyId);
    setFlightInfo(stay.flightInfo || '');
    setGuestCount(stay.guestCount.toString());
    setSpecialRequests(stay.specialRequests || '');

    const arrParts = stay.arrivalDate.split(' at ');
    
    if (arrParts[0]) {
      const dateParts = arrParts[0].split('/');
      if (dateParts.length === 3) {
        const d = new Date(parseInt(dateParts[2], 10), parseInt(dateParts[0], 10) - 1, parseInt(dateParts[1], 10));
        if (!isNaN(d.getTime())) setArrivalDateObj(d);
      }
    }

    if (arrParts[1]) {
      const tDate = new Date();
      const timeParts = arrParts[1].match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (timeParts) {
        let hr = parseInt(timeParts[1], 10);
        const min = parseInt(timeParts[2], 10);
        const ampm = timeParts[3]?.toUpperCase();
        if (ampm === 'PM' && hr < 12) hr += 12;
        if (ampm === 'AM' && hr === 12) hr = 0;
        tDate.setHours(hr, min, 0, 0);
        setArrivalTimeObj(tDate);
      }
    } else {
      setArrivalTimeObj(new Date());
    }

    if (stay.departureDate && stay.departureDate !== 'TBD') {
      const depParts = stay.departureDate.split('/');
      if (depParts.length === 3) {
        const d = new Date(parseInt(depParts[2], 10), parseInt(depParts[0], 10) - 1, parseInt(depParts[1], 10));
        if (!isNaN(d.getTime())) setDepartureDateObj(d);
      }
    } else {
      setDepartureDateObj(new Date());
    }

    setActiveStayDetails(null);
    setModalMode('form');
    setModalVisible(true);
  };

  const applyParsedData = (parsedData: any) => {
    setFlightInfo(parsedData.flightInfo);
    
    if (parsedData.arrivalDate) {
      const parts = parsedData.arrivalDate.split('/');
      if (parts.length === 3) {
        const m = parseInt(parts[0], 10) - 1;
        const d = parseInt(parts[1], 10);
        const y = parseInt(parts[2], 10);
        const pDate = new Date(y, m, d);
        if (!isNaN(pDate.getTime())) setArrivalDateObj(pDate);
      }
    }
    
    if (parsedData.arrivalTime) {
      const [hr, min] = parsedData.arrivalTime.split(':');
      const tDate = new Date();
      tDate.setHours(parseInt(hr, 10), parseInt(min, 10), 0, 0);
      setArrivalTimeObj(tDate);
    }

    setGuestCount(parsedData.guestCount.toString());
    setModalMode('form');
  };

  const handleScanDocument = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], 
        allowsEditing: true, 
        quality: 1,
      });

      if (result.canceled || !result.assets[0]) return;

      setIsProcessingOCR(true);
      const extractedText = await processImageForOCR(result.assets[0].uri);

      if (!extractedText) {
         Alert.alert('Scan Failed', 'Could not extract text. Please enter manually.');
         return;
      }

      const parsedData = parseTicketText(extractedText);
      applyParsedData(parsedData);

    } catch (error: any) {
      Alert.alert('OCR Error', error.message || 'An error occurred while scanning.');
    } finally {
      setIsProcessingOCR(false);
    }
  };

  const handlePasteTicket = async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();
      if (!clipboardContent) {
        Alert.alert('Empty Clipboard', 'Please copy text first.');
        return;
      }
      const parsedData = parseTicketText(clipboardContent);
      applyParsedData(parsedData);
    } catch (error) {
      Alert.alert('Parsing Error', 'An error occurred reading the clipboard.');
    }
  };

  const handleSaveStay = () => {
    if (!selectedPropertyId) {
      Alert.alert('Missing Info', 'Property selection is required.');
      return;
    }
    try {
      const finalArrival = `${formatDate(arrivalDateObj)} at ${formatTime(arrivalTimeObj)}`;
      const finalDeparture = formatDate(departureDateObj);

      if (editingStayId) {
        updateStay(editingStayId, selectedPropertyId, parseInt(guestCount) || 1, 0, 0, specialRequests, finalArrival, finalDeparture, flightInfo);
      } else {
        addStay(selectedPropertyId, parseInt(guestCount) || 1, 0, 0, specialRequests, finalArrival, finalDeparture, flightInfo);
      }
      
      setModalVisible(false);
      loadData();
    } catch (error) {
      Alert.alert('Database Error', 'Could not save the stay.');
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Remove Stay', 'Are you sure you want to remove this active stay?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => { 
          deleteStay(id); 
          setActiveStayDetails(null);
          loadData(); 
      }}
    ]);
  };

  const getSelectedProperty = () => properties.find(p => p.id === selectedPropertyId);

  const renderStayCard = ({ item }: { item: LocalStayWithProperty }) => (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}
      activeOpacity={0.8}
      onPress={() => setActiveStayDetails(item)}
    >
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
          <Ionicons name="chevron-forward" size={20} color={theme.subText} />
        </View>
        <View style={styles.row}>
          <Ionicons name="airplane-outline" size={16} color={theme.subText} />
          <Text style={[styles.infoText, { color: theme.subText }]}> Flight: {item.flightInfo || 'N/A'}  •  Arrival: {item.arrivalDate.split(' at ')[0]}</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="people-outline" size={16} color={theme.subText} />
          <Text style={[styles.infoText, { color: theme.subText }]}> Guests: {item.guestCount}</Text>
        </View>
      </View>
    </TouchableOpacity>
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
            <HeroHeader title="Active Stays" subtitle="" iconName="calendar-outline" statLabel="Current Active Stays" statValue={stays.length} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="calendar-clear-outline" size={48} color={theme.subText} />
              <Text style={[styles.emptyStateText, { color: theme.subText }]}>No active stays.</Text>
            </View>
          }
        />

        <TouchableOpacity style={[styles.fab, { backgroundColor: theme.primary }]} onPress={openCreateModal}>
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </TouchableOpacity>

        <Modal visible={isModalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => modalMode === 'form' && !editingStayId ? setModalMode('options') : setModalVisible(false)}>
                  <Ionicons name={modalMode === 'form' && !editingStayId ? "arrow-back" : "close"} size={28} color={theme.subText} />
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: theme.text }]}>{editingStayId ? 'Edit Stay' : modalMode === 'options' ? 'Import Itinerary' : 'Stay Details'}</Text>
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

                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: theme.background, borderColor: theme.border }, isProcessingOCR && { opacity: 0.6 }]} 
                    onPress={handleScanDocument}
                    disabled={isProcessingOCR}
                  >
                    <View style={[styles.iconCircle, { backgroundColor: 'rgba(236, 72, 153, 0.1)' }]}>
                       {isProcessingOCR ? <ActivityIndicator color="#EC4899" /> : <Ionicons name="scan-outline" size={24} color="#EC4899" />}
                    </View>
                    <View style={styles.actionTextContainer}>
                      <Text style={[styles.actionTitle, { color: theme.text }]}>Scan Document / Photo</Text>
                      <Text style={[styles.actionSubtitle, { color: theme.subText }]}>
                        {isProcessingOCR ? 'Reading image...' : 'Upload a boarding pass image.'}
                      </Text>
                    </View>
                    {!isProcessingOCR && <Ionicons name="chevron-forward" size={20} color={theme.subText} />}
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.background, borderColor: theme.border }]} onPress={() => setModalMode('form')}>
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
                      <TouchableOpacity style={[styles.dateButton, { backgroundColor: theme.background, borderColor: theme.border }]} onPress={() => setShowArrivalPicker(true)}>
                        <Text style={{ color: theme.text }}>{formatDate(arrivalDateObj)}</Text>
                      </TouchableOpacity>
                      {showArrivalPicker && (
                        <DateTimePicker value={arrivalDateObj} mode="date" display="default" onChange={(e, d) => { setShowArrivalPicker(Platform.OS === 'ios'); if(d) setArrivalDateObj(d); }} />
                      )}
                    </View>
                    
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.label, { color: theme.text }]}>Arrival Time</Text>
                      <TouchableOpacity style={[styles.dateButton, { backgroundColor: theme.background, borderColor: theme.border }]} onPress={() => setShowTimePicker(true)}>
                        <Text style={{ color: theme.text }}>{formatTime(arrivalTimeObj)}</Text>
                      </TouchableOpacity>
                      {showTimePicker && (
                        <DateTimePicker value={arrivalTimeObj} mode="time" display="default" onChange={(e, d) => { setShowTimePicker(Platform.OS === 'ios'); if(d) setArrivalTimeObj(d); }} />
                      )}
                    </View>
                  </View>

                  <View style={styles.rowInputs}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text style={[styles.label, { color: theme.text }]}>Departure Date</Text>
                      <TouchableOpacity style={[styles.dateButton, { backgroundColor: theme.background, borderColor: theme.border }]} onPress={() => setShowDeparturePicker(true)}>
                        <Text style={{ color: theme.text }}>{formatDate(departureDateObj)}</Text>
                      </TouchableOpacity>
                      {showDeparturePicker && (
                        <DateTimePicker value={departureDateObj} mode="date" display="default" onChange={(e, d) => { setShowDeparturePicker(Platform.OS === 'ios'); if(d) setDepartureDateObj(d); }} />
                      )}
                    </View>
                    <View style={{ flex: 0.5 }}>
                      <Text style={[styles.label, { color: theme.text }]}>Guests</Text>
                      <TextInput style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]} placeholderTextColor={theme.subText} value={guestCount} onChangeText={setGuestCount} keyboardType="numeric" />
                    </View>
                  </View>

                  <Text style={[styles.label, { color: theme.text }]}>Special Requests</Text>
                  <TextInput style={[styles.input, styles.textArea, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]} placeholderTextColor={theme.subText} value={specialRequests} onChangeText={setSpecialRequests} placeholder="Early check-in, extra towels..." multiline numberOfLines={3} />

                  <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.primary }]} onPress={handleSaveStay}>
                    <Text style={styles.saveButtonText}>{editingStayId ? 'Save Changes' : 'Save Itinerary'}</Text>
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
                    style={[styles.propertyListItem, { borderBottomColor: theme.border }, selectedPropertyId === prop.id && { backgroundColor: theme.primary + '10' }]}
                    onPress={() => { setSelectedPropertyId(prop.id); setPropertyModalVisible(false); }}
                  >
                    {prop.mainImageUri ? (
                      <Image source={{ uri: prop.mainImageUri }} style={styles.propertyListThumb} />
                    ) : (
                      <View style={[styles.propertyListThumb, { backgroundColor: theme.border, alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="home" size={20} color={theme.subText} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}><Text style={[styles.propertyListTitle, { color: theme.text }]}>{prop.name}</Text></View>
                    {selectedPropertyId === prop.id && <Ionicons name="checkmark-circle" size={24} color={theme.primary} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal visible={!!activeStayDetails} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface, maxHeight: '95%' }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Stay Details</Text>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  {activeStayDetails && (
                    <>
                      <TouchableOpacity onPress={() => handleEditStay(activeStayDetails)}>
                        <Ionicons name="pencil-outline" size={24} color={theme.text} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(activeStayDetails.id)}>
                        <Ionicons name="trash-outline" size={24} color={theme.danger} />
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity onPress={() => setActiveStayDetails(null)}>
                    <Ionicons name="close" size={26} color={theme.subText} />
                  </TouchableOpacity>
                </View>
              </View>

              {activeStayDetails && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {activeStayDetails.mainImageUri && <Image source={{ uri: activeStayDetails.mainImageUri }} style={styles.detailsBanner} />}
                  
                  <Text style={[styles.detailsSectionTitle, { color: theme.primary, marginTop: 16 }]}>Property</Text>
                  <Text style={[styles.detailsTextLarge, { color: theme.text }]}>{activeStayDetails.propertyName}</Text>

                  <View style={styles.detailsGrid}>
                    <View style={styles.detailsBox}><Text style={[styles.detailsLabel, { color: theme.subText }]}>Arrival</Text><Text style={[styles.detailsValue, { color: theme.text }]}>{activeStayDetails.arrivalDate}</Text></View>
                    <View style={styles.detailsBox}><Text style={[styles.detailsLabel, { color: theme.subText }]}>Departure</Text><Text style={[styles.detailsValue, { color: theme.text }]}>{activeStayDetails.departureDate}</Text></View>
                  </View>

                  <View style={styles.detailsGrid}>
                    <View style={styles.detailsBox}><Text style={[styles.detailsLabel, { color: theme.subText }]}>Flight Info</Text><Text style={[styles.detailsValue, { color: theme.text }]}>{activeStayDetails.flightInfo || 'N/A'}</Text></View>
                    <View style={styles.detailsBox}><Text style={[styles.detailsLabel, { color: theme.subText }]}>Guests</Text><Text style={[styles.detailsValue, { color: theme.text }]}>{activeStayDetails.guestCount}</Text></View>
                  </View>

                  {activeStayDetails.specialRequests ? (
                    <>
                      <Text style={[styles.detailsSectionTitle, { color: theme.primary, marginTop: 16 }]}>Special Requests</Text>
                      <Text style={[styles.detailsTextBody, { color: theme.text }]}>{activeStayDetails.specialRequests}</Text>
                    </>
                  ) : null}

                  <View style={[styles.cardFooter, { borderTopColor: theme.border, marginTop: 24 }]}>
                    <View style={styles.dualActionRow}>
                      <TouchableOpacity style={styles.clientButton} onPress={() => shareStayToClient(activeStayDetails)}>
                        <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}> Client</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.driverButton, { backgroundColor: theme.background, borderColor: theme.border }]} onPress={() => shareStayToDriver(activeStayDetails)}>
                        <Ionicons name="car-outline" size={18} color={theme.text} />
                        <Text style={[styles.driverButtonText, { color: theme.text }]}> Driver</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>
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
  card: { borderRadius: 16, marginBottom: 16, marginHorizontal: 16, elevation: 3, overflow: 'hidden' },
  cardBanner: { width: '100%', height: 100, resizeMode: 'cover' },
  cardBannerPlaceholder: { width: '100%', height: 100, alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  propertyName: { fontSize: 18, fontWeight: '700', flex: 1 },
  iconButton: { padding: 4 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
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
  dateButton: { borderWidth: 1, borderRadius: 8, padding: 16, marginBottom: 20, justifyContent: 'center' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  rowInputs: { flexDirection: 'row', justifyContent: 'space-between' },
  saveButton: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  propertySelectTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 8, padding: 16, marginBottom: 20 },
  propertySelectText: { fontSize: 16 },
  modalOverlaySecondary: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'center', padding: 20 },
  modalContentSecondary: { borderRadius: 20, padding: 20, maxHeight: '70%' },
  propertyListItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  propertyListThumb: { width: 50, height: 50, borderRadius: 8, marginRight: 12, resizeMode: 'cover' },
  propertyListTitle: { fontSize: 16, fontWeight: '600', marginBottom: 2 },

  detailsBanner: { width: '100%', height: 160, borderRadius: 12, resizeMode: 'cover' },
  detailsSectionTitle: { fontSize: 13, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  detailsTextLarge: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  detailsTextBody: { fontSize: 16, lineHeight: 24 },
  detailsGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  detailsBox: { flex: 1, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12 },
  detailsLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  detailsValue: { fontSize: 16, fontWeight: '700' }
});