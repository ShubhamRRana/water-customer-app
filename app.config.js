// app.config.js

// Load .env file if dotenv is available (may not be available during EAS build config)
// EAS CLI uses require() to load this config, so we use a try-catch with require
try {
  // Use require for compatibility with EAS CLI's CommonJS loader
  require('dotenv/config');
} catch (e) {
  // dotenv not available, environment variables should be set via system/env
  // This is expected during EAS build configuration - env vars should be set in EAS secrets
}

export default {
  expo: {
    name: 'water-tanker-app',
    slug: 'water-tanker-app',
    version: '1.0.0',
    // ... other config from app.json ...
    
    // Make environment variables available
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      eas: {
        "projectId": "d87af120-6b69-4668-908e-002561c55444"
      }
    },
    android: {
      package: "com.watertanker.app"
    },
  },
};