/**
 * analytics.tsx — redirects to weakness map
 * This file exists for URL compatibility but the real screen is weakness.tsx
 */
import { Redirect } from 'expo-router';
export default function AnalyticsRedirect() { // for URL compatibility
  return <Redirect href="/(tabs)/weakness" />;
}
