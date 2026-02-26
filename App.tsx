import React, { useEffect, useRef, Suspense, lazy } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { View, ActivityIndicator } from 'react-native';
import { UI_CONFIG } from './src/constants/config';

// Lazy load navigators for code splitting
const AuthNavigator = lazy(() => import('./src/navigation/AuthNavigator'));
const CustomerNavigator = lazy(() => import('./src/navigation/CustomerNavigator'));
const DriverNavigator = lazy(() => import('./src/navigation/DriverNavigator'));
const AdminNavigator = lazy(() => import('./src/navigation/AdminNavigator'));

// Store imports
import { useAuthStore } from './src/store/authStore';

// Components
import ErrorBoundary from './src/components/common/ErrorBoundary';

// Types
import { User } from './src/types';

export type RootStackParamList = {
  Auth: undefined;
  Customer: undefined;
  Driver: undefined;
  Admin: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const App: React.FC = () => {
  const { user, initializeAuth, isLoading } = useAuthStore();
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  // Load custom fonts
  const [fontsLoaded] = useFonts({
    'PlayfairDisplay-Regular': require('./assets/fonts/PlayfairDisplay-Regular.ttf'),
  });

  useEffect(() => {
    // Initialize the auth system and load any existing user
    initializeAuth().catch((error) => {
      // Error handled by error boundary
    });
  }, [initializeAuth]);

  // Helper function to determine initial route based on user
  const getInitialRouteName = (user: User | null): keyof RootStackParamList => {
    if (!user) return 'Auth';
    
    switch (user.role) {
      case 'customer':
        return 'Customer';
      case 'driver':
        return 'Driver';
      case 'admin':
        return 'Admin';
      default:
        return 'Auth';
    }
  };

  // Navigate when user state changes
  useEffect(() => {
    if (navigationRef.current && navigationRef.current.isReady()) {
      const targetRoute = getInitialRouteName(user);
      const currentRoute = navigationRef.current.getCurrentRoute()?.name;
      
      // Only navigate if we're not already on the target route
      if (currentRoute !== targetRoute) {
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: targetRoute }],
        });
      }
    }
  }, [user]);

  // Don't render until fonts are loaded
  if (!fontsLoaded) {
    return null; // or a loading screen
  }

  // Loading component for lazy-loaded navigators
  const NavigatorLoadingFallback = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: UI_CONFIG.colors.background }}>
      <ActivityIndicator size="large" color={UI_CONFIG.colors.primary} />
    </View>
  );

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <NavigationContainer ref={navigationRef}>
          <StatusBar style="auto" />
          <Suspense fallback={<NavigatorLoadingFallback />}>
            <Stack.Navigator
              initialRouteName={getInitialRouteName(user)}
              screenOptions={{
                headerShown: false,
              }}
            >
              <Stack.Screen name="Auth" component={AuthNavigator} />
              <Stack.Screen name="Customer" component={CustomerNavigator} />
              <Stack.Screen name="Driver" component={DriverNavigator} />
              <Stack.Screen name="Admin" component={AdminNavigator} />
            </Stack.Navigator>
          </Suspense>
        </NavigationContainer>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
};

export default App;