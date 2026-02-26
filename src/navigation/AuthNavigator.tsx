import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import RoleEntryScreen from '../screens/auth/RoleEntryScreen';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { AuthStackParamList } from '../types/index';

const Stack = createStackNavigator<AuthStackParamList>();

const AuthNavigator: React.FC = () => {
  return (
    <ErrorBoundary resetKeys={['Auth']}>
      <Stack.Navigator
        initialRouteName="RoleEntry"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="RoleEntry" component={RoleEntryScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
      </Stack.Navigator>
    </ErrorBoundary>
  );
};

export default AuthNavigator;
