import { Property } from '../types';
import { db } from './init';

/**
 * Retrieves all properties currently stored in the database.
 * Returns a strictly typed array of Property objects.
 */
export function getProperties(): Property[] {
  try {
    // getAllSync is perfect here as we expect a relatively small array of properties (tens to hundreds, not millions)
    return db.getAllSync<Property>('SELECT * FROM properties ORDER BY id DESC;');
  } catch (error) {
    console.error('Error fetching properties:', error);
    return [];
  }
}

/**
 * Inserts a new property into the database.
 * @param name The name or title of the property.
 * @param isAirbnb Boolean flag (converted to 1 or 0 for SQLite).
 * @param address The physical address of the property.
 */
export function addProperty(name: string, isAirbnb: boolean, address: string): void {
  try {
    db.runSync(
      'INSERT INTO properties (name, isAirbnb, address, isActive) VALUES (?, ?, ?, ?);',
      [name, isAirbnb ? 1 : 0, address, 1]
    );
  } catch (error) {
    console.error('Error adding property:', error);
    throw error; // We throw here so the UI can catch it and display a proper error toast to the user
  }
}

/**
 * Deletes a property by ID.
 * NOTE: Because we set ON DELETE CASCADE in our schema, deleting a property here
 * will automatically delete all stays/rentals associated with it.
 */
export function deleteProperty(id: number): void {
  try {
    db.runSync('DELETE FROM properties WHERE id = ?;', [id]);
  } catch (error) {
    console.error('Error deleting property:', error);
    throw error;
  }
}