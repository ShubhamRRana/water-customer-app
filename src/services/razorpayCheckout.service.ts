import Constants from 'expo-constants';
import { APP_CONFIG, DARK_THEME_COLORS, ERROR_MESSAGES } from '../constants/config';
import type {
  RazorpayCheckoutParams,
  RazorpayCheckoutResult,
  RazorpayVerifyPayload,
} from '../types/razorpay.types';

interface RazorpaySdkError {
  code?: string | number;
  description?: string;
  message?: string;
}

interface RazorpayNativeModule {
  open(options: Record<string, unknown>): Promise<Record<string, unknown>>;
}

let razorpayNativeModule: RazorpayNativeModule | null = null;

function getRazorpayCheckout(): RazorpayNativeModule {
  if (Constants.appOwnership === 'expo') {
    throw new Error(ERROR_MESSAGES.payment.razorpayRequiresDevBuild);
  }

  if (razorpayNativeModule) {
    return razorpayNativeModule;
  }

  try {
    // Lazy load: react-native-razorpay is not available in Expo Go.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = require('react-native-razorpay') as {
      default?: RazorpayNativeModule;
    };
    razorpayNativeModule = module.default ?? (module as unknown as RazorpayNativeModule);
    return razorpayNativeModule;
  } catch {
    throw new Error(ERROR_MESSAGES.payment.razorpayRequiresDevBuild);
  }
}

function isUserCancelled(error: RazorpaySdkError): boolean {
  if (error.code === 0 || error.code === '0') {
    return true;
  }
  const text = `${error.description ?? ''} ${error.message ?? ''}`.toLowerCase();
  return text.includes('cancel');
}

function mapSdkSuccess(data: Record<string, unknown>): RazorpayVerifyPayload {
  return {
    razorpay_order_id: String(data.razorpay_order_id ?? ''),
    razorpay_payment_id: String(data.razorpay_payment_id ?? ''),
    razorpay_signature: String(data.razorpay_signature ?? ''),
  };
}

/**
 * Resolves the public Razorpay Key ID from Expo config or env.
 */
export function getRazorpayKeyId(): string {
  const keyId =
    Constants.expoConfig?.extra?.razorpayKeyId ??
    process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID;
  if (!keyId || typeof keyId !== 'string' || !keyId.trim()) {
    throw new Error(ERROR_MESSAGES.payment.razorpayNotConfigured);
  }
  return keyId.trim();
}

/**
 * Opens Razorpay Standard Checkout. Caller must supply server-created orderId/amount/keyId.
 */
export async function openCheckout(
  params: RazorpayCheckoutParams
): Promise<RazorpayCheckoutResult> {
  const options = {
    key: params.keyId,
    order_id: params.orderId,
    amount: params.amount,
    currency: params.currency,
    name: params.name ?? APP_CONFIG.name,
    description: params.description,
    prefill: params.prefill,
    theme: { color: DARK_THEME_COLORS.accent },
  };

  let RazorpayCheckout: RazorpayNativeModule;
  try {
    RazorpayCheckout = getRazorpayCheckout();
  } catch (error: unknown) {
    return {
      status: 'error',
      message:
        error instanceof Error
          ? error.message
          : ERROR_MESSAGES.payment.razorpayRequiresDevBuild,
    };
  }

  try {
    const data = (await RazorpayCheckout.open(options)) as Record<string, unknown>;
    return { status: 'success', data: mapSdkSuccess(data) };
  } catch (error: unknown) {
    const sdkError = (error ?? {}) as RazorpaySdkError;

    if (isUserCancelled(sdkError)) {
      return { status: 'cancelled' };
    }

    const message =
      sdkError.description ??
      sdkError.message ??
      ERROR_MESSAGES.payment.razorpayCheckoutFailed;

    const isNetwork =
      typeof message === 'string' &&
      (message.toLowerCase().includes('network') ||
        message.toLowerCase().includes('timeout'));

    return {
      status: 'error',
      message: isNetwork
        ? ERROR_MESSAGES.payment.razorpayNetworkError
        : String(message),
      code: sdkError.code,
    };
  }
}
