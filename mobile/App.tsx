import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OnboardingScreen from './src/screens/OnboardingScreen';
import PermissionsScreen from './src/screens/PermissionsScreen';
import HomeScreen from './src/screens/HomeScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { UserProvider, useUser } from './src/hooks/useUser';
import { isPermissionsSetupComplete } from './src/storage/permissionsStorage';
import { startHealthMonitoringSession } from './src/services/healthMonitoring';

export type RootStackParamList = {
  Permissions: undefined;
  Onboarding: undefined;
  Home: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  const { userId, loading: userLoading } = useUser();
  const [permissionsReady, setPermissionsReady] = useState<boolean | null>(null);

  const refreshPermissionsFlag = useCallback(async () => {
    const done = await isPermissionsSetupComplete();
    setPermissionsReady(done);
  }, []);

  useEffect(() => {
    refreshPermissionsFlag();
  }, [refreshPermissionsFlag]);

  useEffect(() => {
    if (permissionsReady) {
      startHealthMonitoringSession().catch((err) => {
        console.error('[App] Failed to start health monitoring:', err);
      });
    }
  }, [permissionsReady]);

  if (userLoading || permissionsReady === null) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color="#2d6a4f" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!permissionsReady ? (
        <Stack.Screen name="Permissions">
          {() => (
            <PermissionsScreen
              onComplete={() => setPermissionsReady(true)}
            />
          )}
        </Stack.Screen>
      ) : !userId ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              headerShown: true,
              title: '설정',
              headerTintColor: '#1a1a2e',
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <UserProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </UserProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
});
