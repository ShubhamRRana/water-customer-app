// app.config.js — single source of Expo config

try {
  require('dotenv/config');
} catch (e) {
  // EAS build: env from secrets
}

module.exports = {
  expo: {
    name: 'water-tanker-app',
    slug: 'water-tanker-app',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
    },
    android: {
      package: 'com.watertanker.app',
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
    plugins: ['expo-font'],
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      eas: {
        projectId: 'd87af120-6b69-4668-908e-002561c55444',
      },
    },
  },
};
