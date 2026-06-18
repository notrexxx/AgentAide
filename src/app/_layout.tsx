import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { initializeDatabase } from '../database/init';

export default function RootLayout() {
  
  useEffect(() => {
    initializeDatabase();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      {/* headerShown: false lets the child Tab Navigator handle the UI headers */}
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}