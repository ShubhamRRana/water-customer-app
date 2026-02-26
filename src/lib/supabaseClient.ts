/**
 * Supabase Client Configuration
 * 
 * Initializes and exports the Supabase client for use throughout the application.
 * Uses environment variables for configuration.
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import Constants from 'expo-constants';

// Get Supabase URL and anon key from environment variables
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = 'Missing Supabase configuration. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file, app.config.js, or EAS build secrets.';
  console.error('CRITICAL ERROR:', errorMessage);
  console.error('Environment check:', {
    hasExpoConfig: !!Constants.expoConfig,
    hasExtra: !!Constants.expoConfig?.extra,
    expoSupabaseUrl: Constants.expoConfig?.extra?.supabaseUrl,
    envSupabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  });
  throw new Error(errorMessage);
}

/**
 * Supabase client instance
 * 
 * Configured with:
 * - Auto-refresh tokens
 * - Persistent sessions
 * - No URL detection (for React Native)
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Manage token refresh when app returns to foreground (React Native only)
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
