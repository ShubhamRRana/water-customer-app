// Manual mock for @expo/vector-icons
// This avoids the expo-font/uuid dependency chain that causes issues in Jest

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

module.exports = {
  Ionicons,
  default: Ionicons,
};

