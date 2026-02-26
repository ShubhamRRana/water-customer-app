import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { errorLogger, ErrorSeverity } from '../../utils/errorLogger';
import Typography from './Typography';
import Button from './Button';
import { UI_CONFIG } from '../../constants/config';

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

/**
 * ErrorBoundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 * 
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
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
    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // Log the error
    errorLogger.critical(
      'React Error Boundary caught an error',
      error,
      {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      }
    );

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: Props): void {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    // Reset error boundary if resetKeys changed
    if (hasError && resetKeys && prevProps.resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );

      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }

    // Reset on any prop change if enabled
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
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <View style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              <Typography variant="h1" style={styles.title}>
                Oops! Something went wrong
              </Typography>

              <Typography variant="body" style={styles.message}>
                We're sorry, but something unexpected happened. Don't worry, your data is safe.
              </Typography>

              {__DEV__ && this.state.error && (
                <View style={styles.errorDetails}>
                  <Typography variant="h4" style={styles.errorTitle}>
                    Error Details (Development Only)
                  </Typography>
                  <Typography variant="caption" style={styles.errorMessage}>
                    {this.state.error.toString()}
                  </Typography>
                  {this.state.error.stack && (
                    <ScrollView style={styles.stackTrace}>
                      <Typography variant="caption" style={styles.stackText}>
                        {this.state.error.stack}
                      </Typography>
                    </ScrollView>
                  )}
                </View>
              )}

              <View style={styles.buttonContainer}>
                <Button
                  title="Try Again"
                  onPress={this.resetErrorBoundary}
                  variant="primary"
                  style={styles.button}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_CONFIG.colors.surface,
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
    color: UI_CONFIG.colors.error,
  },
  message: {
    marginBottom: 32,
    textAlign: 'center',
    color: UI_CONFIG.colors.textSecondary,
    paddingHorizontal: 16,
  },
  errorDetails: {
    width: '100%',
    marginBottom: 24,
    padding: 16,
    backgroundColor: UI_CONFIG.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.error,
  },
  errorTitle: {
    marginBottom: 8,
    color: UI_CONFIG.colors.error,
  },
  errorMessage: {
    marginBottom: 12,
    color: UI_CONFIG.colors.text,
    fontFamily: 'monospace',
  },
  stackTrace: {
    maxHeight: 200,
    backgroundColor: UI_CONFIG.colors.surface,
    padding: 8,
    borderRadius: 4,
  },
  stackText: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: UI_CONFIG.colors.textSecondary,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
  },
  button: {
    width: '100%',
  },
});

export default ErrorBoundary;