import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('agentaide_v2.db');

const applyMigration = (query: string) => {
  try {
    db.execSync(query);
  } catch (error) {
    // Silent catch for migrations
  }
};

export function initializeDatabase() {
  try {
    db.execSync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS properties (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        isAirbnb INTEGER NOT NULL DEFAULT 0,
        address TEXT,
        isActive INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS stays (
        id TEXT PRIMARY KEY,
        propertyId TEXT NOT NULL,
        guestCount INTEGER DEFAULT 1,
        kidsCount INTEGER DEFAULT 0,
        petsCount INTEGER DEFAULT 0,
        specialRequests TEXT,
        arrivalDate TEXT NOT NULL,
        departureDate TEXT NOT NULL,
        flightInfo TEXT,
        FOREIGN KEY (propertyId) REFERENCES properties (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS property_media (
        id TEXT PRIMARY KEY,
        propertyId TEXT NOT NULL,
        uri TEXT NOT NULL,
        mediaType TEXT NOT NULL,
        FOREIGN KEY (propertyId) REFERENCES properties (id) ON DELETE CASCADE
      );
    `);

    applyMigration(`ALTER TABLE properties ADD COLUMN description TEXT;`);
    applyMigration(`ALTER TABLE properties ADD COLUMN roomsCount INTEGER DEFAULT 0;`);
    applyMigration(`ALTER TABLE properties ADD COLUMN maxGuests INTEGER DEFAULT 1;`);
    applyMigration(`ALTER TABLE properties ADD COLUMN petsAllowed INTEGER DEFAULT 0;`);
    applyMigration(`ALTER TABLE property_media ADD COLUMN isMain INTEGER DEFAULT 0;`);

    console.log('Database v2 (UUID) initialized successfully.');
  } catch (error) {
    console.error('CRITICAL: Failed to initialize v2 database:', error);
  }
}