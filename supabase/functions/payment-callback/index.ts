/// <reference path="./deno.d.ts" />
import { applySuccessfulPayment, recordFailedPayment } from "../_shared/activation.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
  fetchOrderStatus,
  verifyFormCallbackChecksum,
  verifyJsonCallbackSignature,
} from "../_shared/paytm.ts";

function parseFlatFromBody(text: string): Record<string, string> {
  const flat: Record<string, string> = {};
  const params = new URLSearchParams(text);
  for (const [k, v] of params.entries()) {
    flat[k] = v;
  }
  return flat;
}

function extractOrderId(
  flat: Record<string, string> | undefined,
  json: unknown,
): string | null {
  if (flat?.ORDERID) return flat.ORDERID;
  if (flat?.orderId) return flat.orderId;
  if (json && typeof json === "object") {
    const j = json as Record<string, unknown>;
    const head = j.head as Record<string, unknown> | undefined;
    const body = j.body as Record<string, unknown> | undefined;
    if (body?.orderId) return String(body.orderId);
    if (j.orderId) return String(j.orderId);
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ct = req.headers.get("content-type") ?? "";
    let flat: Record<string, string> | undefined;
    let json: unknown;

    if (ct.includes("application/json")) {
      json = await req.json();
    } else {
      const text = await req.text();
      if (text.trim().startsWith("{")) {
        try {
          json = JSON.parse(text);
        } catch {
          flat = parseFlatFromBody(text);
        }
      } else {
        flat = parseFlatFromBody(text);
      }
    }

    const orderId = extractOrderId(flat, json);
    if (!orderId) {
      return new Response(JSON.stringify({ error: "Missing orderId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let checksumOk = true;
    let hadChecksum = false;
    if (flat?.CHECKSUMHASH) {
      hadChecksum = true;
      const checksum = flat.CHECKSUMHASH;
      const copy = { ...flat };
      delete copy.CHECKSUMHASH;
      checksumOk = await verifyFormCallbackChecksum(copy, checksum);
    } else if (
      json && typeof json === "object" &&
      (json as Record<string, unknown>).body &&
      (json as Record<string, unknown>).head
    ) {
      hadChecksum = true;
      const j = json as {
        body: Record<string, unknown>;
        head: { signature: string };
      };
      checksumOk = await verifyJsonCallbackSignature(
        j.body,
        j.head.signature,
      );
    }

    if (hadChecksum && !checksumOk) {
      return new Response(
        JSON.stringify({ error: "Checksum verification failed" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const statusPayload = await fetchOrderStatus(orderId);

    const applied = await applySuccessfulPayment(orderId, statusPayload);
    await recordFailedPayment(orderId, statusPayload);

    return new Response(
      JSON.stringify({
        ok: true,
        orderId,
        applied: applied.ok,
        orderStatus: statusPayload,
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
