import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Dimensions, Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text, TextInput, TouchableOpacity, useColorScheme, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { addMedia, deleteMediaRecord, getMediaForProperty, setMainImage } from '../../database/mediaQueries';
// IMPORT RESTORED: Added updateProperty and deleteProperty
import { deleteProperty, getPropertyById, getStaysForProperty, updateProperty } from '../../database/propertyQueries';
import { Colors } from '../../theme/colors';
import { Property, PropertyMedia, Stay } from '../../types';
import { uploadDossierText, uploadToCloud } from '../../utils/cloudSync';
import { shareLocalPhoto, sharePropertyText } from '../../utils/whatsappFormatter';

const { width } = Dimensions.get('window');

export default function PropertyDetailsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[isDark ? 'dark' : 'light'];

  const { id } = useLocalSearchParams();
  const propertyId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';

  const [property, setProperty] = useState<Property | null>(null);
  const [stays, setStays] = useState<Stay[]>([]);
  const [mediaList, setMediaList] = useState<PropertyMedia[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // NEW: Edit Modal States
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editIsAirbnb, setEditIsAirbnb] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editRoomsCount, setEditRoomsCount] = useState('');
  const [editMaxGuests, setEditMaxGuests] = useState('');
  const [editPetsAllowed, setEditPetsAllowed] = useState(false);

  useEffect(() => { if (propertyId) loadData(); }, [propertyId]);

  const loadData = () => {
    setProperty(getPropertyById(propertyId));
    setStays(getStaysForProperty(propertyId));
    setMediaList(getMediaForProperty(propertyId));
  };

  // NEW: Open Edit Form pre-filled with data
  const openEditModal = () => {
    if (!property) return;
    setEditName(property.name);
    setEditAddress(property.address || '');
    setEditIsAirbnb(property.isAirbnb);
    setEditDescription(property.description || '');
    setEditRoomsCount(property.roomsCount?.toString() || '');
    setEditMaxGuests(property.maxGuests?.toString() || '');
    setEditPetsAllowed(property.petsAllowed || false);
    setEditModalVisible(true);
  };

  // NEW: Save Edits
  const handleSaveEdit = () => {
    if (!editName.trim()) {
      Alert.alert('Validation Error', 'Property Name is required.');
      return;
    }
    try {
      updateProperty(
        propertyId, editName, editIsAirbnb, editAddress, editDescription,
        parseInt(editRoomsCount) || 0, parseInt(editMaxGuests) || 1, editPetsAllowed
      );
      setEditModalVisible(false);
      loadData(); // Refresh UI instantly
    } catch (error) {
      Alert.alert('Error', 'Could not update property details.');
    }
  };

  // NEW: Delete Property Sequence
  const handleDeleteProperty = () => {
    Alert.alert(
      'Delete Property', 
      `Are you sure you want to permanently delete "${property?.name}"? This will also wipe all linked photos and stays.`, 
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => {
            deleteProperty(propertyId);
            router.replace('/(tabs)'); // Boot user back to the hub
          }
        }
      ]
    );
  };

  const handleAddPhotos = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true, 
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        for (const asset of result.assets) {
          const cachedUri = asset.uri;
          const fileName = `property_${propertyId}_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
          const permanentUri = `${FileSystem.documentDirectory}${fileName}`;
          await FileSystem.copyAsync({ from: cachedUri, to: permanentUri });
          const isFirstEver = mediaList.length === 0;
          addMedia(propertyId, permanentUri, 'photo', isFirstEver);
        }
        loadData();
      }
    } catch (error) { Alert.alert('Error', 'Failed to save the images.'); }
  };

  const handleSetMain = (mediaId: string) => {
    Alert.alert('Set Main Image', 'Use this photo as the cover for this property?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Set as Cover', onPress: () => { setMainImage(propertyId, mediaId); loadData(); }}
    ]);
  };

  const handleDeletePhoto = (mediaId: string, uri: string) => {
    Alert.alert('Delete Photo', 'Remove this image?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          await FileSystem.deleteAsync(uri, { idempotent: true });
          deleteMediaRecord(mediaId);
          loadData();
        }
      }
    ]);
  };

  const handleCloudShare = async () => {
    if (mediaList.length === 0) {
      await uploadDossierText(property!, null, []);
      const webUrl = `https://agent-aide-web.vercel.app/property/${propertyId}`;
      await sharePropertyText(property!, webUrl);
      return;
    }

    try {
      setIsUploading(true);
      let validUrls: string[] = [];
      let coverUrl: string | null = null;

      for (const media of mediaList) {
        const galleryUrl = await uploadToCloud(media.uri, propertyId, false);
        if (galleryUrl) {
          validUrls.push(galleryUrl);
          if (media.isMain) {
            coverUrl = await uploadToCloud(media.uri, propertyId, true);
          }
        }
      }

      if (!coverUrl && validUrls.length > 0) {
        coverUrl = validUrls[0]; 
      }
      
      await uploadDossierText(property!, coverUrl, validUrls);
      
      const webUrl = `https://agent-aide-web.vercel.app/property/${propertyId}?v=${Date.now()}`;
      await sharePropertyText(property!, webUrl);

    } catch (error) {
      Alert.alert(
        'Cloud Sync Failed', 
        'Could not synchronize data with the cloud.', 
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Share Text Only', onPress: () => sharePropertyText(property!) }
        ]
      );
    } finally {
      setIsUploading(false);
    }
  };

  if (!property) return null;
  const isCurrentlyBooked = stays.length > 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.surface }]} edges={['top', 'left', 'right']}>
      
      {/* UPGRADED HEADER: Back, Title, Edit, Delete */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIconButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>{property.name}</Text>
        
        <View style={styles.headerRightControls}>
          <TouchableOpacity onPress={openEditModal} style={styles.headerSmallButton}>
            <Ionicons name="pencil" size={20} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteProperty} style={styles.headerSmallButton}>
            <Ionicons name="trash-outline" size={20} color={theme.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} style={{ backgroundColor: theme.background }}>
        
        <View style={styles.mediaSection}>
          <View style={styles.mediaHeader}>
            <Text style={[styles.sectionHeading, { color: theme.text }]}>Asset Media</Text>
            <TouchableOpacity onPress={handleAddPhotos} style={[styles.addMediaButton, { backgroundColor: theme.primary + '20' }]}>
              <Ionicons name="images-outline" size={16} color={theme.primary} />
              <Text style={[styles.addMediaText, { color: theme.primary }]}> Add Photos</Text>
            </TouchableOpacity>
          </View>

          {mediaList.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
              {mediaList.map((media) => (
                <View key={media.id} style={{ position: 'relative' }}>
                  <Image source={{ uri: media.uri }} style={[styles.galleryImage, { backgroundColor: theme.border }]} />
                  
                  <TouchableOpacity style={[styles.actionOverlay, { top: 12, left: 12, backgroundColor: theme.surface }]} onPress={() => handleSetMain(media.id)}>
                    <Ionicons name={media.isMain ? "star" : "star-outline"} size={22} color={media.isMain ? "#F59E0B" : theme.text} />
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.actionOverlay, { top: 12, right: 24, backgroundColor: theme.surface }]} onPress={() => shareLocalPhoto(media.uri)}>
                    <Ionicons name="share-social" size={18} color={theme.text} />
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.actionOverlay, { bottom: 12, right: 24, backgroundColor: theme.danger }]} onPress={() => handleDeletePhoto(media.id, media.uri)}>
                    <Ionicons name="trash" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.mediaContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={[styles.mediaPlaceholderText, { color: theme.subText }]}>No photos attached.</Text>
            </View>
          )}
        </View>

        <TouchableOpacity 
          style={[styles.cloudShareButton, { backgroundColor: isUploading ? theme.border : '#25D366' }]} 
          onPress={handleCloudShare}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="logo-whatsapp" size={22} color="#FFFFFF" />
              <Text style={styles.cloudShareButtonText}>Generate Cloud Dossier</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { borderWidth: 1, borderColor: isCurrentlyBooked ? theme.danger : theme.success }]}>
            <Text style={[styles.statusText, { color: isCurrentlyBooked ? theme.danger : theme.success }]}>
              {isCurrentlyBooked ? '• Currently Booked' : '• Vacant / Available'}
            </Text>
          </View>
          {!!property.isAirbnb && (
            <View style={[styles.statusBadge, { backgroundColor: '#FF5A5F' }]}>
              <FontAwesome5 name="airbnb" size={12} color="#FFFFFF" />
              <Text style={[styles.statusText, { color: '#FFFFFF', marginLeft: 4 }]}>Airbnb Listing</Text>
            </View>
          )}
        </View>

        <View style={styles.metaGrid}>
          <View style={[styles.gridItem, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}>
            <Text style={styles.gridEmoji}>🛏️</Text>
            <Text style={[styles.gridValue, { color: theme.text }]}>{property.roomsCount || 0}</Text>
            <Text style={[styles.gridLabel, { color: theme.subText }]}>Rooms</Text>
          </View>
          <View style={[styles.gridItem, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}>
            <Text style={styles.gridEmoji}>👥</Text>
            <Text style={[styles.gridValue, { color: theme.text }]}>{property.maxGuests || 1}</Text>
            <Text style={[styles.gridLabel, { color: theme.subText }]}>Max Capacity</Text>
          </View>
          <View style={[styles.gridItem, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}>
            <Text style={styles.gridEmoji}>{property.petsAllowed ? '🐾' : '🚫'}</Text>
            <Text style={[styles.gridValue, { color: theme.text }]}>{property.petsAllowed ? 'Yes' : 'No'}</Text>
            <Text style={[styles.gridLabel, { color: theme.subText }]}>Pets Allowed</Text>
          </View>
        </View>

        {property.address ? (
          <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}>
            <Text style={[styles.sectionHeading, { color: theme.text }]}>Physical Location</Text>
            <Text style={[styles.addressBody, { color: theme.subText }]}>
              <Ionicons name="location-outline" size={16} color={theme.subText} /> {property.address}
            </Text>
          </View>
        ) : null}

        <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}>
          <Text style={[styles.sectionHeading, { color: theme.text }]}>Asset Description</Text>
          <Text style={[styles.descriptionBody, { color: theme.subText }]}>
            {property.description || 'No formal text summary recorded for this real estate instance.'}
          </Text>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}>
          <Text style={[styles.sectionHeading, { color: theme.text }]}>Linked Bookings & Stays Log</Text>
          {stays.map((stay) => (
            <View key={stay.id} style={[styles.stayLogItem, { borderBottomColor: theme.border }]}>
              <View style={styles.stayLogHeader}>
                <Text style={[styles.stayLogDate, { color: theme.text }]}>📅 Check In: {stay.arrivalDate}</Text>
                <Text style={[styles.stayLogCount, { color: theme.subText }]}>👥 x{stay.guestCount}</Text>
              </View>
              {stay.flightInfo ? (
                <Text style={[styles.stayLogSubText, { color: theme.subText }]}>✈️ Flight Reference: {stay.flightInfo}</Text>
              ) : null}
            </View>
          ))}
          {stays.length === 0 && <Text style={[styles.emptyStaysText, { color: theme.subText }]}>Zero stays linked with this property reference asset.</Text>}
        </View>

      </ScrollView>

      {/* NEW: Edit Property Modal */}
      <Modal visible={isEditModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Details</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={28} color={theme.subText} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: theme.text }]}>Property Name *</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]} placeholderTextColor={theme.subText} value={editName} onChangeText={setEditName} />

              <Text style={[styles.label, { color: theme.text }]}>Address</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]} placeholderTextColor={theme.subText} value={editAddress} onChangeText={setEditAddress} />

              <Text style={[styles.label, { color: theme.text }]}>Description</Text>
              <TextInput style={[styles.input, styles.textArea, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]} placeholderTextColor={theme.subText} multiline numberOfLines={3} value={editDescription} onChangeText={setEditDescription} />

              <View style={styles.rowInputs}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={[styles.label, { color: theme.text }]}>Rooms</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]} placeholderTextColor={theme.subText} keyboardType="numeric" value={editRoomsCount} onChangeText={setEditRoomsCount} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: theme.text }]}>Max Guests</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]} placeholderTextColor={theme.subText} keyboardType="numeric" value={editMaxGuests} onChangeText={setEditMaxGuests} />
                </View>
              </View>

              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>Allow Pets?</Text>
                <Switch value={editPetsAllowed} onValueChange={setEditPetsAllowed} trackColor={{ false: theme.border, true: theme.success }} />
              </View>

              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>List as Airbnb?</Text>
                <Switch value={editIsAirbnb} onValueChange={setEditIsAirbnb} trackColor={{ false: theme.border, true: theme.danger }} />
              </View>

              <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.primary }]} onPress={handleSaveEdit}>
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 56, borderBottomWidth: 1 },
  headerIconButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  headerRightControls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerSmallButton: { padding: 8 },
  scrollContent: { padding: 16 },
  mediaSection: { marginBottom: 16 },
  mediaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  addMediaButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 },
  addMediaText: { fontSize: 14, fontWeight: '600' },
  galleryScroll: { paddingBottom: 8 },
  galleryImage: { width: width * 0.7, height: 200, borderRadius: 12, marginRight: 12, resizeMode: 'cover' },
  actionOverlay: { position: 'absolute', padding: 8, borderRadius: 20, elevation: 3 },
  mediaContainer: { height: 160, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 2 },
  mediaPlaceholderText: { fontSize: 13, marginTop: 8, fontWeight: '500' },
  cloudShareButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, marginBottom: 20, elevation: 2, gap: 8 },
  cloudShareButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  statusText: { fontSize: 13, fontWeight: '700' },
  metaGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 10 },
  gridItem: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', elevation: 1 },
  gridEmoji: { fontSize: 20, marginBottom: 4 },
  gridValue: { fontSize: 16, fontWeight: '700' },
  gridLabel: { fontSize: 11, marginTop: 2, fontWeight: '500' },
  sectionCard: { borderRadius: 12, padding: 16, marginBottom: 12, elevation: 1 },
  sectionHeading: { fontSize: 15, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  addressBody: { fontSize: 14, lineHeight: 20 },
  descriptionBody: { fontSize: 14, lineHeight: 22 },
  stayLogItem: { paddingVertical: 10, borderBottomWidth: 1 },
  stayLogHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  stayLogDate: { fontSize: 14, fontWeight: '600' },
  stayLogCount: { fontSize: 13, fontWeight: '500' },
  stayLogSubText: { fontSize: 12 },
  emptyStaysText: { fontSize: 13, fontStyle: 'italic' },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  formScroll: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 14 },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  rowInputs: { flexDirection: 'row' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  switchLabel: { fontSize: 15, fontWeight: '500' },
  saveButton: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' }
});