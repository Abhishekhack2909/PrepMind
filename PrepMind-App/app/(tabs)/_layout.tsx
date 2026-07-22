import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Colors, Shadows, Radius, Spacing, themed } from '@/constants/theme';

function TabIcon({ icon, color, focused }: { icon: string; color?: any; focused: boolean }) {
  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
      <Text style={[styles.iconText, focused && styles.iconTextActive]}>{icon}</Text>
    </View>
  );
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
export default function TabsLayout() { //
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.onSurfaceMuted,
        tabBarStyle: {
          backgroundColor: Colors.surfaceCard,
          borderTopWidth: 0,
          marginHorizontal: 12,
          marginBottom: Platform.OS === 'ios' ? 24 : 14,
          borderRadius: Radius.xxl,
          height: 76,
          paddingBottom: 0,
          position: 'absolute',
          ...Shadows.elevated,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter_600SemiBold',
          fontSize: 11,
          marginTop: 2,
          marginBottom: 10,
          fontWeight: '600',
          letterSpacing: 0.2,
        },
        tabBarItemStyle: {
          paddingTop: 10,
        },
      }}
    >
      <Tabs.Screen name="index"    options={{ title: 'Home',     tabBarIcon: (p) => <TabIcon icon="🏠" color={p.color} focused={!!p.focused} /> }} />
      <Tabs.Screen name="evaluate" options={{ title: 'Evaluate', tabBarIcon: (p) => <TabIcon icon="📝" color={p.color} focused={!!p.focused} /> }} />
      <Tabs.Screen name="mcq"      options={{ title: 'MCQ',      tabBarIcon: (p) => <TabIcon icon="🧠" color={p.color} focused={!!p.focused} /> }} />
      <Tabs.Screen name="planner"  options={{ title: 'Planner',  tabBarIcon: (p) => <TabIcon icon="📅" color={p.color} focused={!!p.focused} /> }} />
      <Tabs.Screen name="profile"  options={{ title: 'Profile',  tabBarIcon: (p) => <TabIcon icon="👤" color={p.color} focused={!!p.focused} /> }} />

      {/* Hidden tabs — accessible via router.push() from Home/Profile */}
      <Tabs.Screen name="voice"    options={{ href: null }} />
      <Tabs.Screen name="weakness" options={{ href: null }} />
      <Tabs.Screen name="analytics" options={{ href: null }} />
    </Tabs>
  );
}

const styles = themed((Colors) => StyleSheet.create({ 
  iconContainer: {
    minWidth: 48,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerActive: {
    backgroundColor: Colors.primaryGhost,
    minWidth: 54,
  },
  iconText: {
    fontSize: 22,
    opacity: 0.55,
  },
  iconTextActive: {
    fontSize: 24,
    opacity: 1,
  },
}));
