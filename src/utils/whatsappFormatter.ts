import * as Sharing from 'expo-sharing';
import { Alert, Linking, Share } from 'react-native';
import { StayWithProperty } from '../database/staysQueries';
import { Property } from '../types';

/**
 * 1. CLIENT MESSAGE (Hospitality Focused)
 */
export async function shareStayToClient(stay: StayWithProperty) {
  const message = 
`Hello! 👋\n\n` +
`Here are the confirmed details for your upcoming stay at *${stay.propertyName}*.\n\n` +
`🛬 *Flight:* ${stay.flightInfo || 'Not Provided'}\n` +
`📅 *Arrival:* ${stay.arrivalDate}\n` +
`👥 *Guests:* ${stay.guestCount}\n\n` +
`Please let me know if you need transportation arranged from the airport!\n\n` +
`- Agent Aide`;

  await executeDeepLink(message);
}

/**
 * 2. DRIVER MESSAGE (Logistics Focused)
 */
export async function shareStayToDriver(stay: StayWithProperty) {
  const message = 
`🚗 *New Pickup Dispatch*\n\n` +
`*Destination:* ${stay.propertyName}\n` +
`*Arrival Date:* ${stay.arrivalDate}\n` +
`*Flight Info:* ${stay.flightInfo || 'N/A'}\n` +
`*Passenger Count:* ${stay.guestCount}\n\n` +
`Please confirm if you are available for this pickup.`;

  await executeDeepLink(message);
}

/**
 * 3. PROPERTY DOSSIER (Native Text Share Sheet)
 */
export async function sharePropertyText(property: Property) {
  const message = 
`🏡 *Property Spotlight: ${property.name}*\n\n` +
`📍 *Location:* ${property.address || 'Contact for exact address'}\n` +
`🛏️ *Rooms:* ${property.roomsCount || 0}\n` +
`👥 *Max Capacity:* ${property.maxGuests || 1} guests\n` +
`🐾 *Pets:* ${property.petsAllowed ? 'Allowed' : 'Not Allowed'}\n\n` +
`📝 *Details:*\n${property.description || 'A beautiful, fully-managed property.'}`;

  try {
    await Share.share({
      message,
      title: property.name, // Used by some Android email/share targets
    });
  } catch (error) {
    Alert.alert('Sharing Error', 'Failed to share property details.');
  }
}

/**
 * 4. NATIVE MEDIA SHARE (Photos)
 */
export async function shareLocalPhoto(uri: string) {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Unavailable', 'Sharing is not supported on this device.');
      return;
    }
    // This pops open the native iOS/Android share sheet specifically for files
    await Sharing.shareAsync(uri, {
      dialogTitle: 'Share Property Photo',
      mimeType: 'image/jpeg',
    });
  } catch (error) {
    Alert.alert('Sharing Error', 'Failed to share the local photo.');
  }
}

/**
 * Reusable Deep Link Executor
 */
async function executeDeepLink(message: string) {
  const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert(
        'WhatsApp Not Found', 
        'WhatsApp is not installed on this device. Please install it to share via deep link.'
      );
    }
  } catch (error) {
    console.error('Deep Link Error:', error);
    Alert.alert('System Error', 'Could not open the sharing application.');
  }
}