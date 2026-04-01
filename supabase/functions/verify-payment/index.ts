/// <reference path="./deno.d.ts" />
import { applySuccessfulPayment, recordFailedPayment } from "../_shared/activation.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { fetchOrderStatus } from "../_shared/paytm.ts";
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
      .select("id, user_id, gateway_order_id")
      .eq("gateway_order_id", orderId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !row) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const statusPayload = await fetchOrderStatus(orderId);
    const applied = await applySuccessfulPayment(orderId, statusPayload);
    await recordFailedPayment(orderId, statusPayload);

    return new Response(
      JSON.stringify({
        orderId,
        orderStatus: statusPayload,
        applied: applied.ok,
        reason: applied.reason,
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
