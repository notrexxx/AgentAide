import * as Crypto from 'expo-crypto';
import { StayWithProperty } from '../types';
import { db } from './init';

export function getStays(): StayWithProperty[] {
  try {
    return db.getAllSync<StayWithProperty>(
      `SELECT s.*, p.name as propertyName, m.uri as mainImageUri 
       FROM stays s 
       JOIN properties p ON s.propertyId = p.id 
       LEFT JOIN property_media m ON p.id = m.propertyId AND m.isMain = 1 
       ORDER BY s.arrivalDate ASC;`
    );
  } catch (error) {
    console.error('Error fetching stays dashboard data:', error);
    return [];
  }
}

export function addStay(
  propertyId: string,
  guestCount: number,
  kidsCount: number,
  petsCount: number,
  specialRequests: string,
  arrivalDate: string,
  departureDate: string,
  flightInfo: string
): string {
  try {
    const id = Crypto.randomUUID(); 
    db.runSync(
      `INSERT INTO stays (id, propertyId, guestCount, kidsCount, petsCount, specialRequests, arrivalDate, departureDate, flightInfo) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
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
    return id;
  } catch (error) {
    console.error('Error creating stay row entry:', error);
    throw error;
  }
}

export function deleteStay(id: string): void {
  try {
    db.runSync('DELETE FROM stays WHERE id = ?;', [id]);
  } catch (error) {
    console.error(`Error deleting stay record ID ${id}:`, error);
    throw error;
  }
}