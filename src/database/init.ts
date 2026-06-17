import * as SQLite from 'expo-sqlite';

// We use the modern synchronous API for immediate local access
export const db = SQLite.openDatabaseSync('agentaide.db');

export function initializeDatabase() {
  try {
    // WAL mode significantly improves concurrent read/write performance locally
    // Foreign keys must be explicitly turned on in SQLite
    db.execSync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS properties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        isAirbnb INTEGER NOT NULL DEFAULT 0,
        address TEXT,
        isActive INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS stays (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        propertyId INTEGER NOT NULL,
        guestCount INTEGER DEFAULT 1,
        kidsCount INTEGER DEFAULT 0,
        petsCount INTEGER DEFAULT 0,
        specialRequests TEXT,
        arrivalDate TEXT NOT NULL,
        departureDate TEXT NOT NULL,
        flightInfo TEXT,
        FOREIGN KEY (propertyId) REFERENCES properties (id) ON DELETE CASCADE
      );
    `);
    console.log('Database and schema initialized successfully.');
  } catch (error) {
    console.error('CRITICAL: Failed to initialize database:', error);
  }
}