import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
// FIXED: Double dots to go up two directories from (tabs) -> app -> src
import { addProperty, deleteProperty, getProperties } from '../../database/propertyQueries';
import { Property } from '../../types';

export default function PropertiesHubScreen() {
  // --- STATE ---
  const [properties, setProperties] = useState<Property[]>([]);
  const [isModalVisible, setModalVisible] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [isAirbnb, setIsAirbnb] = useState(false);

  // --- DATA FETCHING ---
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = () => {
    const data = getProperties();
    setProperties(data);
  };

  // --- HANDLERS ---
  const handleSaveProperty = () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Property Name is required.');
      return;
    }
    
    try {
      addProperty(name, isAirbnb, address);
      setName('');
      setAddress('');
      setIsAirbnb(false);
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
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => {
            deleteProperty(id);
            loadData();
          }
        }
      ]
    );
  };

  // --- UI COMPONENTS ---
  const renderPropertyCard = ({ item }: { item: Property }) => (
    <View style={styles.card}>
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
        <Text style={styles.cardAddress}>
          <Ionicons name="location-outline" size={14} color="#64748B" /> {item.address}
        </Text>
      ) : null}
      <View style={styles.badgeContainer}>
        <View style={[styles.badge, item.isActive ? styles.badgeActive : styles.badgeInactive]}>
          <Text style={styles.badgeText}>{item.isActive ? 'Active' : 'Inactive'}</Text>
        </View>
      </View>
    </View>
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
              <Text style={styles.emptyStateSubtext}>Tap the button below to add your first property.</Text>
            </View>
          }
        />

        <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
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
                <Text style={styles.modalTitle}>New Property</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={28} color="#64748B" />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Property Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Downtown Loft"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.label}>Address</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 123 Main St, Apt 4B"
                placeholderTextColor="#94A3B8"
                value={address}
                onChangeText={setAddress}
              />

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Is this an Airbnb?</Text>
                <Switch
                  value={isAirbnb}
                  onValueChange={setIsAirbnb}
                  trackColor={{ false: '#CBD5E1', true: '#FF5A5F' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSaveProperty}>
                <Text style={styles.saveButtonText}>Save Property</Text>
              </TouchableOpacity>
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
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyStateText: { fontSize: 18, fontWeight: '600', color: '#475569', marginTop: 16 },
  emptyStateSubtext: { fontSize: 14, color: '#94A3B8', marginTop: 8, textAlign: 'center' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  deleteButton: { padding: 4 },
  cardAddress: { fontSize: 14, color: '#64748B', marginBottom: 12 },
  badgeContainer: { flexDirection: 'row' },
  badge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  badgeActive: { backgroundColor: '#DCFCE7' },
  badgeInactive: { backgroundColor: '#F1F5F9' },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#166534' },
  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 60, height: 60,
    borderRadius: 30, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 5,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: '50%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#0F172A' },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
  input: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8,
    padding: 12, fontSize: 16, color: '#0F172A', marginBottom: 20,
  },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  switchLabel: { fontSize: 16, fontWeight: '500', color: '#0F172A' },
  saveButton: { backgroundColor: '#0F172A', padding: 16, borderRadius: 12, alignItems: 'center' },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});