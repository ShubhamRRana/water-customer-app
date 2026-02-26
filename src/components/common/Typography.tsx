import React from 'react';
import { Text, StyleSheet, TextProps } from 'react-native';
import { UI_CONFIG } from '../../constants/config';

interface TypographyProps extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'caption';
  children: React.ReactNode;
}

const Typography: React.FC<TypographyProps> = ({ 
  variant = 'body', 
  children, 
  style, 
  ...props 
}) => {
  return (
    <Text style={[styles[variant], style]} {...props}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  h1: {
    fontSize: UI_CONFIG.fontSize.xxl,
    fontWeight: '700',
    lineHeight: UI_CONFIG.fontSize.xxl * 1.2,
    color: UI_CONFIG.colors.text,
  },
  h2: {
    fontSize: UI_CONFIG.fontSize.xl,
    fontWeight: '600',
    lineHeight: UI_CONFIG.fontSize.xl * 1.2,
    color: UI_CONFIG.colors.text,
  },
  h3: {
    fontSize: UI_CONFIG.fontSize.lg,
    fontWeight: '600',
    lineHeight: UI_CONFIG.fontSize.lg * 1.2,
    color: UI_CONFIG.colors.text,
  },
  h4: {
    fontSize: UI_CONFIG.fontSize.md,
    fontWeight: '600',
    lineHeight: UI_CONFIG.fontSize.md * 1.2,
    color: UI_CONFIG.colors.text,
  },
  body: {
    fontSize: UI_CONFIG.fontSize.md,
    lineHeight: UI_CONFIG.fontSize.md * 1.4,
    color: UI_CONFIG.colors.text,
  },
  caption: {
    fontSize: UI_CONFIG.fontSize.sm,
    lineHeight: UI_CONFIG.fontSize.sm * 1.4,
    color: UI_CONFIG.colors.textSecondary,
  },
});

export default Typography;
