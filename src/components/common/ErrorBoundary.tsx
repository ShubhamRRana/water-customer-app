import React, { Component, ErrorInfo, ReactNode, useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { errorLogger, ErrorSeverity } from '../../utils/errorLogger';
import Typography from './Typography';
import Button from './Button';
import { UI_CONFIG } from '../../constants/config';
import type { ThemeColors } from '../../constants/config';
import { useThemeColors } from '../../hooks/useThemeColors';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

function createErrorBoundaryStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.primary,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 24,
    },
    content: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      marginBottom: 16,
      textAlign: 'center',
      color: colors.error,
    },
    message: {
      marginBottom: 32,
      textAlign: 'center',
      color: colors.textSecondary,
      paddingHorizontal: 16,
    },
    errorDetails: {
      width: '100%',
      marginBottom: 24,
      padding: 16,
      backgroundColor: colors.background,
      borderRadius: UI_CONFIG.borderRadius.md,
      borderWidth: 1,
      borderColor: colors.error,
    },
    errorTitle: {
      marginBottom: 8,
      color: colors.error,
    },
    errorMessage: {
      marginBottom: 12,
      color: colors.text,
      fontFamily: 'monospace',
    },
    stackTrace: {
      maxHeight: 200,
      backgroundColor: colors.surface,
      padding: 8,
      borderRadius: UI_CONFIG.borderRadius.sm,
    },
    stackText: {
      fontFamily: 'monospace',
      fontSize: 10,
      color: colors.textSecondary,
    },
    buttonContainer: {
      width: '100%',
      maxWidth: 300,
    },
    button: {
      width: '100%',
    },
  });
}

function ErrorBoundaryFallbackUI({
  error,
  onReset,
}: {
  error: Error | null;
  onReset: () => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createErrorBoundaryStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Typography variant="h1" style={styles.title}>
            Oops! Something went wrong
          </Typography>

          <Typography variant="body" style={styles.message}>
            {"We're sorry, but something unexpected happened. Don't worry, your data is safe."}
          </Typography>

          {__DEV__ && error && (
            <View style={styles.errorDetails}>
              <Typography variant="h4" style={styles.errorTitle}>
                Error Details (Development Only)
              </Typography>
              <Typography variant="caption" style={styles.errorMessage}>
                {error.toString()}
              </Typography>
              {error.stack && (
                <ScrollView style={styles.stackTrace}>
                  <Typography variant="caption" style={styles.stackText}>
                    {error.stack}
                  </Typography>
                </ScrollView>
              )}
            </View>
          )}

          <View style={styles.buttonContainer}>
            <Button title="Try Again" onPress={onReset} variant="primary" style={styles.button} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo,
    });

    errorLogger.critical('React Error Boundary caught an error', error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: Props): void {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (hasError && resetKeys && prevProps.resetKeys) {
      const hasResetKeyChanged = resetKeys.some((key, index) => key !== prevProps.resetKeys?.[index]);

      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }

    if (hasError && resetOnPropsChange && prevProps !== this.props) {
      this.resetErrorBoundary();
    }
  }

  componentWillUnmount(): void {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  resetErrorBoundary = (): void => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.resetTimeoutId = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
      });
    }, 0);
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorBoundaryFallbackUI error={this.state.error} onReset={this.resetErrorBoundary} />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
