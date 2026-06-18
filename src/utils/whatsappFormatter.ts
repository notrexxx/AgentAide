import { Alert, Linking } from 'react-native';
import { StayWithProperty } from '../database/staysQueries';

/**
 * Generates a formatted WhatsApp message and triggers the device's Deep Link.
 * We use URL encoding to ensure line breaks and special characters pass safely to the OS.
 */
export async function shareToWhatsApp(stay: StayWithProperty) {
  // Constructing the enterprise-grade message template
  const message = 
`Hello! 👋\n\n` +
`Here are the confirmed details for your upcoming stay at *${stay.propertyName}*.\n\n` +
`🛬 *Flight:* ${stay.flightInfo || 'Not Provided'}\n` +
`📅 *Arrival:* ${stay.arrivalDate}\n` +
`👥 *Guests:* ${stay.guestCount}\n\n` +
`Please let me know if you need transportation arranged from the airport!\n\n` +
`- Agent Aide`;

  // Standard deep link scheme for WhatsApp
  const url = `whatsapp://send?text=${encodeURIComponent(message)}`;

  try {
    // We must check if the phone actually has WhatsApp installed before attempting to open it
    const canOpen = await Linking.canOpenURL(url);
    
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert(
        'WhatsApp Not Found', 
        'It appears WhatsApp is not installed on this device. Please install it to share itineraries.'
      );
    }
  } catch (error) {
    console.error('Deep Link Error:', error);
    Alert.alert('System Error', 'Could not open the sharing application.');
  }
}