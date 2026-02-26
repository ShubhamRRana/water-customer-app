// Jest setup file
// This file runs before each test file

// Mock @expo/vector-icons to avoid expo-font/uuid dependency chain
// This must be done before any component imports it
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  
  // Ionicons is used as <Ionicons name="icon-name" size={24} />
  const Ionicons = (props) => {
    const { name, size, color, ...otherProps } = props;
    return React.createElement(
      Text,
      {
        testID: `icon-${name}`,
        style: { fontSize: size, color: color },
        ...otherProps
      },
      name || 'icon'
    );
  };
  
  Ionicons.displayName = 'Ionicons';
  Ionicons.glyphMap = {}; // Some code might access this
  
  return {
    Ionicons,
    default: Ionicons,
  };
});

// Mock expo-modules-core/build/Refs before jest-expo tries to use it
// This mock is hoisted and runs before the preset setup
jest.mock('expo-modules-core/build/Refs', () => ({
  createSnapshotFriendlyRef: () => {
    const ref = { current: null };
    Object.defineProperty(ref, 'toJSON', {
      value: () => '[React.ref]',
    });
    return ref;
  },
}), { virtual: true });

// Mock expo-modules-core/build/uuid/uuid.web
// expo-font requires this platform-specific module which doesn't exist in Jest environment
// Use the actual uuid package
jest.mock('expo-modules-core/build/uuid/uuid.web', () => {
  const { v4, v5 } = require('uuid');
  return {
    __esModule: true,
    default: {
      v4,
      v5,
    },
  };
}, { virtual: true });

// Override jest.requireActual to intercept uuid.web requires
// jest-expo uses jest.requireActual which bypasses mocks, so we need to intercept it
if (typeof jest !== 'undefined' && jest.requireActual) {
  const originalRequireActual = jest.requireActual;
  jest.requireActual = function(moduleName) {
    if (moduleName === 'expo-modules-core/build/uuid/uuid.web') {
      // Use the actual uuid package that we installed
      const { v4, v5 } = require('uuid');
      return {
        __esModule: true,
        default: {
          v4,
          v5,
        },
      };
    }
    return originalRequireActual.apply(this, arguments);
  };
}

// Mock globalThis.expo for expo-modules-core
// expo-modules-core/src/EventEmitter.ts tries to access globalThis.expo.EventEmitter
const EventEmitter = require('events');
if (!globalThis.expo) {
  globalThis.expo = {};
}
if (!globalThis.expo.EventEmitter) {
  globalThis.expo.EventEmitter = EventEmitter;
}

// CRITICAL: Use a require hook to patch NativeModules when it's first required
// This ensures the patch runs before jest-expo's setup (which runs as part of the preset)
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  // Mock expo-modules-core/build/uuid/uuid.web before it's required
  if (id === 'expo-modules-core/build/uuid/uuid.web') {
    const { v4, v5 } = require('uuid');
    return {
      __esModule: true,
      default: {
        v4,
        v5,
      },
    };
  }
  
  const result = originalRequire.apply(this, arguments);
  
  // Patch NativeModules when it's first required (before jest-expo's setup runs)
  if (id === 'react-native/Libraries/BatchedBridge/NativeModules') {
    const mockNativeModules = result;
    
    // Ensure UIManager is always a plain object using a getter/setter
    const originalUIManager = mockNativeModules.UIManager;
    let uiManagerFallback = (originalUIManager && typeof originalUIManager === 'object' && originalUIManager !== null) 
      ? originalUIManager 
      : {};
    
    Object.defineProperty(mockNativeModules, 'UIManager', {
      configurable: true,
      enumerable: true,
      get: function() {
        return uiManagerFallback;
      },
      set: function(value) {
        uiManagerFallback = (value && typeof value === 'object' && value !== null) ? value : {};
      }
    });
    
    mockNativeModules.UIManager = uiManagerFallback;
    
    // Ensure NativeUnimoduleProxy exists
    if (!mockNativeModules.NativeUnimoduleProxy || typeof mockNativeModules.NativeUnimoduleProxy !== 'object' || mockNativeModules.NativeUnimoduleProxy === null) {
      mockNativeModules.NativeUnimoduleProxy = {};
    }
    if (!mockNativeModules.NativeUnimoduleProxy.viewManagersMetadata || typeof mockNativeModules.NativeUnimoduleProxy.viewManagersMetadata !== 'object' || mockNativeModules.NativeUnimoduleProxy.viewManagersMetadata === null) {
      mockNativeModules.NativeUnimoduleProxy.viewManagersMetadata = {};
    }
  }
  
  return result;
};

// Fix for jest-expo compatibility with React Native 0.81.5
// Initialize native modules BEFORE react-native/jest/setup runs
// This ensures UIManager and NativeUnimoduleProxy exist when jest-expo tries to use them
const mockNativeModules = require('react-native/Libraries/BatchedBridge/NativeModules');

// CRITICAL: Ensure UIManager is always a plain object (not null/undefined)
// jest-expo's setup.js line 122 calls Object.defineProperty on UIManager, which fails if it's null/undefined
if (!mockNativeModules.UIManager || typeof mockNativeModules.UIManager !== 'object' || mockNativeModules.UIManager === null) {
  mockNativeModules.UIManager = {};
}

// Ensure NativeUnimoduleProxy exists and has viewManagersMetadata as a plain object
if (!mockNativeModules.NativeUnimoduleProxy || typeof mockNativeModules.NativeUnimoduleProxy !== 'object' || mockNativeModules.NativeUnimoduleProxy === null) {
  mockNativeModules.NativeUnimoduleProxy = {};
}
if (!mockNativeModules.NativeUnimoduleProxy.viewManagersMetadata || typeof mockNativeModules.NativeUnimoduleProxy.viewManagersMetadata !== 'object' || mockNativeModules.NativeUnimoduleProxy.viewManagersMetadata === null) {
  mockNativeModules.NativeUnimoduleProxy.viewManagersMetadata = {};
}

// Run React Native's jest setup (may modify native modules)
require('react-native/jest/setup');

// Re-ensure after react-native/jest/setup in case it modified or cleared them
// This is critical because jest-expo's setup runs after react-native's setup but may access these
if (!mockNativeModules.UIManager || typeof mockNativeModules.UIManager !== 'object' || mockNativeModules.UIManager === null) {
  mockNativeModules.UIManager = {};
}
if (!mockNativeModules.NativeUnimoduleProxy || typeof mockNativeModules.NativeUnimoduleProxy !== 'object' || mockNativeModules.NativeUnimoduleProxy === null) {
  mockNativeModules.NativeUnimoduleProxy = {};
}
if (!mockNativeModules.NativeUnimoduleProxy.viewManagersMetadata || typeof mockNativeModules.NativeUnimoduleProxy.viewManagersMetadata !== 'object' || mockNativeModules.NativeUnimoduleProxy.viewManagersMetadata === null) {
  mockNativeModules.NativeUnimoduleProxy.viewManagersMetadata = {};
}

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => {
  const storage = {};
  return {
    setItem: jest.fn((key, value) => {
      return Promise.resolve((storage[key] = value));
    }),
    getItem: jest.fn((key) => {
      return Promise.resolve(storage[key] || null);
    }),
    removeItem: jest.fn((key) => {
      delete storage[key];
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      Object.keys(storage).forEach(key => delete storage[key]);
      return Promise.resolve();
    }),
    getAllKeys: jest.fn(() => {
      return Promise.resolve(Object.keys(storage));
    }),
    multiGet: jest.fn((keys) => {
      return Promise.resolve(keys.map(key => [key, storage[key] || null]));
    }),
    multiSet: jest.fn((keyValuePairs) => {
      keyValuePairs.forEach(([key, value]) => {
        storage[key] = value;
      });
      return Promise.resolve();
    }),
    multiRemove: jest.fn((keys) => {
      keys.forEach(key => delete storage[key]);
      return Promise.resolve();
    }),
  };
});

// Note: Supabase client is mocked on a per-test basis
// Test files that need Supabase mocks should use jest.mock() in their test files
// A manual mock is available at src/lib/__mocks__/supabaseClient.ts for reference

// Suppress console errors in tests (optional - remove if you want to see them)
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};

