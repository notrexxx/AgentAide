import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getPropertyById, getStaysForProperty } from '../../database/propertyQueries';
import { Property, Stay } from '../../types';

export default function PropertyDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [property, setProperty] = useState<Property | null>(null);
  const [stays, setStays] = useState<Stay[]>([]);

  useEffect(() => {
    if (id) {
      const propData = getPropertyById(Number(id));
      const stayData = getStaysForProperty(Number(id));
      setProperty(propData);
      setStays(stayData);
    }
  }, [id]);

  if (!property) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Property record not found.</Text>
        </View>
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
        
        <View style={styles.mediaContainer}>
          <Ionicons name="images-outline" size={40} color="#94A3B8" />
          <Text style={styles.mediaPlaceholderText}>Media Gallery Placeholder (Sprint 2 Engine)</Text>
        </View>

        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, isCurrentlyBooked ? styles.badgeBooked : styles.badgeVacant]}>
            <Text style={[styles.statusText, isCurrentlyBooked ? styles.textBooked : styles.textVacant]}>
              {isCurrentlyBooked ? '• Currently Booked' : '• Vacant / Available'}
            </Text>
          </View>
          {/* FIXED: Replaced strict === 1 with boolean truthiness check to satisfy TS and SQLite */}
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
  mediaContainer: { height: 180, backgroundColor: '#F1F5F9', borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: '#CBD5E1', marginBottom: 16 },
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
  // FIXED: Changed 'style' to 'fontStyle' for React Native compatibility
  emptyStaysText: { fontSize: 13, color: '#94A3B8', fontStyle: 'italic' }
});