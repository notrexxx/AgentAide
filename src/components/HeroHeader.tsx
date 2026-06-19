import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

interface HeroHeaderProps {
  title: string;
  subtitle: string;
  // Dynamically extracting the exact valid names from the Ionicons component
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  statLabel: string;
  statValue: number | string;
}

const { width } = Dimensions.get('window');

export default function HeroHeader({ title, subtitle, iconName, statLabel, statValue }: HeroHeaderProps) {
  return (
    <View style={styles.heroContainer}>
      {/* Structural Geometric Background Accents */}
      <View style={styles.circleAccentLeft} />
      <View style={styles.circleAccentRight} />

      <View style={styles.contentRow}>
        <View style={styles.textColumn}>
          <Text style={styles.heroTitle}>{title}</Text>
          {/* 🚨 SPACE SAVER: Only renders if a subtitle actually exists */}
          {!!subtitle && <Text style={styles.heroSubtitle}>{subtitle}</Text>}
        </View>
        <View style={styles.iconContainer}>
          <Ionicons name={iconName} size={32} color="rgba(255, 255, 255, 0.15)" />
        </View>
      </View>

      {/* High-Fidelity Mini Metrics Card Embedded inside Hero */}
      <View style={styles.metricsPill}>
        <Text style={styles.metricsLabel}>{statLabel}: </Text>
        <Text style={styles.metricsValue}>{statValue}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroContainer: {
    backgroundColor: '#0F172A',
    // 🚨 REDUCED: Padding cut down to compress vertical height
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    // 🚨 REDUCED: Margin pulled up so the filter tabs sit closer
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  circleAccentLeft: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(59, 130, 246, 0.06)',
    top: -40,
    left: -30,
  },
  circleAccentRight: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 90, 95, 0.04)',
    bottom: -60,
    right: -40,
  },
  contentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // 🚨 REDUCED: Spacing between title and metrics pill
    marginBottom: 12,
  },
  textColumn: {
    flex: 1,
    marginRight: 16,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
    fontWeight: '500',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  metricsLabel: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  metricsValue: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '800',
  },
});