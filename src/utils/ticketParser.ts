export interface ParsedItinerary {
  arrivalDate: string;
  flightInfo: string;
  guestCount: number;
}

/**
 * Takes raw, unstructured text (e.g., from an email or ticket PDF) and 
 * extracts key real estate booking metrics using Regular Expressions.
 */
export function parseTicketText(rawText: string): ParsedItinerary {
  // Default fallback values
  let arrivalDate = '';
  let flightInfo = '';
  let guestCount = 1; // Default to 1 guest

  if (!rawText) return { arrivalDate, flightInfo, guestCount };

  // 1. Extract Flight Number (e.g., "DL 1234", "AA123", "UA 45")
  // Matches 2 uppercase letters, an optional space, and 2-4 digits.
  const flightRegex = /([A-Z]{2}\s?\d{2,4})/i;
  const flightMatch = rawText.match(flightRegex);
  if (flightMatch) {
    flightInfo = flightMatch[0].toUpperCase();
  }

  // 2. Extract Arrival Date (e.g., "Jan 15", "October 5th", "10/24/2026")
  // This is a broad regex checking for standard Month-Day textual formats.
  const dateRegex = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s\d{1,2}/i;
  const dateMatch = rawText.match(dateRegex);
  if (dateMatch) {
    arrivalDate = dateMatch[0];
  }

  // 3. Extract Guest Count (e.g., "2 adults", "3 guests", "4 passengers")
  const guestRegex = /(\d+)\s*(guests?|passengers?|adults?|travelers?)/i;
  const guestMatch = rawText.match(guestRegex);
  if (guestMatch && guestMatch[1]) {
    guestCount = parseInt(guestMatch[1], 10);
  }

  return { arrivalDate, flightInfo, guestCount };
}