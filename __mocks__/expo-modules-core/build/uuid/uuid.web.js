// Mock for expo-modules-core/build/uuid/uuid.web
// Use the actual uuid package
const { v4, v5 } = require('uuid');

module.exports = {
  __esModule: true,
  default: {
    v4,
    v5,
  },
};

