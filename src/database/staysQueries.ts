import { Stay } from '../types';
import { db } from './init';

// We extend the base Stay type to include the joined property name for the UI
export interface StayWithProperty extends Stay {
  propertyName: string;
}

/**
 * Retrieves all active stays, joining the property name from the properties table.
 * Orders them by arrival date so the most immediate check-ins appear first.
 */
export function getStays(): StayWithProperty[] {
  try {
    return db.getAllSync<StayWithProperty>(`
      SELECT 
        stays.*, 
        properties.name AS propertyName 
      FROM stays 
      LEFT JOIN properties ON stays.propertyId = properties.id 
      ORDER BY date(stays.arrivalDate) ASC;
    `);
  } catch (error) {
    console.error('Error fetching stays:', error);
    return [];
  }
}

/**
 * Inserts a new stay/rental record into the database.
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
): void {
  try {
    db.runSync(
      `INSERT INTO stays (
        propertyId, guestCount, kidsCount, petsCount, 
        specialRequests, arrivalDate, departureDate, flightInfo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
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
  } catch (error) {
    console.error('Error adding stay:', error);
    throw error;
  }
}

/**
 * Deletes a stay by its ID (e.g., if a booking is cancelled).
 */
export function deleteStay(id: number): void {
  try {
    db.runSync('DELETE FROM stays WHERE id = ?;', [id]);
  } catch (error) {
    console.error('Error deleting stay:', error);
    throw error;
  }
}