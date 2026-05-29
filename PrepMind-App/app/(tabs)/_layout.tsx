import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { Colors } from '@/constants/theme';

// TabIcon renders an emoji as the tab icon
function TabIcon({ icon }: { icon: string; color: string }) {
  return <Text style={{ fontSize: 20 }}>{icon}</Text>;
}

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
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter_500Medium',
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen name="index"    options={{ title: 'Home',     tabBarIcon: (p) => <TabIcon icon="🏠"  color={p.color} /> }} />
      <Tabs.Screen name="evaluate" options={{ title: 'Evaluate', tabBarIcon: (p) => <TabIcon icon="📝"  color={p.color} /> }} />
      <Tabs.Screen name="voice"    options={{ title: 'Voice',    tabBarIcon: (p) => <TabIcon icon="🎙️" color={p.color} /> }} />
      <Tabs.Screen name="mcq"      options={{ title: 'MCQ',      tabBarIcon: (p) => <TabIcon icon="❓"  color={p.color} /> }} />
      <Tabs.Screen name="planner"  options={{ title: 'Planner',  tabBarIcon: (p) => <TabIcon icon="📅"  color={p.color} /> }} />
    </Tabs>
  );
}
