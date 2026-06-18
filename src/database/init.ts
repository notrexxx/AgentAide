import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('agentaide.db');

// Helper function to safely apply schema upgrades without crashing if they already exist
const applyMigration = (query: string) => {
  try {
    db.execSync(query);
  } catch (error) {
    // If the column already exists, SQLite throws an error. We catch and ignore it.
    // This is a simple, effective migration strategy for local MVP databases.
  }
};

export function initializeDatabase() {
  try {
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

      -- NEW: Media table to relationally store infinite photos/videos per property
      CREATE TABLE IF NOT EXISTS property_media (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        propertyId INTEGER NOT NULL,
        uri TEXT NOT NULL,
        mediaType TEXT NOT NULL,
        FOREIGN KEY (propertyId) REFERENCES properties (id) ON DELETE CASCADE
      );
    `);

    // --- v0.6.0 SCHEMA MIGRATIONS ---
    // We attempt to add the new columns. If the app is run on a fresh device, 
    // the above CREATE TABLE makes them, and these will safely fail.
    applyMigration(`ALTER TABLE properties ADD COLUMN description TEXT;`);
    applyMigration(`ALTER TABLE properties ADD COLUMN roomsCount INTEGER DEFAULT 0;`);
    applyMigration(`ALTER TABLE properties ADD COLUMN maxGuests INTEGER DEFAULT 1;`);
    applyMigration(`ALTER TABLE properties ADD COLUMN petsAllowed INTEGER DEFAULT 0;`);

    console.log('Database and schema initialized/migrated successfully.');
  } catch (error) {
    console.error('CRITICAL: Failed to initialize database:', error);
  }
}