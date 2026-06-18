import { Stay } from '../types';
import { db } from './init';

// FIXED: Restored the relational interface that was accidentally dropped
export interface StayWithProperty extends Stay {
  propertyName: string;
  mainImageUri?: string;
}

/**
 * Compiles a list of active guest stays, pulling the parent property name 
 * along with its current primary star/cover photo for display on the dashboard card.
 */
export function getStays(): StayWithProperty[] {
  try {
    return db.getAllSync<StayWithProperty>(
      `SELECT s.*, p.name as propertyName, m.uri as mainImageUri 
       FROM stays s 
       JOIN properties p ON s.propertyId = p.id 
       LEFT JOIN property_media m ON p.id = m.propertyId AND m.isMain = 1 
       ORDER BY s.id DESC;`
    );
  } catch (error) {
    console.error('Error fetching stays dashboard data:', error);
    return [];
  }
}

/**
 * Records a parsed incoming itinerary stay instance.
 */
export function addStay(
  propertyId: number,
  guestCount: number,
  kidsCount: number,
  petsCount: number,
  specialRequests: string,
  arrivalDate: string,
  departureDate: string,
  flightInfo: string
): number {
  try {
    const result = db.runSync(
      `INSERT INTO stays (propertyId, guestCount, kidsCount, petsCount, specialRequests, arrivalDate, departureDate, flightInfo) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        propertyId, 
        guestCount, 
        kidsCount, 
        petsCount, 
        specialRequests, 
        arrivalDate, 
        departureDate, 
        flightInfo
      ]
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.error('Error creating stay row entry:', error);
    throw error;
  }
}

/**
 * Deletes a guest itinerary entry by its specific database identifier.
 */
export function deleteStay(id: number): void {
  try {
    db.runSync('DELETE FROM stays WHERE id = ?;', [id]);
  } catch (error) {
    console.error(`Error deleting stay record ID ${id}:`, error);
    throw error;
  }
}