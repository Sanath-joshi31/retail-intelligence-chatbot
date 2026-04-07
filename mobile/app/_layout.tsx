import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: '#1a1a2e',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            contentStyle: {
              backgroundColor: '#0f0f23',
            },
          }}
        >
          <Stack.Screen name="index" options={{ title: 'Dashboard' }} />
          <Stack.Screen name="chatbot" options={{ title: 'AI Chatbot' }} />
          <Stack.Screen name="inventory" options={{ title: 'Inventory' }} />
          <Stack.Screen name="sales" options={{ title: 'Sales Analytics' }} />
        </Stack>
      </GestureHandlerRootView>
    </>
  );
}
