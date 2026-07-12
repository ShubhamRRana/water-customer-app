import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useColorScheme, View } from 'react-native';
import { DarkTheme, DefaultTheme, NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';

// Static imports (React.lazy/dynamic import not supported by Metro in RN)
import AuthNavigator from './src/navigation/AuthNavigator';
import MainNavigator from './src/navigation/MainNavigator';

// Store imports
import { useAuthStore } from './src/store/authStore';
import { useThemeStore } from './src/store/themeStore';

// Components
import ErrorBoundary from './src/components/common/ErrorBoundary';
import { createAppQueryClient } from './src/lib/queryClient';

// Types
import { User, isCustomerUser } from './src/types';
import { syncRootRoute } from './src/navigation/rootNavigation';
import type { RootStackParamList } from './src/navigation/rootNavigation';

export type { RootStackParamList };

const Stack = createStackNavigator<RootStackParamList>();

const App: React.FC = () => {
  const [queryClient] = useState(() => createAppQueryClient());
  const { user, initializeAuth, needsPasswordReset } = useAuthStore();
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const systemScheme = useColorScheme();
  const setSystemColorScheme = useThemeStore((s) => s.setSystemColorScheme);
  const resolvedScheme = useThemeStore((s) => s.resolvedScheme);
  const themeColors = useThemeStore((s) => s.colors);

  // Load custom fonts
  const [fontsLoaded] = useFonts({
    'PlayfairDisplay-Regular': require('./assets/fonts/PlayfairDisplay-Regular.ttf'),
  });

  useEffect(() => {
    // Initialize the auth system and load any existing user
    initializeAuth().catch(() => {
      // Error handled by error boundary
    });
  }, [initializeAuth]);

  useEffect(() => {
    setSystemColorScheme(systemScheme ?? null);
  }, [systemScheme, setSystemColorScheme]);

  const navigationTheme = useMemo(() => {
    const base = resolvedScheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: themeColors.accent,
        background: themeColors.background,
        card: themeColors.primary,
        text: themeColors.text,
        border: themeColors.border,
        notification: themeColors.accent,
      },
    };
  }, [resolvedScheme, themeColors]);

  // Customer app: only customers may enter. Non-customer users (e.g. admin/driver from session restore) go to Auth.
  const getInitialRouteName = (
    currentUser: User | null,
    needsPasswordReset: boolean
  ): keyof RootStackParamList => {
    if (needsPasswordReset) return 'Auth';
    if (!currentUser) return 'Auth';
    if (isCustomerUser(currentUser)) return 'Main';
    return 'Auth';
  };

  // Navigate when user state changes (also flushed onNavigationContainer onReady)
  useEffect(() => {
    const nav = navigationRef.current;
    if (!nav?.isReady()) return;

    syncRootRoute(nav, getInitialRouteName(user, needsPasswordReset));
  }, [user, needsPasswordReset]);

  const onNavigationReady = () => {
    const nav = navigationRef.current;
    if (!nav?.isReady()) return;

    const u = useAuthStore.getState().user;
    const resetNeeded = useAuthStore.getState().needsPasswordReset;
    syncRootRoute(nav, getInitialRouteName(u, resetNeeded));
  };

  // Don't render the real UI until fonts are loaded; show a themed frame instead of a blank flash.
  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: themeColors.background }} />;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <NavigationContainer
            ref={navigationRef}
            onReady={onNavigationReady}
            theme={navigationTheme}
          >
            <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
            <Stack.Navigator
              initialRouteName={getInitialRouteName(user, needsPasswordReset)}
              screenOptions={{
                headerShown: false,
              }}
            >
              <Stack.Screen name="Auth" component={AuthNavigator} />
              <Stack.Screen name="Main" component={MainNavigator} />
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;