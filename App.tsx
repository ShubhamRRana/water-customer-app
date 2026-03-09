import React, { useEffect, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';

// Static imports (React.lazy/dynamic import not supported by Metro in RN)
import AuthNavigator from './src/navigation/AuthNavigator';
import CustomerNavigator from './src/navigation/CustomerNavigator';

// Store imports
import { useAuthStore } from './src/store/authStore';

// Components
import ErrorBoundary from './src/components/common/ErrorBoundary';

// Types
import { User, isCustomerUser } from './src/types';

export type RootStackParamList = {
  Auth: undefined;
  Customer: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const App: React.FC = () => {
  const { user, initializeAuth } = useAuthStore();
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

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

  // Customer app: only customers may enter. Non-customer users (e.g. admin/driver from session restore) go to Auth.
  const getInitialRouteName = (user: User | null): keyof RootStackParamList => {
    if (!user) return 'Auth';
    if (isCustomerUser(user)) return 'Customer';
    return 'Auth';
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

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <NavigationContainer ref={navigationRef}>
          <StatusBar style="light" />
          <Stack.Navigator
            initialRouteName={getInitialRouteName(user)}
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="Auth" component={AuthNavigator} />
            <Stack.Screen name="Customer" component={CustomerNavigator} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
};

export default App;