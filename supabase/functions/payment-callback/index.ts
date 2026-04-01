/// <reference path="./deno.d.ts" />
import { applySuccessfulPayment, recordFailedPayment } from "../_shared/activation.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { fetchOrderStatus } from "../_shared/phonepe.ts";

function htmlResponse(title: string, message: string): Response {
  const body = `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title></head>
<body style="font-family:system-ui,sans-serif;padding:24px;background:#0f1115;color:#e8eaed;">
<p>${message}</p>
<p style="color:#9aa0a6;font-size:14px;">You can return to the app.</p>
</body></html>`;
  return new Response(body, {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
}

function extractMerchantOrderIdFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const q = u.searchParams;
    return (
      q.get("merchantOrderId") ??
      q.get("merchant_order_id") ??
      q.get("orderId") ??
      null
    );
  } catch {
    return null;
  }
}

async function processOrder(
  merchantOrderId: string,
): Promise<{ orderId: string; applied: boolean; orderStatus: unknown }> {
  const statusPayload = await fetchOrderStatus(merchantOrderId);
  const applied = await applySuccessfulPayment(merchantOrderId, statusPayload);
  await recordFailedPayment(merchantOrderId, statusPayload);
  return {
    orderId: merchantOrderId,
    applied: applied.ok,
    orderStatus: statusPayload,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method === "GET") {
      const merchantOrderId =
        extractMerchantOrderIdFromUrl(req.url) ??
        new URL(req.url).searchParams.get("orderId");
      if (!merchantOrderId) {
        return htmlResponse(
          "Payment",
          "Missing order reference. Return to the app and tap Verify.",
        );
      }
      const result = await processOrder(merchantOrderId);
      const msg = result.applied
        ? "Payment confirmed. Return to the app."
        : "Processing payment. Return to the app and tap Verify if needed.";
      return htmlResponse("Payment", msg);
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ct = req.headers.get("content-type") ?? "";
    let merchantOrderId: string | null = null;

    if (ct.includes("application/json")) {
      const json = (await req.json()) as Record<string, unknown>;
      merchantOrderId =
        (typeof json.merchantOrderId === "string"
          ? json.merchantOrderId
          : null) ??
        (typeof json.orderId === "string" ? json.orderId : null) ??
        (json.payload &&
            typeof json.payload === "object" &&
            json.payload !== null
          ? String(
              (json.payload as Record<string, unknown>).merchantOrderId ?? "",
            ) || null
          : null);
    } else {
      const text = await req.text();
      if (text.trim().startsWith("{")) {
        try {
          const json = JSON.parse(text) as Record<string, unknown>;
          merchantOrderId =
            typeof json.merchantOrderId === "string"
              ? json.merchantOrderId
              : typeof json.orderId === "string"
              ? json.orderId
              : null;
        } catch {
          merchantOrderId = extractMerchantOrderIdFromUrl(
            `https://x/?${text}`,
          );
        }
      } else {
        merchantOrderId = extractMerchantOrderIdFromUrl(
          `https://x/?${text}`,
        );
      }
    }

    if (!merchantOrderId) {
      return new Response(JSON.stringify({ error: "Missing merchantOrderId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await processOrder(merchantOrderId);

    return new Response(
      JSON.stringify({
        ok: true,
        orderId: result.orderId,
        applied: result.applied,
        orderStatus: result.orderStatus,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
