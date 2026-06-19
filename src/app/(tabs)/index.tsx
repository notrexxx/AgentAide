import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert, FlatList, Image, Modal, ScrollView, StyleSheet, Switch, Text,
  TextInput, TouchableOpacity,
  useColorScheme,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import HeroHeader from '../../components/HeroHeader';
import { addMedia } from '../../database/mediaQueries';
import { addProperty, getProperties } from '../../database/propertyQueries';
import { getStays } from '../../database/staysQueries';
import { Colors } from '../../theme/colors';
import { Property, StayWithProperty } from '../../types';

export default function PropertiesHubScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[isDark ? 'dark' : 'light'];

  // Data & UI States
  const [properties, setProperties] = useState<Property[]>([]);
  const [allStays, setAllStays] = useState<StayWithProperty[]>([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Vacant' | 'Occupied' | 'Reserved'>('All');
  
  // Form States
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [isAirbnb, setIsAirbnb] = useState(false);
  const [description, setDescription] = useState('');
  const [roomsCount, setRoomsCount] = useState('');
  const [maxGuests, setMaxGuests] = useState('');
  const [petsAllowed, setPetsAllowed] = useState(false);
  const [tempPhotos, setTempPhotos] = useState<string[]>([]);

  const loadData = () => {
    setProperties(getProperties() || []);
    setAllStays((getStays() as StayWithProperty[]) || []);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const openCreateModal = () => {
    setName(''); setAddress(''); setIsAirbnb(false); setDescription('');
    setRoomsCount(''); setMaxGuests(''); setPetsAllowed(false); setTempPhotos([]);
    setModalVisible(true);
  };

  const handleAddTempPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.8,
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
      const newPropertyId = addProperty(
        name, 
        isAirbnb, 
        address, 
        description, 
        parseInt(roomsCount) || 0, 
        parseInt(maxGuests) || 1, 
        petsAllowed
      );

      if (tempPhotos.length > 0) {
        for (let i = 0; i < tempPhotos.length; i++) {
          const uri = tempPhotos[i];
          const fileName = `property_${newPropertyId}_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
          const permanentUri = `${FileSystem.documentDirectory}${fileName}`;
          await FileSystem.copyAsync({ from: uri, to: permanentUri });
          addMedia(newPropertyId, permanentUri, 'photo', i === 0);
        }
      }
      setModalVisible(false); 
      loadData();
    } catch (error) {
      Alert.alert('Database Error', 'Failed to save property.');
    }
  };

  const getPropertyStatus = useCallback((propertyId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 🚨 Explicitly asserting type here to bypass 'never' tracking
    const propertyStays = (allStays as StayWithProperty[]).filter(s => s.propertyId === propertyId);
    let isOccupied = false;
    let isReserved = false;
    let nextStay: StayWithProperty | null = null;

    propertyStays.forEach((stay: StayWithProperty) => {
      if (!stay || !stay.arrivalDate) return;
      
      const arrStr = stay.arrivalDate.split(' at ')[0];
      const depStr = stay.departureDate === 'TBD' || !stay.departureDate ? null : stay.departureDate.split(' at ')[0];
      
      const arrDate = new Date(arrStr);
      const depDate = depStr ? new Date(depStr) : null;

      if (!isNaN(arrDate.getTime())) {
        arrDate.setHours(0, 0, 0, 0);
        if (depDate && !isNaN(depDate.getTime())) depDate.setHours(0, 0, 0, 0);

        if (today.getTime() >= arrDate.getTime() && (!depDate || today.getTime() <= depDate.getTime())) {
          isOccupied = true;
        }

        if (arrDate.getTime() > today.getTime()) {
          isReserved = true;
          if (!nextStay || arrDate.getTime() < new Date((nextStay as StayWithProperty).arrivalDate.split(' at ')[0]).getTime()) {
            nextStay = stay;
          }
        }
      }
    });

    return { isOccupied, isReserved, isVacant: !isOccupied, nextStay };
  }, [allStays]);

  const filteredProperties = useMemo(() => {
    return properties.filter(property => {
      const matchesSearch = 
        property.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (property.address && property.address.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      const status = getPropertyStatus(property.id);
      if (activeFilter === 'Vacant') return status.isVacant;
      if (activeFilter === 'Occupied') return status.isOccupied;
      if (activeFilter === 'Reserved') return status.isReserved;
      
      return true;
    });
  }, [properties, searchQuery, activeFilter, getPropertyStatus]);

  const renderPropertyCard = ({ item }: { item: Property }) => {
    const status = getPropertyStatus(item.id);

    return (
      <TouchableOpacity 
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
              <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                {item.name}
              </Text>
            </View>
          </View>

          <View style={styles.pillsRow}>
            {status.isVacant && (
              <View style={[styles.pill, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <View style={[styles.pillDot, { backgroundColor: '#10B981' }]} />
                <Text style={[styles.pillText, { color: '#10B981' }]}>Vacant</Text>
              </View>
            )}
            {status.isOccupied && (
              <View style={[styles.pill, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <View style={[styles.pillDot, { backgroundColor: '#EF4444' }]} />
                <Text style={[styles.pillText, { color: '#EF4444' }]}>Occupied</Text>
              </View>
            )}
            {status.isReserved && (
              <View style={[styles.pill, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <View style={[styles.pillDot, { backgroundColor: '#3B82F6' }]} />
                <Text style={[styles.pillText, { color: '#3B82F6' }]}>Reserved</Text>
              </View>
            )}
          </View>
          
          <View style={[styles.specsRow, { backgroundColor: theme.background }]}>
            <Text style={[styles.specText, { color: theme.text }]}>🛏️ {item.roomsCount || 0} Rooms</Text>
            <Text style={[styles.specText, { color: theme.text }]}>👥 Max {item.maxGuests || 1}</Text>
            <Text style={[styles.specText, { color: theme.text }]}>{item.petsAllowed ? '🐾 Pets Ok' : '🚫 No Pets'}</Text>
          </View>

          {status.nextStay && (
            <View style={[styles.upcomingStayBox, { borderTopColor: theme.border }]}>
              <Ionicons name="calendar" size={14} color={theme.primary} />
              <Text style={[styles.upcomingStayText, { color: theme.subText }]} numberOfLines={1}>
                {/* 🚨 Forced conversion on render elements to avoid fallback compiler issues */}
                Next Guest: <Text style={{ fontWeight: '600', color: theme.text }}>{(status.nextStay as StayWithProperty).arrivalDate.split(' at ')[0]}</Text> ({(status.nextStay as StayWithProperty).guestCount} pax)
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.hero }]} edges={['top', 'left', 'right']}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <FlatList
          data={filteredProperties}
          keyExtractor={(item) => item.id}
          renderItem={renderPropertyCard}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <>
              <HeroHeader 
                title="Properties Hub" 
                subtitle="Manage your physical real estate portfolio and localized rental instances." 
                iconName="business-outline" 
                statLabel="Total Managed Assets" 
                statValue={properties.length} 
              />
              
              <View style={[styles.searchBarContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Ionicons name="search" size={20} color={theme.subText} style={styles.searchIcon} />
                <TextInput
                  style={[styles.searchTextInput, { color: theme.text }]}
                  placeholder="Search by name or address..."
                  placeholderTextColor={theme.subText}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color={theme.subText} />
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterTabsScroll} contentContainerStyle={styles.filterTabsContent}>
                {(['All', 'Vacant', 'Occupied', 'Reserved'] as const).map((filter) => {
                  const isSelected = activeFilter === filter;
                  return (
                    <TouchableOpacity
                      key={filter}
                      onPress={() => setActiveFilter(filter)}
                      style={[
                        styles.filterTab, 
                        { backgroundColor: isSelected ? theme.primary : theme.surface, borderColor: theme.border }
                      ]}
                    >
                      <Text style={[styles.filterTabText, { color: isSelected ? '#FFFFFF' : theme.text }]}>
                        {filter}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={48} color={theme.subText} />
              <Text style={[styles.emptyStateText, { color: theme.subText }]}>
                {searchQuery || activeFilter !== 'All' ? 'No matching properties found.' : 'No properties found.'}
              </Text>
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
                <Text style={[styles.modalTitle, { color: theme.text }]}>Create Property</Text>
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
                <TextInput style={[styles.input, styles.textArea, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]} placeholderTextColor={theme.subText} placeholder="Key property details..." multiline numberOfLines={3} value={description} onChangeText={setDescription} />

                <View style={styles.rowInputs}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={[styles.label, { color: theme.text }]}>Rooms</Text>
                    <TextInput style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]} placeholderTextColor={theme.subText} keyboardType="numeric" placeholder="0" value={roomsCount} onChangeText={setRoomsCount} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: theme.text }]}>Max Guests</Text>
                    <TextInput style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]} placeholderTextColor={theme.subText} keyboardType="numeric" placeholder="1" value={maxGuests} onChangeText={setMaxGuests} />
                  </View>
                </View>

                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { color: theme.text }]}>Allow Pets?</Text>
                  <Switch value={petsAllowed} onValueChange={setPetsAllowed} trackColor={{ false: theme.border, true: theme.success }} />
                </View>

                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { color: theme.text }]}>List as Airbnb?</Text>
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
  listContent: { paddingBottom: 120 }, 
  card: { borderRadius: 16, marginBottom: 16, marginHorizontal: 16, elevation: 3, overflow: 'hidden' },
  cardBanner: { width: '100%', height: 140, resizeMode: 'cover' },
  cardBannerPlaceholder: { width: '100%', height: 140, alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: '700', flex: 1 },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  pill: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  pillDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  pillText: { fontSize: 12, fontWeight: '700' },
  specsRow: { flexDirection: 'row', gap: 12, padding: 8, borderRadius: 8 },
  specText: { fontSize: 13, fontWeight: '600' },
  upcomingStayBox: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, gap: 6 },
  upcomingStayText: { fontSize: 13, flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 60, paddingHorizontal: 32 },
  emptyStateText: { fontSize: 16, marginTop: 16, textAlign: 'center' },
  fab: { position: 'absolute', bottom: 100, right: 24, width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', elevation: 5 }, 
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
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 16, paddingHorizontal: 12, height: 46, borderRadius: 12, borderWidth: 1 },
  searchIcon: { marginRight: 8 },
  searchTextInput: { flex: 1, fontSize: 15, height: '100%' },
  filterTabsScroll: { marginTop: 12, marginBottom: 4 },
  filterTabsContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterTabText: { fontSize: 14, fontWeight: '600' }
});