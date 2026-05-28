import { Tabs } from 'expo-router';
import { Colors } from '@/constants/theme';

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
      <Tabs.Screen name="index"    options={{ title: 'Home',     tabBarIcon: ({ color }) => <TabIcon icon="🏠" color={color} /> }} />
      <Tabs.Screen name="evaluate" options={{ title: 'Evaluate', tabBarIcon: ({ color }) => <TabIcon icon="📝" color={color} /> }} />
      <Tabs.Screen name="voice"    options={{ title: 'Voice',    tabBarIcon: ({ color }) => <TabIcon icon="🎙️" color={color} /> }} />
      <Tabs.Screen name="mcq"      options={{ title: 'MCQ',      tabBarIcon: ({ color }) => <TabIcon icon="❓" color={color} /> }} />
      <Tabs.Screen name="planner"  options={{ title: 'Planner',  tabBarIcon: ({ color }) => <TabIcon icon="📅" color={color} /> }} />
    </Tabs>
  );
}

function TabIcon({ icon, color }: { icon: string; color: string }) {
  const { Text } = require('react-native');
  return <Text style={{ fontSize: 20 }}>{icon}</Text>;
}
