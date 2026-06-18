import { Property, Stay } from '../types';
import { db } from './init';

/**
 * Retrieves all properties from the local database, joining the 
 * primary cover image (where isMain = 1) if one exists.
 */
export function getProperties(): Property[] {
  try {
    return db.getAllSync<Property>(
      `SELECT p.*, m.uri as mainImageUri 
       FROM properties p 
       LEFT JOIN property_media m ON p.id = m.propertyId AND m.isMain = 1 
       ORDER BY p.id DESC;`
    );
  } catch (error) {
    console.error('Error fetching properties from SQLite:', error);
    return [];
  }
}

/**
 * Retrieves a single property dossier matching the unique ID,
 * attaching its active main cover image.
 */
export function getPropertyById(id: number): Property | null {
  try {
    // FIXED: Corrected getSync to Expo's valid getFirstSync method
    return db.getFirstSync<Property>(
      `SELECT p.*, m.uri as mainImageUri 
       FROM properties p 
       LEFT JOIN property_media m ON p.id = m.propertyId AND m.isMain = 1 
       WHERE p.id = ?;`,
      [id]
    );
  } catch (error) {
    console.error(`Error fetching property ID ${id}:`, error);
    return null;
  }
}

/**
 * Persists a new property record inside the database tracking asset capacity.
 * Returns the auto-generated lastInsertRowId to link incoming photos.
 */
export function addProperty(
  name: string,
  isAirbnb: boolean,
  address: string,
  description: string,
  roomsCount: number,
  maxGuests: number,
  petsAllowed: boolean
): number {
  try {
    const result = db.runSync(
      `INSERT INTO properties (name, isAirbnb, address, description, roomsCount, maxGuests, petsAllowed, isActive) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 1);`,
      [
        name, 
        isAirbnb ? 1 : 0, 
        address, 
        description, 
        roomsCount, 
        maxGuests, 
        petsAllowed ? 1 : 0
      ]
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.error('Error inserting property asset:', error);
    throw error;
  }
}

/**
 * Performs a safe cascading purge of a property record along with 
 * its localized media listings and active bookings.
 */
export function deleteProperty(id: number): void {
  try {
    db.runSync('DELETE FROM stays WHERE propertyId = ?;', [id]);
    db.runSync('DELETE FROM property_media WHERE propertyId = ?;', [id]);
    db.runSync('DELETE FROM properties WHERE id = ?;', [id]);
  } catch (error) {
    console.error(`Failed to completely purge property ID ${id}:`, error);
    throw error;
  }
}

/**
 * Returns all historical or ongoing stays logged under a targeted property.
 */
export function getStaysForProperty(propertyId: number): Stay[] {
  try {
    return db.getAllSync<Stay>(
      'SELECT * FROM stays WHERE propertyId = ? ORDER BY arrivalDate DESC;',
      [propertyId]
    );
  } catch (error) {
    console.error(`Error pulling stays logs for property ID ${propertyId}:`, error);
    return [];
  }
}