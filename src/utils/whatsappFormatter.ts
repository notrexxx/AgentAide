import * as Sharing from 'expo-sharing';
import { Alert, Linking, Share } from 'react-native';
import { StayWithProperty } from '../database/staysQueries';
import { Property } from '../types';

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

// UPGRADED: Now accepts an optional public cloud URL parameter!
export async function sharePropertyText(property: Property, cloudUrl?: string) {
  let message = 
`🏡 *Property Spotlight: ${property.name}*\n\n` +
`📍 *Location:* ${property.address || 'Contact for exact address'}\n` +
`🛏️ *Rooms:* ${property.roomsCount || 0}\n` +
`👥 *Max Capacity:* ${property.maxGuests || 1} guests\n` +
`🐾 *Pets:* ${property.petsAllowed ? 'Allowed' : 'Not Allowed'}\n\n` +
`📝 *Details:*\n${property.description || 'A beautiful, fully-managed property.'}`;

  // If we have a cloud URL, we append it to the bottom. WhatsApp will automatically read this link and generate an image preview card!
  if (cloudUrl) {
    message += `\n\n🖼️ *View Property Image:*\n${cloudUrl}`;
  }

  try {
    // For properties, we still use the OS Native Share Sheet to maximize compatibility 
    // across email, iMessage, and WhatsApp.
    await Share.share({
      message,
      title: property.name, 
    });
  } catch (error) {
    Alert.alert('Sharing Error', 'Failed to share property details.');
  }
}

export async function shareLocalPhoto(uri: string) {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Unavailable', 'Sharing is not supported on this device.');
      return;
    }
    await Sharing.shareAsync(uri, {
      dialogTitle: 'Share Property Photo',
      mimeType: 'image/jpeg',
    });
  } catch (error) {
    Alert.alert('Sharing Error', 'Failed to share the local photo.');
  }
}

async function executeDeepLink(message: string) {
  const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('WhatsApp Not Found', 'WhatsApp is not installed on this device.');
    }
  } catch (error) {
    console.error('Deep Link Error:', error);
    Alert.alert('System Error', 'Could not open the sharing application.');
  }
}