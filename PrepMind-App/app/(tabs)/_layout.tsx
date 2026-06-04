import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { Colors } from '@/constants/theme';

function TabIcon({ icon }: { icon: string; color: string }) {
  return <Text style={{ fontSize: 20 }}>{icon}</Text>;
}

/**
 * Tab Navigation — 5 core tabs (max comfortable on mobile)
 *
 * Home     → Overview + quick actions
 * Evaluate → Answer evaluator (Gemini Vision)
 * MCQ      → AI quiz engine
 * Planner  → 7-day study plan
 * Profile  → Stats, weakness map, sign out
 *
 * Voice & Weakness are accessible from Home and Profile
 * (too many tabs crowds the mobile nav bar)
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.outline,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.outlineVariant,
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 58,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter_500Medium',
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen name="index"    options={{ title: 'Home',     tabBarIcon: (p) => <TabIcon icon="🏠" color={p.color} /> }} />
      <Tabs.Screen name="evaluate" options={{ title: 'Evaluate', tabBarIcon: (p) => <TabIcon icon="📝" color={p.color} /> }} />
      <Tabs.Screen name="mcq"      options={{ title: 'MCQ',      tabBarIcon: (p) => <TabIcon icon="🧠" color={p.color} /> }} />
      <Tabs.Screen name="planner"  options={{ title: 'Planner',  tabBarIcon: (p) => <TabIcon icon="📅" color={p.color} /> }} />
      <Tabs.Screen name="profile"  options={{ title: 'Profile',  tabBarIcon: (p) => <TabIcon icon="👤" color={p.color} /> }} />

      {/* Hidden tabs — accessible via router.push() from Home/Profile */}
      <Tabs.Screen name="voice"    options={{ href: null }} />
      <Tabs.Screen name="weakness" options={{ href: null }} />
      <Tabs.Screen name="analytics" options={{ href: null }} />
    </Tabs>
  );
}
