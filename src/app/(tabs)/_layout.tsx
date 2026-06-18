import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { Colors } from '../../theme/colors';

export default function TabLayout() {
  // Detects if the physical device is in Dark or Light mode
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[isDark ? 'dark' : 'light'];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.subText,
        // SPRINT v0.8.0: Glassmorphism Implementation
        tabBarStyle: {
          position: 'absolute', // Allows content to scroll underneath
          borderTopWidth: 0,
          elevation: 0,
          height: 85,
          paddingBottom: 25,
          backgroundColor: 'transparent', // The background is handled by the BlurView below
        },
        tabBarBackground: () => (
          <BlurView 
            tint={isDark ? 'dark' : 'light'} 
            intensity={85} 
            style={StyleSheet.absoluteFill} 
          />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Properties',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="stays"
        options={{
          title: 'Active Stays',
          tabBarIcon: ({ color }) => <Ionicons name="calendar" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}