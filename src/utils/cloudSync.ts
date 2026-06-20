import { createClient } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { Property } from '../types';

const SUPABASE_URL = 'https://fixlrsncflpxwuqlhxwc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpeGxyc25jZmxweHd1cWxoeHdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NDcyNTAsImV4cCI6MjA5NzMyMzI1MH0.bcl9EEQfnjkqtZJ1sy-xR6XqYeYdbQynG-xLecVeY4g';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

type ImageType = 'cover' | 'thumbnail' | 'gallery';

// UPGRADED: Dynamic compression based on the exact target destination
export async function compressImage(localUri: string, type: ImageType): Promise<string> {
  try {
    let targetWidth: number;
    let targetCompression: number;

    switch (type) {
      case 'thumbnail':
        // WhatsApp strictly prefers 1200x630 and under 300KB
        targetWidth = 1200;
        targetCompression = 0.5;
        break;
      case 'cover':
        // High-end Next.js Hero Banner (Crisp 1080p equivalent)
        targetWidth = 1920;
        targetCompression = 0.8;
        break;
      case 'gallery':
      default:
        // Standard high-quality gallery images
        targetWidth = 1600;
        targetCompression = 0.8;
        break;
    }

    // We no longer manipulate the thumbnail here because the UI file already 
    // cropped it to 1200px. This just guarantees the compression ratio.
    const compressedImage = await ImageManipulator.manipulateAsync(
      localUri,
      [{ resize: { width: targetWidth } }], 
      { compress: targetCompression, format: ImageManipulator.SaveFormat.JPEG } 
    );
    
    return compressedImage.uri;
  } catch (error) {
    console.error('Compression failed:', error);
    return localUri; 
  }
}

// UPGRADED: Accepts the string type flag to separate file names clearly in your bucket
export async function uploadToCloud(localUri: string, propertyId: string, type: ImageType = 'gallery'): Promise<string | null> {
  try {
    const optimizedUri = await compressImage(localUri, type);
    const base64File = await FileSystem.readAsStringAsync(optimizedUri, {
      encoding: 'base64',
    });

    // Tag the filename securely
    const fileSuffix = type === 'thumbnail' ? 'whatsapp_og' : type === 'cover' ? 'web_hero' : 'gallery';
    const fileName = `property_${propertyId}/${Date.now()}_${fileSuffix}.jpg`;
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

// UPGRADED: Now accepts the separate thumbnail URL for the database
export async function uploadDossierText(
  property: Property, 
  coverImageUrl: string | null,
  thumbnailUrl: string | null,
  galleryUrls: string[] = []
) {
  try {
    const { error } = await supabase
      .from('public_dossiers')
      .upsert({
        id: property.id,
        name: property.name,
        address: property.address,
        description: property.description,
        rooms_count: property.roomsCount,
        max_guests: property.maxGuests,
        pets_allowed: property.petsAllowed,
        cover_image_url: coverImageUrl,
        og_thumbnail_url: thumbnailUrl, // Matches the new column we made in Supabase!
        gallery_urls: galleryUrls
      });

    if (error) throw error;
  } catch (error) {
    console.error('Database Sync Error:', error);
    throw error;
  }
}

// React Native polyfill for base64 to binary conversion
function decodeBase64(base64: string): Uint8Array {
  // Use a regex-based decoding since React Native's JS engine can struggle with native atob for large files
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let bufferLength = base64.length * 0.75;
  let len = base64.length;
  let i = 0;
  let p = 0;
  let encoded1, encoded2, encoded3, encoded4;

  if (base64[base64.length - 1] === '=') {
    bufferLength--;
    if (base64[base64.length - 2] === '=') {
      bufferLength--;
    }
  }

  const bytes = new Uint8Array(bufferLength);

  for (i = 0; i < len; i += 4) {
    encoded1 = chars.indexOf(base64[i]);
    encoded2 = chars.indexOf(base64[i + 1]);
    encoded3 = chars.indexOf(base64[i + 2]);
    encoded4 = chars.indexOf(base64[i + 3]);

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    if (encoded3 !== 64) {
      bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    }
    if (encoded4 !== 64) {
      bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }
  }
  return bytes;
}