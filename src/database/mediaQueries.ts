import * as Crypto from 'expo-crypto';
import { PropertyMedia } from '../types';
import { db } from './init';

export function getMediaForProperty(propertyId: string): PropertyMedia[] {
  try {
    return db.getAllSync<PropertyMedia>(
      'SELECT * FROM property_media WHERE propertyId = ? ORDER BY id DESC;', 
      [propertyId]
    );
  } catch (error) {
    console.error('Error fetching media:', error);
    return [];
  }
}

export function addMedia(propertyId: string, uri: string, mediaType: string, isMain: boolean = false): void {
  try {
    const id = Crypto.randomUUID();
    db.runSync(
      'INSERT INTO property_media (id, propertyId, uri, mediaType, isMain) VALUES (?, ?, ?, ?, ?);',
      [id, propertyId, uri, mediaType, isMain ? 1 : 0]
    );
  } catch (error) {
    console.error('Error adding media:', error);
    throw error;
  }
}

export function deleteMediaRecord(id: string): void {
  try {
    db.runSync('DELETE FROM property_media WHERE id = ?;', [id]);
  } catch (error) {
    console.error('Error deleting media record:', error);
    throw error;
  }
}

export function setMainImage(propertyId: string, mediaId: string): void {
  try {
    db.runSync('UPDATE property_media SET isMain = 0 WHERE propertyId = ?;', [propertyId]);
    db.runSync('UPDATE property_media SET isMain = 1 WHERE id = ?;', [mediaId]);
  } catch (error) {
    console.error('Error setting main image:', error);
    throw error;
  }
}