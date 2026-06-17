import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { initializeDatabase } from '../database/init';

export default function RootLayout() {
  
  useEffect(() => {
    // We execute our schema initialization as soon as the root layout mounts.
    initializeDatabase();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#0F172A', // Enterprise dark blue
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: '700',
          },
        }}
      >
        <Stack.Screen 
          name="index" 
          options={{ title: 'Agent Aide' }} 
        />
      </Stack>
    </>
  );
}