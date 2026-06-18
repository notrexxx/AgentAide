import { Href, Redirect } from 'expo-router';

export default function Index() {
  // Explicitly casting to Href bypasses the stale TypeScript generated routes
  return <Redirect href={"/(tabs)" as Href} />;
}