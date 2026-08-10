/**
 * analytics.tsx — redirects to weakness map
 * This route exists for URL compatibility; the real screen is weakness.tsx.
 */
import { Redirect } from 'expo-router';
export default function AnalyticsRedirect() {
  return <Redirect href="/(tabs)/weakness" />;
}
