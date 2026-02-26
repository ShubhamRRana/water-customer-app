// Mock for expo-location
// Provides mock implementations of expo-location functions for testing

const Accuracy = {
  Lowest: 1,
  Low: 2,
  Balanced: 3,
  High: 4,
  Highest: 5,
  BestForNavigation: 6,
};

const PermissionStatus = {
  UNDETERMINED: 'undetermined',
  GRANTED: 'granted',
  DENIED: 'denied',
};

const requestForegroundPermissionsAsync = jest.fn(async () => ({
  status: PermissionStatus.GRANTED,
  granted: true,
  canAskAgain: true,
  expires: 'never',
}));

const getForegroundPermissionsAsync = jest.fn(async () => ({
  status: PermissionStatus.GRANTED,
  granted: true,
  canAskAgain: true,
  expires: 'never',
}));

const getCurrentPositionAsync = jest.fn(async (options) => ({
  coords: {
    latitude: 28.6139,
    longitude: 77.2090,
    altitude: null,
    accuracy: 10,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  },
  timestamp: Date.now(),
}));

const watchPositionAsync = jest.fn(async (options, callback) => {
  // Return a subscription object with a remove method
  const subscription = {
    remove: jest.fn(),
  };
  
  // Optionally call the callback with a mock location
  if (callback) {
    setTimeout(() => {
      callback({
        coords: {
          latitude: 28.6139,
          longitude: 77.2090,
          altitude: null,
          accuracy: 10,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      });
    }, 0);
  }
  
  return subscription;
});

module.exports = {
  __esModule: true,
  default: {
    Accuracy,
    PermissionStatus,
    requestForegroundPermissionsAsync,
    getForegroundPermissionsAsync,
    getCurrentPositionAsync,
    watchPositionAsync,
  },
  Accuracy,
  PermissionStatus,
  requestForegroundPermissionsAsync,
  getForegroundPermissionsAsync,
  getCurrentPositionAsync,
  watchPositionAsync,
};

