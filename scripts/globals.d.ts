// Global type definitions for Node.js script execution
declare const __DEV__: boolean;

// Extend NodeRequire to include the 'main' property and declare module
interface NodeRequire {
  main?: NodeModule;
}

declare const module: NodeModule;

