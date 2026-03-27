import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface TabConfig {
  name: string;
  title: string;
  icon: IoniconsName;
  activeIcon: IoniconsName;
}

const TABS: TabConfig[] = [
  {
    name: 'index',
    title: 'Feed',
    icon: 'home-outline',
    activeIcon: 'home',
  },
  {
    name: 'search',
    title: 'Søk',
    icon: 'search-outline',
    activeIcon: 'search',
  },
  {
    name: 'post',
    title: 'Legg ut',
    icon: 'add-circle-outline',
    activeIcon: 'add-circle',
  },
  {
    name: 'profile',
    title: 'Profil',
    icon: 'person-outline',
    activeIcon: 'person',
  },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#9ca3af',
        headerShown: true,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
        },
      }}
    >
      {TABS.map(({ name, title, icon, activeIcon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? activeIcon : icon} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
