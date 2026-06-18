import { PropertyMedia } from '../types';
import { db } from './init';

export function getMediaForProperty(propertyId: number): PropertyMedia[] {
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

export function addMedia(propertyId: number, uri: string, mediaType: string): void {
  try {
    db.runSync(
      'INSERT INTO property_media (propertyId, uri, mediaType) VALUES (?, ?, ?);',
      [propertyId, uri, mediaType]
    );
  } catch (error) {
    console.error('Error adding media:', error);
    throw error;
  }
}

export function deleteMediaRecord(id: number): void {
  try {
    db.runSync('DELETE FROM property_media WHERE id = ?;', [id]);
  } catch (error) {
    console.error('Error deleting media record:', error);
    throw error;
  }
}