// app.config.js — single source of Expo config

try {
  require('dotenv/config');
} catch (e) {
  // EAS build: env from secrets
}

module.exports = {
  expo: {
    name: 'WTC',
    slug: 'water-tanker-app',
    version: '1.0.0',
    orientation: 'default',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    // Transparent status bar for edge-to-edge (splash alone would use #fff and legacy APIs).
    androidStatusBar: {
      backgroundColor: '#00000000',
      barStyle: 'light-content',
    },
    ios: {
      bundleIdentifier: 'in.tankerhub.admin',
      supportsTablet: true,
    },
    android: {
      package: 'in.tankerhub.admin',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#78B4E0',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      softwareKeyboardLayoutMode: 'resize',
    },
    web: {
      favicon: './assets/favicon.png',
    },
    fonts: ['assets/fonts/PlayfairDisplay-Regular.ttf'],
    plugins: ['expo-dev-client', 'expo-font'],
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      eas: {
        projectId: 'd87af120-6b69-4668-908e-002561c55444',
      },
    },
  },
};
