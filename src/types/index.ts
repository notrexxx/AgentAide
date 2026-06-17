export interface Property {
  id: number;
  name: string;
  isAirbnb: boolean; // 1 for true, 0 for false in SQLite
  address: string;
  isActive: boolean;
}

export interface Stay {
  id: number;
  propertyId: number;
  guestCount: number;
  kidsCount: number;
  petsCount: number;
  specialRequests: string;
  arrivalDate: string;   // ISO 8601 string for reliable local time parsing
  departureDate: string; // ISO 8601 string
  flightInfo: string;
}