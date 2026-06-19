import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { addMedia, deleteMediaRecord, getMediaForProperty, setMainImage } from '../../database/mediaQueries';
import { getPropertyById, getStaysForProperty } from '../../database/propertyQueries';
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
  const propertyId = Number(id);

  const [property, setProperty] = useState<Property | null>(null);
  const [stays, setStays] = useState<Stay[]>([]);
  const [mediaList, setMediaList] = useState<PropertyMedia[]>([]);
  
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => { if (propertyId) loadData(); }, [propertyId]);

  const loadData = () => {
    setProperty(getPropertyById(propertyId));
    setStays(getStaysForProperty(propertyId));
    setMediaList(getMediaForProperty(propertyId));
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

  const handleSetMain = (mediaId: number) => {
    Alert.alert('Set Main Image', 'Use this photo as the cover for this property?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Set as Cover', onPress: () => { setMainImage(propertyId, mediaId); loadData(); }}
    ]);
  };

  const handleDeletePhoto = (mediaId: number, uri: string) => {
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
    // If there are no photos, we just share the text and the live Vercel link
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

      // Loop and upload all images
      for (const media of mediaList) {
        const uploadedUrl = await uploadToCloud(media.uri, propertyId);
        if (uploadedUrl) {
          validUrls.push(uploadedUrl);
          if (media.isMain) {
            coverUrl = uploadedUrl;
          }
        }
      }

      // Fallback if no main image was set
      if (!coverUrl && validUrls.length > 0) {
        coverUrl = validUrls[0];
      }
      
      // Upload text + all image URLs to Supabase
      await uploadDossierText(property!, coverUrl, validUrls);
      
      // Generate the live Next.js Vercel link and hand it to WhatsApp!
      const webUrl = `https://agent-aide-web.vercel.app/property/${propertyId}`;
      await sharePropertyText(property!, webUrl);

    } catch (error) {
      Alert.alert(
        'Cloud Sync Failed', 
        'Could not synchronize data with the cloud. Sharing offline text dossier instead.', 
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
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIconButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>{property.name}</Text>
        
        <TouchableOpacity onPress={() => sharePropertyText(property)} style={styles.headerIconButton}>
          <Ionicons name="share-outline" size={24} color={theme.text} />
        </TouchableOpacity>
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
          style={[
            styles.cloudShareButton, 
            { backgroundColor: isUploading ? theme.border : '#25D366' } 
          ]} 
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

        {property.address && (
          <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}>
            <Text style={[styles.sectionHeading, { color: theme.text }]}>Physical Location</Text>
            <Text style={[styles.addressBody, { color: theme.subText }]}>
              <Ionicons name="location-outline" size={16} color={theme.subText} /> {property.address}
            </Text>
          </View>
        )}

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 56, borderBottomWidth: 1 },
  headerIconButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
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
  emptyStaysText: { fontSize: 13, fontStyle: 'italic' }
});