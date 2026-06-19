export interface Property {
  id: string;
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
  id: string;
  propertyId: string;
  uri: string;
  mediaType: 'photo' | 'video';
  isMain: boolean;
}

export interface Stay {
  id: string;
  propertyId: string;
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
  mainImageUri?: string;
}