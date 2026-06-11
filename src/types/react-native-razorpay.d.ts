declare module 'react-native-razorpay' {
  interface RazorpayOpenOptions {
    key: string;
    order_id: string;
    amount: number;
    currency: string;
    name?: string;
    description?: string;
    prefill?: { email?: string; contact?: string; name?: string };
    theme?: { color?: string };
  }

  interface RazorpayOpenResult {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }

  const RazorpayCheckout: {
    open(options: RazorpayOpenOptions): Promise<RazorpayOpenResult>;
  };

  export default RazorpayCheckout;
}
