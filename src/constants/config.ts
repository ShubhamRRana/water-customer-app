// App configuration constants

export const APP_CONFIG = {
  name: 'Water Tanker Booking',
  version: '1.0.0',
  description: 'Book water tankers for your home or business',
  contactPageUrl: 'https://tankerhub.in/contact',
};

// API Configuration
export const API_CONFIG = {
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
};

// Local Storage Configuration
export const STORAGE_CONFIG = {
  collections: {
    users: 'users_collection',
    bookings: 'bookings',
    tankerSizes: 'tankerSizes',
    pricing: 'pricing',
    driverApplications: 'driverApplications',
    notifications: 'notifications',
  },
};

// Booking Configuration
export const BOOKING_CONFIG = {
  maxAdvanceBookingDays: 30,
  minAdvanceBookingHours: 24,
  businessHours: {
    start: 6, // 6 AM
    end: 22, // 10 PM
  },
  defaultTankerSizes: [
    { size: 10000, basePrice: 600, displayName: '10000 Liters' },
    { size: 15000, basePrice: 900, displayName: '15000 Liters' },
  ],
};

// Pricing Configuration
export const PRICING_CONFIG = {
  defaultPricePerKm: 5, // ₹5 per km
  defaultMinimumCharge: 50, // ₹50 minimum charge
  currency: 'INR',
  currencySymbol: '₹',
};

// Location Configuration
export const LOCATION_CONFIG = {
  serviceRadius: 50, // 50km radius
  defaultCenter: {
    latitude: 28.6139, // Delhi coordinates
    longitude: 77.2090,
  },
  averageSpeed: 30, // km/h for delivery time calculation
};

/** User-selectable theme; `system` follows the OS appearance. */
export type ThemePreference = 'light' | 'dark' | 'system';

/** Gold palette — dark & refined */
export const DARK_THEME_COLORS = {
  primary: '#1a1d24',
  background: '#1a1d24',
  surface: '#252a33',
  surfaceLight: '#2f3540',
  secondary: '#3d4552',
  accent: '#ffc300',
  accentMuted: '#a08b4a',
  text: '#f0f2f5',
  textSecondary: '#9ca3af',
  textLight: '#ffffff',
  border: '#3d4552',
  borderLight: '#4a5568',
  success: '#34d399',
  warning: '#f59e0b',
  error: '#ef4444',
  disabled: '#6b7280',
  shadow: '#000000',
  overlaySubtle: 'rgba(255, 255, 255, 0.06)',
  overlayLight: 'rgba(255, 255, 255, 0.2)',
  overlayMedium: 'rgba(255, 255, 255, 0.3)',
  overlayDark: 'rgba(0, 0, 0, 0.6)',
} as const;

/** Light surfaces + gold accent (same keys as dark) */
export const LIGHT_THEME_COLORS = {
  primary: '#eef0f4',
  background: '#eef0f4',
  surface: '#ffffff',
  surfaceLight: '#e4e7ec',
  secondary: '#cbd5e1',
  accent: '#e6a800',
  accentMuted: '#9a7b2c',
  text: '#1a1d24',
  textSecondary: '#64748b',
  textLight: '#ffffff',
  border: '#e2e8f0',
  borderLight: '#cbd5e1',
  success: '#059669',
  warning: '#d97706',
  error: '#dc2626',
  disabled: '#94a3b8',
  shadow: '#000000',
  overlaySubtle: 'rgba(0, 0, 0, 0.04)',
  overlayLight: 'rgba(0, 0, 0, 0.08)',
  overlayMedium: 'rgba(0, 0, 0, 0.14)',
  overlayDark: 'rgba(0, 0, 0, 0.4)',
} as const;

export type ThemeColors = {
  [K in keyof typeof DARK_THEME_COLORS]: string;
};

export const THEME_STORAGE_KEY = '@water_theme_preference';

/** Effective light/dark for a preference and optional OS scheme (`null` treats system as dark). */
export function resolveEffectiveScheme(
  preference: ThemePreference,
  systemColorScheme: 'light' | 'dark' | null | undefined
): 'light' | 'dark' {
  if (preference === 'system') {
    return systemColorScheme === 'light' ? 'light' : 'dark';
  }
  return preference;
}

export function getColorsForScheme(scheme: 'light' | 'dark'): ThemeColors {
  return (scheme === 'light' ? LIGHT_THEME_COLORS : DARK_THEME_COLORS) as unknown as ThemeColors;
}

// UI Configuration
export const UI_CONFIG = {
  fonts: {
    primary: 'System',
    bold: 'System',
    fallback: ['System'],
  },
  colors: DARK_THEME_COLORS as unknown as ThemeColors,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40, // Hero sections, large layouts
  },
  borderRadius: {
    sm: 4, // Chips/tags
    md: 10, // Softer premium feel
    lg: 14,
    xl: 20,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
  },
  /** In-app screens: menu/back row + title + optional trailing action */
  appScreenHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    leftButtonPadding: 8,
    leftButtonMarginRight: 12,
    trailingMinWidth: 64,
  },
};

// Validation Configuration
export const VALIDATION_CONFIG = {
  phone: {
    minLength: 10,
    maxLength: 10,
    pattern: /^[6-9]\d{9}$/,
  },
  password: {
    minLength: 6,
    maxLength: 128,
  },
  name: {
    minLength: 2,
    maxLength: 100,
    pattern: /^[a-zA-Z\s\-]+$/,
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  vehicleNumber: {
    pattern: /^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/,
  },
  pincode: {
    pattern: /^\d{6}$/,
  },
};

// Storage Keys
export const STORAGE_KEYS = {
  user: 'user',
  authToken: 'authToken',
  onboardingCompleted: 'onboardingCompleted',
  lastLocation: 'lastLocation',
  savedAddresses: 'savedAddresses',
  preferences: 'preferences',
};

// Error Messages
export const ERROR_MESSAGES = {
  network: 'Network error. Please check your internet connection.',
  auth: {
    invalidCredentials: 'Invalid email address or password.',
    userNotFound: 'User not found.',
    userExists: 'User already exists with this email address.',
    weakPassword: 'Password is too weak.',
    networkError: 'Network error during authentication.',
    adminCreatedDriverOnly: 'Only admin-created drivers can login. Please contact the administrator to create your driver account.',
    roleMismatch: 'Invalid credentials for this account type. Please use the correct login page for your account.',
    currentPasswordIncorrect: 'Current password is incorrect.',
    passwordUpdateFailed: 'Failed to update password. Please try again.',
  },
  booking: {
    createFailed: 'Failed to create booking.',
    updateFailed: 'Failed to update booking.',
    cancelFailed: 'Failed to cancel booking.',
    notFound: 'Booking not found.',
    alreadyAccepted: 'Booking has already been accepted by another driver.',
    cannotCancel: 'This booking cannot be cancelled.',
    subscriptionRequired:
      'An active subscription is required to create bookings. Please subscribe from the menu.',
  },
  societyTrip: {
    subscriptionRequired:
      'An active subscription is required to log trips. Please subscribe from the menu.',
  },
  location: {
    permissionDenied: 'Location permission denied.',
    serviceDisabled: 'Location services are disabled.',
    timeout: 'Location request timed out.',
    notSupported: 'Geolocation is not supported.',
    outOfServiceArea: 'Location is outside our service area.',
  },
  payment: {
    failed: 'Payment failed. Please try again.',
    cancelled: 'Payment was cancelled.',
    networkError: 'Network error during payment.',
    razorpayNotConfigured: 'Payment is not configured. Please contact support.',
    razorpayRequiresDevBuild:
      'Razorpay payments require a development build. Run npm run start:dev and open the dev client app instead of Expo Go.',
    razorpayCheckoutFailed: 'Payment could not be completed. Please try again.',
    razorpayCancelled: 'Payment was cancelled.',
    razorpayNetworkError: 'Network error during payment. Check your connection and try again.',
    agencyNotOnboarded:
      'This agency is not set up for online payments yet. You can pay cash on delivery when your order arrives.',
    signatureMismatch:
      'Payment verification failed. Please try again or contact support if the amount was deducted.',
    trialActive:
      'Your free trial is still active. Paid subscription checkout is not available until the trial ends.',
    bookingAlreadyPaid: 'This booking has already been paid.',
    subscriptionNotEligible:
      'This subscription is not eligible for payment. Please check your plan status and try again.',
  },
  general: {
    unexpected: 'An unexpected error occurred.',
    tryAgain: 'Something went wrong. Please try again.',
    invalidInput: 'Invalid input provided.',
    required: 'This field is required.',
  },
};

// Success Messages
export const SUCCESS_MESSAGES = {
  auth: {
    loginSuccess: 'Login successful!',
    registerSuccess: 'Registration successful!',
    registerNeedsEmailConfirmation:
      'We sent a confirmation link. Open the email, tap the link to verify, then return here and sign in.',
    verifyEmailTitle: 'Verify your email',
    verifyEmailSubtitle:
      'Your account is almost ready. Confirm your email to finish setup—then you can sign in.',
    verifyEmailStepCheckInbox: 'Open the inbox for the address you used to register.',
    verifyEmailStepClickLink: 'Open the confirmation message and tap the link (check spam if you do not see it).',
    verifyEmailStepSignIn: 'Come back to the app and use Sign in with the same email and password.',
    verifyEmailResendCta: 'Resend confirmation email',
    verifyEmailResent: 'If an account exists for this email, we sent another confirmation message.',
    verifyEmailOpenMail: 'Open email app',
    verifyEmailContinueSignIn: 'Continue to sign in',
    forgotPasswordTitle: 'Reset your password',
    forgotPasswordSubtitle: 'Enter the email for your account and we will send you a reset link.',
    forgotPasswordSubmit: 'Send reset link',
    forgotPasswordSentTitle: 'Check your email',
    forgotPasswordSentMessage:
      'If an account exists for this email, we sent a link to reset your password. Open the link on this device to set a new password in the app.',
    forgotPasswordBackToSignIn: 'Back to sign in',
    setNewPasswordTitle: 'Set a new password',
    setNewPasswordSubtitle: 'Choose a strong password for your account.',
    setNewPasswordSubmit: 'Update password',
    setNewPasswordSuccess: 'Your password has been updated. Sign in with your new password.',
    changePasswordTitle: 'Change password',
    changePasswordSubtitle: 'Enter your current password and choose a new one.',
    changePasswordSubmit: 'Save new password',
    changePasswordSuccess: 'Your password has been updated.',
    welcomeAfterRegister: "You're all set — welcome to TankerHub!",
    logoutSuccess: 'Logged out successfully!',
  },
  booking: {
    created: 'Booking created successfully!',
    updated: 'Booking updated successfully!',
    cancelled: 'Booking cancelled successfully!',
    accepted: 'Booking accepted successfully!',
    completed: 'Booking completed successfully!',
  },
  profile: {
    updated: 'Profile updated successfully!',
    passwordChanged: 'Password changed successfully!',
  },
  address: {
    added: 'Address added successfully!',
    updated: 'Address updated successfully!',
    deleted: 'Address deleted successfully!',
  },
};

// Loading Messages
export const LOADING_MESSAGES = {
  auth: {
    loggingIn: 'Logging in...',
    registering: 'Creating account...',
    loggingOut: 'Logging out...',
  },
  booking: {
    creating: 'Creating booking...',
    updating: 'Updating booking...',
    cancelling: 'Cancelling booking...',
    loading: 'Loading bookings...',
  },
  location: {
    gettingLocation: 'Getting your location...',
    calculatingDistance: 'Calculating distance...',
  },
  payment: {
    processing: 'Processing payment...',
    confirming: 'Confirming payment...',
  },
  general: {
    loading: 'Loading...',
    saving: 'Saving...',
    updating: 'Updating...',
  },
};

// Date/Time Configuration
export const DATE_CONFIG = {
  formats: {
    date: 'DD/MM/YYYY',
    time: 'HH:mm',
    datetime: 'DD/MM/YYYY HH:mm',
    display: 'MMM DD, YYYY',
    timeDisplay: 'h:mm A',
  },
  timezone: 'Asia/Kolkata',
};

// Feature Flags
export const FEATURE_FLAGS = {
  enableRazorpaySubscription: true, // Flow A — when false, subscription checkout is blocked
  enableOnlinePayment: true, // Flow B booking checkout
  enablePushNotifications: true, // ✅ Enabled - Phase 3 Item 2 Complete
  enableRealTimeTracking: true, // ✅ Enabled - Phase 3 Item 2 Complete
  enableDriverSelfRegistration: false, // Disabled in MVP
  enableRatingsAndReviews: false, // Disabled in MVP
  enableImmediateBookings: false, // Disabled in MVP
  enableSubscriptionGating: true,
};

// Development Configuration
export const DEV_CONFIG = {
  enableLogging: __DEV__,
  enableDebugMode: __DEV__,
  mockData: __DEV__,
};