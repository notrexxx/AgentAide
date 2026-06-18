import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#94A3B8',
        headerShown: false, // FIXED: Purges the default white navigation header
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
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