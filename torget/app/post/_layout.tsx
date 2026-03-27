import { Stack } from 'expo-router';

export default function PostLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: '#3b82f6',
        headerTitleStyle: { fontWeight: '600' },
        headerStyle: { backgroundColor: '#fff' },
      }}
    >
      <Stack.Screen
        name="images"
        options={{ title: 'Legg til bilder', headerBackTitle: 'Avbryt' }}
      />
      <Stack.Screen
        name="details"
        options={{ title: 'Detaljer', headerBackTitle: 'Tilbake' }}
      />
      <Stack.Screen
        name="preview"
        options={{ title: 'Forhåndsvisning', headerBackTitle: 'Tilbake' }}
      />
    </Stack>
  );
}
