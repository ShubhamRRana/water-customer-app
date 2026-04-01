/// <reference path="./deno.d.ts" />
import { corsHeaders } from "../_shared/cors.ts";
import {
  createPayment,
  fetchOrderStatus,
  getCallbackUrl,
  isPhonePeOrderSuccess,
  rupeesToPaisa,
} from "../_shared/phonepe.ts";
import { getUserFromRequest, getServiceClient } from "../_shared/supabase.ts";

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

    const user = await getUserFromRequest(req);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const orderId = typeof body.orderId === "string" ? body.orderId : null;
    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = getServiceClient();
    const { data: row, error } = await admin
      .from("payment_transactions")
      .select(
        "id, user_id, amount, status, gateway_order_id, subscription_id, metadata",
      )
      .eq("gateway_order_id", orderId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !row) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (row.status !== "pending" && row.status !== "processing") {
      return new Response(JSON.stringify({ error: "Invalid order state" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amountStr = Number(row.amount).toFixed(2);
    const amountPaisa = rupeesToPaisa(Number(row.amount));
    const callbackUrl = getCallbackUrl();

    let created: Awaited<ReturnType<typeof createPayment>>;
    try {
      created = await createPayment({
        merchantOrderId: orderId,
        amountPaisa,
        redirectUrl: callbackUrl,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("BAD_REQUEST") || msg.includes("400")) {
        try {
          const existing = await fetchOrderStatus(orderId);
          if (isPhonePeOrderSuccess(existing)) {
            return new Response(
              JSON.stringify({
                error: "Order already completed",
                orderStatus: existing,
                clientMeta: { orderId, amount: amountStr },
              }),
              {
                status: 409,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
          }
          return new Response(
            JSON.stringify({
              error:
                "Payment session exists; use Verify or wait and try again.",
              orderStatus: existing,
              clientMeta: { orderId, amount: amountStr },
              duplicateSession: true,
            }),
            {
              status: 409,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        } catch {
          throw e;
        }
      }
      throw e;
    }

    const meta = {
      ...(typeof row.metadata === "object" && row.metadata !== null
        ? (row.metadata as Record<string, unknown>)
        : {}),
      phonepeOrderId: created.phonepeOrderId ?? undefined,
    };
    await admin
      .from("payment_transactions")
      .update({
        metadata: meta,
        status: "processing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    const payload = {
      redirectUrl: created.redirectUrl,
      clientMeta: { orderId, amount: amountStr },
      phonepeOrderId: created.phonepeOrderId,
      state: created.state,
      raw: created.raw,
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
