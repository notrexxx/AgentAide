export interface Property {
  id: number;
  name: string;
  isAirbnb: boolean; 
  address: string;
  isActive: boolean;
  description?: string;
  roomsCount?: number;
  maxGuests?: number;
  petsAllowed?: boolean;
  mainImageUri?: string;
}

export interface PropertyMedia {
  id: number;
  propertyId: number;
  uri: string;
  mediaType: 'photo' | 'video';
  isMain: boolean; // NEW
}

export interface Stay {
  id: number;
  propertyId: number;
  guestCount: number;
  kidsCount: number;
  petsCount: number;
  specialRequests: string;
  arrivalDate: string;   
  departureDate: string; 
  flightInfo: string;
}

export interface StayWithProperty extends Stay {
  propertyName: string;
  mainImageUri?: string; // NEW
}