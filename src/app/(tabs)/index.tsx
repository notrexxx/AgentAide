import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { addProperty, deleteProperty, getProperties } from '../../database/propertyQueries';
import { Property } from '../../types';

export default function PropertiesHubScreen() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isModalVisible, setModalVisible] = useState(false);
  
  // Enriched Form State
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [isAirbnb, setIsAirbnb] = useState(false);
  const [description, setDescription] = useState('');
  const [roomsCount, setRoomsCount] = useState('');
  const [maxGuests, setMaxGuests] = useState('');
  const [petsAllowed, setPetsAllowed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = () => {
    setProperties(getProperties());
  };

  const handleSaveProperty = () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Property Name is required.');
      return;
    }
    
    try {
      addProperty(
        name, 
        isAirbnb, 
        address, 
        description, 
        parseInt(roomsCount) || 0, 
        parseInt(maxGuests) || 1, 
        petsAllowed
      );
      
      // Reset State
      setName('');
      setAddress('');
      setIsAirbnb(false);
      setDescription('');
      setRoomsCount('');
      setMaxGuests('');
      setPetsAllowed(false);
      setModalVisible(false);
      loadData();
    } catch (error) {
      Alert.alert('Database Error', 'Failed to save property.');
    }
  };

  const handleDelete = (id: number, propertyName: string) => {
    Alert.alert(
      'Delete Property',
      `Are you sure you want to delete "${propertyName}"? All associated stays will be lost forever.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { deleteProperty(id); loadData(); }}
      ]
    );
  };

  const renderPropertyCard = ({ item }: { item: Property }) => (
    <TouchableOpacity 
      style={styles.card} 
      // FIXED: Explicitly casting the route bypasses the stale TypeScript generated dictionary
      onPress={() => router.push(`/properties/${item.id}` as any)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          {item.isAirbnb ? (
            <FontAwesome5 name="airbnb" size={20} color="#FF5A5F" />
          ) : (
            <Ionicons name="home" size={20} color="#3B82F6" />
          )}
          <Text style={styles.cardTitle}>{item.name}</Text>
        </View>
        <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
      {item.address ? (
        <Text style={styles.cardAddress} numberOfLines={1}>
          <Ionicons name="location-outline" size={14} color="#64748B" /> {item.address}
        </Text>
      ) : null}
      
      <View style={styles.specsRow}>
        <Text style={styles.specText}>🛏️ {item.roomsCount || 0} Rooms</Text>
        <Text style={styles.specText}>👥 Max {item.maxGuests || 1}</Text>
        <Text style={styles.specText}>{item.petsAllowed ? '🐾 Pets Ok' : '🚫 No Pets'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        <FlatList
          data={properties}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderPropertyCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyStateText}>No properties found.</Text>
            </View>
          }
        />

        <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </TouchableOpacity>

        <Modal visible={isModalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Property Asset</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={28} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.label}>Property Name *</Text>
                <TextInput style={styles.input} placeholder="e.g., Oceanfront Villa" value={name} onChangeText={setName} />

                <Text style={styles.label}>Address</Text>
                <TextInput style={styles.input} placeholder="Full address" value={address} onChangeText={setAddress} />

                <Text style={styles.label}>Description</Text>
                <TextInput 
                  style={[styles.input, styles.textArea]} 
                  placeholder="Key property details..." 
                  multiline numberOfLines={3} 
                  value={description} 
                  onChangeText={setDescription} 
                />

                <View style={styles.rowInputs}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={styles.label}>Rooms Count</Text>
                    <TextInput style={styles.input} keyboardType="numeric" placeholder="0" value={roomsCount} onChangeText={setRoomsCount} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Max Capacity</Text>
                    <TextInput style={styles.input} keyboardType="numeric" placeholder="1" value={maxGuests} onChangeText={setMaxGuests} />
                  </View>
                </View>

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Allow Pets?</Text>
                  <Switch value={petsAllowed} onValueChange={setPetsAllowed} trackColor={{ false: '#CBD5E1', true: '#10B981' }} />
                </View>

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>List as Airbnb Instance?</Text>
                  <Switch value={isAirbnb} onValueChange={setIsAirbnb} trackColor={{ false: '#CBD5E1', true: '#FF5A5F' }} />
                </View>

                <TouchableOpacity style={styles.saveButton} onPress={handleSaveProperty}>
                  <Text style={styles.saveButtonText}>Create Asset Record</Text>
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
  safeArea: { flex: 1, backgroundColor: '#F1F5F9' },
  container: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  deleteButton: { padding: 4 },
  cardAddress: { fontSize: 14, color: '#64748B', marginBottom: 12 },
  specsRow: { flexDirection: 'row', gap: 12, backgroundColor: '#F8FAFC', padding: 8, borderRadius: 8 },
  specText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyStateText: { fontSize: 16, color: '#64748B' },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  formScroll: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12, fontSize: 16, color: '#0F172A', marginBottom: 14 },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  rowInputs: { flexDirection: 'row' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  switchLabel: { fontSize: 15, fontWeight: '500', color: '#334155' },
  saveButton: { backgroundColor: '#0F172A', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' }
});