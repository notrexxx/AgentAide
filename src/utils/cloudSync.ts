import { createClient } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

const SUPABASE_URL = 'https://fixlrsncflpxwuqlhxwc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpeGxyc25jZmxweHd1cWxoeHdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NDcyNTAsImV4cCI6MjA5NzMyMzI1MH0.bcl9EEQfnjkqtZJ1sy-xR6XqYeYdbQynG-xLecVeY4g';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Compresses a local image aggressively to save bandwidth and storage,
 * returning the URI of the newly compressed temporary file.
 */
export async function compressImage(localUri: string): Promise<string> {
  try {
    const compressedImage = await ImageManipulator.manipulateAsync(
      localUri,
      [{ resize: { width: 1080 } }], 
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG } 
    );
    return compressedImage.uri;
  } catch (error) {
    console.error('Compression failed:', error);
    return localUri; 
  }
}

/**
 * Uploads a local file to the public 'property-media' Supabase bucket.
 * Returns the public URL that WhatsApp can access.
 */
export async function uploadToCloud(localUri: string, propertyId: number): Promise<string | null> {
  try {
    const optimizedUri = await compressImage(localUri);

    // FIXED: Use the literal string 'base64' to bypass the missing SDK 54 enum
    const base64File = await FileSystem.readAsStringAsync(optimizedUri, {
      encoding: 'base64',
    });

    const fileName = `property_${propertyId}/${Date.now()}_optimized.jpg`;
    const binaryData = decodeBase64(base64File);

    const { data, error } = await supabase.storage
      .from('property-media')
      .upload(fileName, binaryData, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from('property-media')
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Cloud Upload Error:', error);
    return null;
  }
}

function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}