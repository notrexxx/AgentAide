import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme // NEW: Imported to detect dark mode
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import HeroHeader from '../../components/HeroHeader';
import { addMedia } from '../../database/mediaQueries';
import { addProperty, deleteProperty, getProperties } from '../../database/propertyQueries';
import { Colors } from '../../theme/colors'; // NEW: Imported our color dictionary
import { Property } from '../../types';

export default function PropertiesHubScreen() {
  // NEW: Theme detection engine
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[isDark ? 'dark' : 'light'];

  const [properties, setProperties] = useState<Property[]>([]);
  const [isModalVisible, setModalVisible] = useState(false);
  
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [isAirbnb, setIsAirbnb] = useState(false);
  const [description, setDescription] = useState('');
  const [roomsCount, setRoomsCount] = useState('');
  const [maxGuests, setMaxGuests] = useState('');
  const [petsAllowed, setPetsAllowed] = useState(false);
  
  const [tempPhotos, setTempPhotos] = useState<string[]>([]);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = () => {
    setProperties(getProperties());
  };

  const handleAddTempPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true, 
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const uris = result.assets.map(asset => asset.uri);
        setTempPhotos(prev => [...prev, ...uris]);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open image picker.');
    }
  };

  const removeTempPhoto = (indexToRemove: number) => {
    setTempPhotos(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSaveProperty = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Property Name is required.');
      return;
    }
    try {
      const newPropertyId = addProperty(name, isAirbnb, address, description, parseInt(roomsCount) || 0, parseInt(maxGuests) || 1, petsAllowed);

      if (tempPhotos.length > 0) {
        for (let i = 0; i < tempPhotos.length; i++) {
          const uri = tempPhotos[i];
          const fileName = `property_${newPropertyId}_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
          const permanentUri = `${FileSystem.documentDirectory}${fileName}`;
          
          await FileSystem.copyAsync({ from: uri, to: permanentUri });
          addMedia(newPropertyId, permanentUri, 'photo', i === 0);
        }
      }
      
      setName(''); setAddress(''); setIsAirbnb(false); setDescription('');
      setRoomsCount(''); setMaxGuests(''); setPetsAllowed(false); setTempPhotos([]);
      setModalVisible(false); loadData();
    } catch (error) {
      Alert.alert('Database Error', 'Failed to save property.');
    }
  };

  const handleDelete = (id: number, propertyName: string) => {
    Alert.alert('Delete Property', `Delete "${propertyName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteProperty(id); loadData(); }}
    ]);
  };

  const renderPropertyCard = ({ item }: { item: Property }) => (
    <TouchableOpacity 
      // NEW: Dynamic theme applied to the card background and borders
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]} 
      onPress={() => router.push(`/properties/${item.id}` as any)}
      activeOpacity={0.8}
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
          <View style={styles.titleRow}>
            {item.isAirbnb ? (
              <FontAwesome5 name="airbnb" size={20} color={theme.danger} />
            ) : (
              <Ionicons name="home" size={20} color={theme.primary} />
            )}
            <Text style={[styles.cardTitle, { color: theme.text }]}>{item.name}</Text>
          </View>
          <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={20} color={theme.danger} />
          </TouchableOpacity>
        </View>
        {item.address ? (
          <Text style={[styles.cardAddress, { color: theme.subText }]} numberOfLines={1}>
            <Ionicons name="location-outline" size={14} color={theme.subText} /> {item.address}
          </Text>
        ) : null}
        
        <View style={[styles.specsRow, { backgroundColor: theme.background }]}>
          <Text style={[styles.specText, { color: theme.text }]}>🛏️ {item.roomsCount || 0} Rooms</Text>
          <Text style={[styles.specText, { color: theme.text }]}>👥 Max {item.maxGuests || 1}</Text>
          <Text style={[styles.specText, { color: theme.text }]}>{item.petsAllowed ? '🐾 Pets Ok' : '🚫 No Pets'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.hero }]} edges={['top', 'left', 'right']}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <FlatList
          data={properties}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderPropertyCard}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <HeroHeader title="Properties Hub" subtitle="Manage your physical real estate portfolio and localized rental instances." iconName="business-outline" statLabel="Total Managed Assets" statValue={properties.length} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={48} color={theme.subText} />
              <Text style={[styles.emptyStateText, { color: theme.subText }]}>No properties found.</Text>
            </View>
          }
        />
        <TouchableOpacity style={[styles.fab, { backgroundColor: theme.primary }]} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </TouchableOpacity>

        <Modal visible={isModalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Create a new property</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={28} color={theme.subText} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.mediaSection}>
                  <Text style={[styles.label, { color: theme.text }]}>Property Photos</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tempGalleryScroll}>
                    <TouchableOpacity style={[styles.addPhotoSquare, { backgroundColor: theme.background, borderColor: theme.border }]} onPress={handleAddTempPhoto}>
                      <Ionicons name="camera" size={24} color={theme.subText} />
                      <Text style={[styles.addPhotoText, { color: theme.subText }]}>Add</Text>
                    </TouchableOpacity>
                    {tempPhotos.map((uri, index) => (
                      <View key={index} style={styles.tempImageContainer}>
                        <Image source={{ uri }} style={styles.tempImage} />
                        <TouchableOpacity style={styles.removeTempPhotoBtn} onPress={() => removeTempPhoto(index)}>
                          <Ionicons name="close" size={12} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>

                <Text style={[styles.label, { color: theme.text }]}>Property Name *</Text>
                <TextInput style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]} placeholderTextColor={theme.subText} placeholder="e.g., Oceanfront Villa" value={name} onChangeText={setName} />

                <Text style={[styles.label, { color: theme.text }]}>Address</Text>
                <TextInput style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]} placeholderTextColor={theme.subText} placeholder="Full address" value={address} onChangeText={setAddress} />

                <Text style={[styles.label, { color: theme.text }]}>Description</Text>
                <TextInput 
                  style={[styles.input, styles.textArea, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]} 
                  placeholderTextColor={theme.subText}
                  placeholder="Key property details..." 
                  multiline numberOfLines={3} 
                  value={description} 
                  onChangeText={setDescription} 
                />

                <View style={styles.rowInputs}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={[styles.label, { color: theme.text }]}>Rooms Count</Text>
                    <TextInput style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]} placeholderTextColor={theme.subText} keyboardType="numeric" placeholder="0" value={roomsCount} onChangeText={setRoomsCount} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: theme.text }]}>Max Capacity</Text>
                    <TextInput style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]} placeholderTextColor={theme.subText} keyboardType="numeric" placeholder="1" value={maxGuests} onChangeText={setMaxGuests} />
                  </View>
                </View>

                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { color: theme.text }]}>Allow Pets?</Text>
                  <Switch value={petsAllowed} onValueChange={setPetsAllowed} trackColor={{ false: theme.border, true: theme.success }} />
                </View>

                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { color: theme.text }]}>List as Airbnb Instance?</Text>
                  <Switch value={isAirbnb} onValueChange={setIsAirbnb} trackColor={{ false: theme.border, true: theme.danger }} />
                </View>

                <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.primary }]} onPress={handleSaveProperty}>
                  <Text style={styles.saveButtonText}>Create Property</Text>
                </TouchableOpacity>
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
  listContent: { paddingBottom: 120 }, // FIXED: Ensures the last card isn't hidden behind the glass tab bar
  
  card: { borderRadius: 16, marginBottom: 16, marginHorizontal: 16, elevation: 3, overflow: 'hidden' },
  cardBanner: { width: '100%', height: 140, resizeMode: 'cover' },
  cardBannerPlaceholder: { width: '100%', height: 140, alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: 16 },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  deleteButton: { padding: 4 },
  cardAddress: { fontSize: 14, marginBottom: 12 },
  specsRow: { flexDirection: 'row', gap: 12, padding: 8, borderRadius: 8 },
  specText: { fontSize: 13, fontWeight: '600' },
  
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyStateText: { fontSize: 16, marginTop: 16 },
  fab: { position: 'absolute', bottom: 100, right: 24, width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', elevation: 5 }, // FIXED: Lifted above the glass tab bar
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  formScroll: { marginBottom: 20 },
  mediaSection: { marginBottom: 16 },
  tempGalleryScroll: { paddingVertical: 4 },
  addPhotoSquare: { width: 70, height: 70, borderWidth: 1, borderStyle: 'dashed', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  addPhotoText: { fontSize: 10, marginTop: 4, fontWeight: '600' },
  tempImageContainer: { marginRight: 10, position: 'relative' },
  tempImage: { width: 70, height: 70, borderRadius: 8, backgroundColor: '#E2E8F0', resizeMode: 'cover' },
  removeTempPhotoBtn: { position: 'absolute', top: -6, right: -6, backgroundColor: '#EF4444', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 14 },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  rowInputs: { flexDirection: 'row' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  switchLabel: { fontSize: 15, fontWeight: '500' },
  saveButton: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' }
});