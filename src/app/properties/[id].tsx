import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

import { addMedia, deleteMediaRecord, getMediaForProperty } from '../../database/mediaQueries';
import { getPropertyById, getStaysForProperty } from '../../database/propertyQueries';
import { Property, PropertyMedia, Stay } from '../../types';

const { width } = Dimensions.get('window');

export default function PropertyDetailsScreen() {
  const { id } = useLocalSearchParams();
  const propertyId = Number(id);

  // State
  const [property, setProperty] = useState<Property | null>(null);
  const [stays, setStays] = useState<Stay[]>([]);
  const [mediaList, setMediaList] = useState<PropertyMedia[]>([]);

  useEffect(() => {
    if (propertyId) {
      loadData();
    }
  }, [propertyId]);

  const loadData = () => {
    setProperty(getPropertyById(propertyId));
    setStays(getStaysForProperty(propertyId));
    setMediaList(getMediaForProperty(propertyId));
  };

  // --- NATIVE FILE SYSTEM & MEDIA ENGINE ---
  const handleAddPhoto = async () => {
    try {
      // 1. Launch the native image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, // Allows the agent to crop the photo square natively
        aspect: [4, 3],
        quality: 0.8, // Compress slightly to save device space
      });

      if (result.canceled || !result.assets[0]) return;

      const cachedUri = result.assets[0].uri;
      
      // 2. Generate a unique, permanent file path inside the app's isolated sandbox
      const fileName = `property_${propertyId}_${Date.now()}.jpg`;
      const permanentUri = `${FileSystem.documentDirectory}${fileName}`;

      // 3. Copy from volatile cache to permanent storage
      await FileSystem.copyAsync({
        from: cachedUri,
        to: permanentUri,
      });

      // 4. Save the permanent path to SQLite
      addMedia(propertyId, permanentUri, 'photo');
      loadData(); // Refresh the gallery

    } catch (error) {
      console.error('Media Error:', error);
      Alert.alert('Error', 'Failed to save the image to local storage.');
    }
  };

  const handleDeletePhoto = (mediaId: number, uri: string) => {
    Alert.alert('Delete Photo', 'Remove this image from the property?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive', 
        onPress: async () => {
          try {
            // 1. Delete the physical file from the device hard drive to free up space
            await FileSystem.deleteAsync(uri, { idempotent: true });
            // 2. Delete the relational row from SQLite
            deleteMediaRecord(mediaId);
            loadData();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete the image.');
          }
        }
      }
    ]);
  };

  if (!property) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}><Text style={styles.errorText}>Property record not found.</Text></View>
      </SafeAreaView>
    );
  }

  const isCurrentlyBooked = stays.length > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{property.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* SPRINT 2: DYNAMIC MEDIA GALLERY */}
        <View style={styles.mediaSection}>
          <View style={styles.mediaHeader}>
            <Text style={styles.sectionHeading}>Asset Media</Text>
            <TouchableOpacity onPress={handleAddPhoto} style={styles.addMediaButton}>
              <Ionicons name="camera-outline" size={16} color="#3B82F6" />
              <Text style={styles.addMediaText}> Add Photo</Text>
            </TouchableOpacity>
          </View>

          {mediaList.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
              {mediaList.map((media) => (
                <TouchableOpacity 
                  key={media.id} 
                  onLongPress={() => handleDeletePhoto(media.id, media.uri)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: media.uri }} style={styles.galleryImage} />
                  <View style={styles.deleteOverlay}>
                    <Ionicons name="trash" size={16} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.mediaContainer}>
              <Ionicons name="images-outline" size={40} color="#CBD5E1" />
              <Text style={styles.mediaPlaceholderText}>No photos attached to this property.</Text>
            </View>
          )}
          {mediaList.length > 0 && (
            <Text style={styles.helperText}>Long-press any photo to delete it.</Text>
          )}
        </View>

        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, isCurrentlyBooked ? styles.badgeBooked : styles.badgeVacant]}>
            <Text style={[styles.statusText, isCurrentlyBooked ? styles.textBooked : styles.textVacant]}>
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
          <View style={styles.gridItem}>
            <Text style={styles.gridEmoji}>🛏️</Text>
            <Text style={styles.gridValue}>{property.roomsCount || 0}</Text>
            <Text style={styles.gridLabel}>Rooms</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridEmoji}>👥</Text>
            <Text style={styles.gridValue}>{property.maxGuests || 1}</Text>
            <Text style={styles.gridLabel}>Max Capacity</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridEmoji}>{property.petsAllowed ? '🐾' : '🚫'}</Text>
            <Text style={styles.gridValue}>{property.petsAllowed ? 'Yes' : 'No'}</Text>
            <Text style={styles.gridLabel}>Pets Allowed</Text>
          </View>
        </View>

        {property.address && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeading}>Physical Location</Text>
            <Text style={styles.addressBody}>
              <Ionicons name="location-outline" size={16} color="#64748B" /> {property.address}
            </Text>
          </View>
        )}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Asset Description</Text>
          <Text style={styles.descriptionBody}>
            {property.description || 'No formal text summary recorded for this real estate instance.'}
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Linked Bookings & Stays Log</Text>
          {stays.map((stay) => (
            <View key={stay.id} style={styles.stayLogItem}>
              <View style={styles.stayLogHeader}>
                <Text style={styles.stayLogDate}>📅 Check In: {stay.arrivalDate}</Text>
                <Text style={styles.stayLogCount}>👥 x{stay.guestCount}</Text>
              </View>
              {stay.flightInfo ? (
                <Text style={styles.stayLogSubText}>✈️ Flight Reference: {stay.flightInfo}</Text>
              ) : null}
            </View>
          ))}
          {stays.length === 0 && (
            <Text style={styles.emptyStaysText}>Zero stays linked with this property reference asset.</Text>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#EF4444', fontSize: 16, fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 56, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', flex: 1, textAlign: 'center' },
  scrollContent: { padding: 16 },
  
  // SPRINT 2 MEDIA STYLES
  mediaSection: { marginBottom: 20 },
  mediaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  addMediaButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 },
  addMediaText: { fontSize: 14, fontWeight: '600', color: '#3B82F6' },
  galleryScroll: { paddingBottom: 8 },
  galleryImage: { width: width * 0.7, height: 200, borderRadius: 12, marginRight: 12, backgroundColor: '#E2E8F0' },
  deleteOverlay: { position: 'absolute', bottom: 12, right: 24, backgroundColor: 'rgba(239, 68, 68, 0.9)', padding: 6, borderRadius: 12 },
  helperText: { fontSize: 11, color: '#94A3B8', marginTop: 4, fontStyle: 'italic' },
  mediaContainer: { height: 160, backgroundColor: '#F1F5F9', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: '#CBD5E1' },
  mediaPlaceholderText: { color: '#64748B', fontSize: 13, marginTop: 8, fontWeight: '500' },
  
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  badgeBooked: { backgroundColor: '#FEF2F2' },
  badgeVacant: { backgroundColor: '#F0FDF4' },
  statusText: { fontSize: 13, fontWeight: '700' },
  textBooked: { color: '#EF4444' },
  textVacant: { color: '#10B981' },
  metaGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 10 },
  gridItem: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, alignItems: 'center', elevation: 1 },
  gridEmoji: { fontSize: 20, marginBottom: 4 },
  gridValue: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  gridLabel: { fontSize: 11, color: '#64748B', marginTop: 2, fontWeight: '500' },
  sectionCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 1 },
  sectionHeading: { fontSize: 15, fontWeight: '700', color: '#334155', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  addressBody: { fontSize: 14, color: '#475569', lineHeight: 20 },
  descriptionBody: { fontSize: 14, color: '#475569', lineHeight: 22 },
  stayLogItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  stayLogHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  stayLogDate: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  stayLogCount: { fontSize: 13, fontWeight: '500', color: '#64748B' },
  stayLogSubText: { fontSize: 12, color: '#64748B' },
  emptyStaysText: { fontSize: 13, color: '#94A3B8', fontStyle: 'italic' }
});