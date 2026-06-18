import { Property, Stay } from '../types';
import { db } from './init';

export function getProperties(): Property[] {
  try {
    return db.getAllSync<Property>('SELECT * FROM properties ORDER BY id DESC;');
  } catch (error) {
    console.error('Error fetching properties:', error);
    return [];
  }
}

export function getPropertyById(id: number): Property | null {
  try {
    return db.getFirstSync<Property>('SELECT * FROM properties WHERE id = ?;', [id]);
  } catch (error) {
    console.error('Error fetching single property:', error);
    return null;
  }
}

export function getStaysForProperty(propertyId: number): Stay[] {
  try {
    return db.getAllSync<Stay>('SELECT * FROM stays WHERE propertyId = ? ORDER BY date(arrivalDate) ASC;', [propertyId]);
  } catch (error) {
    console.error('Error fetching stays for property:', error);
    return [];
  }
}

/**
 * Inserts a property and returns the newly generated SQLite Row ID.
 */
export function addProperty(
  name: string, 
  isAirbnb: boolean, 
  address: string,
  description?: string,
  roomsCount?: number,
  maxGuests?: number,
  petsAllowed?: boolean
): number {
  try {
    const result = db.runSync(
      `INSERT INTO properties (
        name, isAirbnb, address, isActive, description, roomsCount, maxGuests, petsAllowed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        name, 
        isAirbnb ? 1 : 0, 
        address, 
        1, 
        description || null, 
        roomsCount ?? 0, 
        maxGuests ?? 1, 
        petsAllowed ? 1 : 0
      ]
    );
    // Return the Primary Key of the newly inserted property
    return result.lastInsertRowId;
  } catch (error) {
    console.error('Error adding property:', error);
    throw error;
  }
}

export function deleteProperty(id: number): void {
  try {
    db.runSync('DELETE FROM properties WHERE id = ?;', [id]);
  } catch (error) {
    console.error('Error deleting property:', error);
    throw error;
  }
}