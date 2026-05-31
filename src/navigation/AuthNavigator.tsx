import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import SocietyLoginScreen from '../screens/auth/SocietyLoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import VerifyEmailScreen from '../screens/auth/VerifyEmailScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import SetNewPasswordScreen from '../screens/auth/SetNewPasswordScreen';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { AuthStackParamList } from '../types/index';
import { useAuthStore } from '../store/authStore';

const Stack = createStackNavigator<AuthStackParamList>();

const AuthNavigator: React.FC = () => {
  const needsPasswordReset = useAuthStore((s) => s.needsPasswordReset);

  return (
    <ErrorBoundary resetKeys={['Auth']}>
      <Stack.Navigator
        key={needsPasswordReset ? 'password-reset' : 'auth-default'}
        initialRouteName={needsPasswordReset ? 'SetNewPassword' : 'RoleSelection'}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SocietyLogin" component={SocietyLoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="SetNewPassword" component={SetNewPasswordScreen} />
      </Stack.Navigator>
    </ErrorBoundary>
  );
};

export default AuthNavigator;
