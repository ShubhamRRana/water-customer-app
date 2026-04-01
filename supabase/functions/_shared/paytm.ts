// Paytm JSON APIs + paytmchecksum (merchant key never leaves the server).
import PaytmChecksum from "paytmchecksum";

export function getPaytmKeys() {
  const mid = Deno.env.get("PAYTM_MID") ?? "";
  const merchantKey = Deno.env.get("PAYTM_KEY") ?? "";
  const host =
    Deno.env.get("PAYTM_HOST") ?? "https://securegw-stage.paytm.in";
  if (!mid || !merchantKey) {
    throw new Error("Missing PAYTM_MID or PAYTM_KEY");
  }
  return { mid, merchantKey, host };
}

/** Full Paytm env including callback URL (required for initiate transaction only). */
export function getPaytmEnv() {
  const base = getPaytmKeys();
  const website = Deno.env.get("PAYTM_WEBSITE") ?? "DEFAULT";
  const callbackUrl = Deno.env.get("CALLBACK_URL") ?? "";
  if (!callbackUrl) {
    throw new Error(
      "Missing CALLBACK_URL (public URL of payment-callback Edge Function)",
    );
  }
  return { ...base, website, callbackUrl };
}

export async function initiateTransaction(params: {
  orderId: string;
  amount: string;
  custId: string;
}): Promise<unknown> {
  const { mid, merchantKey, website, host, callbackUrl } = getPaytmEnv();
  const body = {
    requestType: "Payment",
    mid,
    websiteName: website,
    orderId: params.orderId,
    callbackUrl,
    txnAmount: {
      value: params.amount,
      currency: "INR",
    },
    userInfo: {
      custId: params.custId,
    },
  };
  const signature = await PaytmChecksum.generateSignature(
    JSON.stringify(body),
    merchantKey,
  );
  const payload = {
    body,
    head: { signature },
  };
  const url =
    `${host}/theia/api/v1/initiateTransaction?mid=${encodeURIComponent(mid)}&orderId=${encodeURIComponent(params.orderId)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

export async function fetchOrderStatus(orderId: string): Promise<unknown> {
  const { mid, merchantKey, host } = getPaytmKeys();
  const body = {
    mid,
    orderId,
  };
  const signature = await PaytmChecksum.generateSignature(
    JSON.stringify(body),
    merchantKey,
  );
  const payload = {
    body,
    head: { signature },
  };
  const url = `${host}/v3/order/status`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

/** Verify Paytm form-style callback (CHECKSUMHASH + flat fields). */
export async function verifyFormCallbackChecksum(
  params: Record<string, string>,
  checksum: string,
): Promise<boolean> {
  const { merchantKey } = getPaytmKeys();
  return await PaytmChecksum.verifySignature(params, merchantKey, checksum);
}

/** Verify JSON API style callback (signature over stringified body). */
export async function verifyJsonCallbackSignature(
  body: Record<string, unknown>,
  signature: string,
): Promise<boolean> {
  const { merchantKey } = getPaytmKeys();
  return await PaytmChecksum.verifySignature(
    JSON.stringify(body),
    merchantKey,
    signature,
  );
}

/** True when Paytm still reports an in-flight payment (do not mark failed). */
export function isPaytmTxnPending(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const root = data as Record<string, unknown>;
  const body = (root.body ?? root) as Record<string, unknown>;
  const resultInfo = body.resultInfo as Record<string, unknown> | undefined;
  const status = String(resultInfo?.resultStatus ?? "").toUpperCase();
  const msg = String(resultInfo?.resultMsg ?? "").toUpperCase();
  if (status === "PENDING" || status === "P") return true;
  if (msg.includes("PENDING")) return true;
  const legacyStatus = String(body.STATUS ?? "").toUpperCase();
  return legacyStatus === "PENDING";
}

/** Normalize Paytm order-status / callback payloads for success detection. */
export function isPaytmTxnSuccess(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const root = data as Record<string, unknown>;
  const body = (root.body ?? root) as Record<string, unknown>;
  const resultInfo = body.resultInfo as Record<string, unknown> | undefined;
  if (!resultInfo) return false;
  const status = String(resultInfo.resultStatus ?? resultInfo.resultCode ?? "")
    .toUpperCase();
  const msg = String(resultInfo.resultMsg ?? "").toUpperCase();
  if (status === "TXN_SUCCESS" || msg.includes("TXN SUCCESS")) return true;
  if (status === "S" && (msg.includes("SUCCESS") || msg === "")) return true;
  const legacyStatus = String(body.STATUS ?? "").toUpperCase();
  return legacyStatus === "TXN_SUCCESS";
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
  const body = (root.body ?? root) as Record<string, unknown>;
  const resultInfo = body.resultInfo as Record<string, unknown> | undefined;
  return {
    txnId: (body.txnId ?? body.TXNID) as string | undefined,
    orderId: (body.orderId ?? body.ORDERID) as string | undefined,
    amount: (body.txnAmount ?? body.TXNAMOUNT) as string | undefined,
    paymentMode: (body.paymentMode ?? body.PAYMENTMODE) as string | undefined,
    bankName: (body.bankName ?? body.BANKNAME) as string | undefined,
    respCode: resultInfo?.resultCode != null
      ? String(resultInfo.resultCode)
      : (body.RESPONSECODE as string | undefined),
    respMsg: resultInfo?.resultMsg != null
      ? String(resultInfo.resultMsg)
      : (body.RESPMSG as string | undefined),
  };
}
