import * as Crypto from 'expo-crypto';
import { Property, Stay } from '../types';
import { db } from './init';

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

export function getPropertyById(id: string): Property | null {
  try {
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

export function addProperty(
  name: string,
  isAirbnb: boolean,
  address: string,
  description: string,
  roomsCount: number,
  maxGuests: number,
  petsAllowed: boolean
): string {
  try {
    const id = Crypto.randomUUID(); // GENERATE UNIQUE ID
    db.runSync(
      `INSERT INTO properties (id, name, isAirbnb, address, description, roomsCount, maxGuests, petsAllowed, isActive) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1);`,
      [
        id,
        name, 
        isAirbnb ? 1 : 0, 
        address, 
        description, 
        roomsCount, 
        maxGuests, 
        petsAllowed ? 1 : 0
      ]
    );
    return id; // Return the new UUID string
  } catch (error) {
    console.error('Error inserting property asset:', error);
    throw error;
  }
}

export function deleteProperty(id: string): void {
  try {
    db.runSync('DELETE FROM stays WHERE propertyId = ?;', [id]);
    db.runSync('DELETE FROM property_media WHERE propertyId = ?;', [id]);
    db.runSync('DELETE FROM properties WHERE id = ?;', [id]);
  } catch (error) {
    console.error(`Failed to completely purge property ID ${id}:`, error);
    throw error;
  }
}

export function getStaysForProperty(propertyId: string): Stay[] {
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