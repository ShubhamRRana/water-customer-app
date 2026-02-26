// Setup global variables for Node.js script execution
// This file should be imported first in any script that needs React Native globals

// Define __DEV__ global (React Native development mode flag)
(global as any).__DEV__ = process.env.NODE_ENV !== 'production';

// Mock AsyncStorage for Node.js environment
// This provides an in-memory storage implementation compatible with @react-native-async-storage/async-storage
class NodeAsyncStorage {
  private storage: Map<string, string> = new Map();

  async getItem(key: string): Promise<string | null> {
    return this.storage.get(key) || null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }

  async getAllKeys(): Promise<string[]> {
    return Array.from(this.storage.keys());
  }

  async multiGet(keys: string[]): Promise<[string, string | null][]> {
    return keys.map(key => [key, this.storage.get(key) || null]);
  }

  async multiSet(keyValuePairs: [string, string][]): Promise<void> {
    keyValuePairs.forEach(([key, value]) => {
      this.storage.set(key, value);
    });
  }

  async multiRemove(keys: string[]): Promise<void> {
    keys.forEach(key => this.storage.delete(key));
  }
}

// Mock the AsyncStorage module
const mockAsyncStorage = new NodeAsyncStorage();

// Override the module before it's imported
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id: string) {
  if (id === '@react-native-async-storage/async-storage') {
    return mockAsyncStorage;
  }
  return originalRequire.apply(this, arguments);
};

