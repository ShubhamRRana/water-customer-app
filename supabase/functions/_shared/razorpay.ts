const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
}

export interface CreateOrderParams {
  amountPaise: number;
  currency?: string;
  receipt: string;
  notes: Record<string, string>;
  transfers?: Array<{ account: string; amount: number; currency: string }>;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  notes: Record<string, string>;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message)
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function getRazorpayConfig(): RazorpayConfig {
  const keyId = Deno.env.get("RAZORPAY_KEY_ID") ?? "";
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";
  const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") ?? "";
  if (!keyId || !keySecret) {
    throw new Error("Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET");
  }
  return { keyId, keySecret, webhookSecret };
}

function basicAuthHeader(keyId: string, keySecret: string): string {
  const token = btoa(`${keyId}:${keySecret}`);
  return `Basic ${token}`;
}

export async function createOrder(params: CreateOrderParams): Promise<RazorpayOrder> {
  const { keyId, keySecret } = getRazorpayConfig();
  const body: Record<string, unknown> = {
    amount: params.amountPaise,
    currency: params.currency ?? "INR",
    receipt: params.receipt,
    notes: params.notes,
  };
  if (params.transfers?.length) {
    body.transfers = params.transfers;
  }

  const res = await fetch(`${RAZORPAY_API_BASE}/orders`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(keyId, keySecret),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = (data as { error?: { description?: string } })?.error?.description ??
      "Razorpay order creation failed";
    throw new Error(msg);
  }
  return data as RazorpayOrder;
}

export async function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): Promise<boolean> {
  const { keySecret } = getRazorpayConfig();
  const expected = await hmacSha256Hex(keySecret, `${orderId}|${paymentId}`);
  return timingSafeEqual(expected, signature);
}

export async function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): Promise<boolean> {
  const { webhookSecret } = getRazorpayConfig();
  if (!webhookSecret) {
    throw new Error("Missing RAZORPAY_WEBHOOK_SECRET");
  }
  if (!signatureHeader) return false;
  const expected = await hmacSha256Hex(webhookSecret, rawBody);
  return timingSafeEqual(expected, signatureHeader);
}

/** Convert INR rupees from DB numeric to Razorpay paise. */
export function rupeesToPaise(rupees: number): number {
  return Math.round(Number(rupees) * 100);
}
