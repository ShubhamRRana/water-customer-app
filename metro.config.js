const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Keep Expo/Metro defaults for package exports resolution.
// (Disabling package exports can break modern React Native libraries that rely on
// conditional exports / entrypoints.)

module.exports = config;

