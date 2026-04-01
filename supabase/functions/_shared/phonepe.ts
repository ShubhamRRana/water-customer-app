/**
 * PhonePe Payment Gateway Standard Checkout v2 (OAuth + Create Payment + Order Status).
 * Credentials never leave the Edge runtime.
 */

type PhonePeEnv = "sandbox" | "production";

function getEnvMode(): PhonePeEnv {
  const raw = (Deno.env.get("PHONEPE_ENV") ?? "sandbox").toLowerCase();
  return raw === "production" || raw === "prod" ? "production" : "sandbox";
}

export function getPhonePeEndpoints() {
  const mode = getEnvMode();
  if (mode === "production") {
    return {
      oauthUrl: "https://api.phonepe.com/apis/identity-manager/v1/oauth/token",
      checkoutBase: "https://api.phonepe.com/apis/pg/checkout/v2",
    };
  }
  return {
    oauthUrl: "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token",
    checkoutBase: "https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2",
  };
}

function getClientCreds() {
  const clientId = Deno.env.get("PHONEPE_CLIENT_ID") ?? "";
  const clientSecret = Deno.env.get("PHONEPE_CLIENT_SECRET") ?? "";
  const clientVersion = Deno.env.get("PHONEPE_CLIENT_VERSION") ?? "";
  if (!clientId || !clientSecret || !clientVersion) {
    throw new Error(
      "Missing PHONEPE_CLIENT_ID, PHONEPE_CLIENT_SECRET, or PHONEPE_CLIENT_VERSION",
    );
  }
  return { clientId, clientSecret, clientVersion };
}

function getCallbackUrl() {
  const callbackUrl = Deno.env.get("CALLBACK_URL") ?? "";
  if (!callbackUrl) {
    throw new Error(
      "Missing CALLBACK_URL (public URL of payment-callback Edge Function)",
    );
  }
  return callbackUrl;
}

/** Optional X-MERCHANT-ID for partner / dashboard-configured integrations */
function merchantIdHeader(): Record<string, string> {
  const mid = Deno.env.get("PHONEPE_MERCHANT_ID") ?? "";
  return mid ? { "X-MERCHANT-ID": mid } : {};
}

let cachedAccessToken: string | null = null;
let cachedExpiresAtSec = 0;

async function fetchAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && now < cachedExpiresAtSec - 120) {
    return cachedAccessToken;
  }
  const { clientId, clientSecret, clientVersion } = getClientCreds();
  const { oauthUrl } = getPhonePeEndpoints();
  const body = new URLSearchParams({
    client_id: clientId,
    client_version: clientVersion,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  });
  const res = await fetch(oauthUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      `PhonePe OAuth failed: ${res.status} ${JSON.stringify(json)}`,
    );
  }
  const token = json.access_token;
  if (typeof token !== "string" || !token) {
    throw new Error("PhonePe OAuth: missing access_token");
  }
  const exp = json.expires_at;
  cachedExpiresAtSec = typeof exp === "number" ? exp : now + 3600;
  cachedAccessToken = token;
  return token;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await fetchAccessToken();
  return {
    "Content-Type": "application/json",
    Authorization: `O-Bearer ${token}`,
    ...merchantIdHeader(),
  };
}

/** Rupees (e.g. 299.00) → paisa integer */
export function rupeesToPaisa(rupees: number): number {
  return Math.round(rupees * 100);
}

export interface CreatePaymentResult {
  redirectUrl: string;
  phonepeOrderId?: string;
  state?: string;
  raw: unknown;
}

export async function createPayment(params: {
  merchantOrderId: string;
  amountPaisa: number;
  redirectUrl: string;
}): Promise<CreatePaymentResult> {
  const { checkoutBase } = getPhonePeEndpoints();
  const url = `${checkoutBase}/pay`;
  const headers = await authHeaders();
  const body = {
    merchantOrderId: params.merchantOrderId,
    amount: params.amountPaisa,
    paymentFlow: {
      type: "PG_CHECKOUT",
      message: "Subscription payment",
      merchantUrls: {
        redirectUrl: params.redirectUrl,
      },
    },
  };
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      `PhonePe create payment failed: ${res.status} ${JSON.stringify(json)}`,
    );
  }
  const rec = json as Record<string, unknown>;
  const redirectUrl = rec.redirectUrl;
  if (typeof redirectUrl !== "string" || !redirectUrl) {
    throw new Error(
      `PhonePe create payment: missing redirectUrl ${JSON.stringify(json)}`,
    );
  }
  const phonepeOrderId =
    typeof rec.orderId === "string" ? rec.orderId : undefined;
  const state = typeof rec.state === "string" ? rec.state : undefined;
  return { redirectUrl, phonepeOrderId, state, raw: json };
}

export async function fetchOrderStatus(
  merchantOrderId: string,
): Promise<unknown> {
  const { checkoutBase } = getPhonePeEndpoints();
  const path = `/order/${encodeURIComponent(merchantOrderId)}/status`;
  const url = `${checkoutBase}${path}?details=false&errorContext=false`;
  const headers = await authHeaders();
  const res = await fetch(url, { method: "GET", headers });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      `PhonePe order status failed: ${res.status} ${JSON.stringify(json)}`,
    );
  }
  return json;
}

export function isPhonePeOrderPending(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const state = String((data as Record<string, unknown>).state ?? "")
    .toUpperCase();
  return state === "PENDING";
}

export function isPhonePeOrderSuccess(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const state = String((data as Record<string, unknown>).state ?? "")
    .toUpperCase();
  return state === "COMPLETED";
}

export function isPhonePeOrderFailed(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const state = String((data as Record<string, unknown>).state ?? "")
    .toUpperCase();
  return state === "FAILED";
}

export function extractTxnMeta(data: unknown): {
  txnId?: string;
  orderId?: string;
  amount?: string;
  paymentMode?: string;
  bankName?: string;
  respCode?: string;
  respMsg?: string;
} {
  if (!data || typeof data !== "object") return {};
  const root = data as Record<string, unknown>;
  const details = Array.isArray(root.paymentDetails)
    ? (root.paymentDetails[0] as Record<string, unknown> | undefined)
    : undefined;
  const txnId = details?.transactionId != null
    ? String(details.transactionId)
    : undefined;
  const merchantOrderId = root.merchantOrderId != null
    ? String(root.merchantOrderId)
    : undefined;
  const phonepeOrderId = root.orderId != null
    ? String(root.orderId)
    : undefined;
  const paymentMode = details?.paymentMode != null
    ? String(details.paymentMode)
    : undefined;
  const errCtx = root.errorContext as Record<string, unknown> | undefined;
  const respMsgFromCtx = errCtx?.description != null
    ? String(errCtx.description)
    : undefined;
  const respCode = details?.errorCode != null
    ? String(details.errorCode)
    : (root.errorCode != null ? String(root.errorCode) : undefined);
  const respMsg = details?.errorCode != null
    ? String(details.detailedErrorCode ?? details.errorCode)
    : respMsgFromCtx;

  return {
    txnId,
    orderId: merchantOrderId ?? phonepeOrderId,
    amount: root.amount != null ? String(root.amount) : undefined,
    paymentMode,
    bankName: undefined,
    respCode,
    respMsg: respMsg ?? respMsgFromCtx,
  };
}

export { getCallbackUrl };
