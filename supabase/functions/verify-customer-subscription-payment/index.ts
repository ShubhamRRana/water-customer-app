import { activateSubscriptionPayment } from "../_shared/activation.ts";
import { errorResponse, handleCors, jsonResponse } from "../_shared/http.ts";
import { verifyPaymentSignature } from "../_shared/razorpay.ts";
import { getServiceClient, getUserFromRequest } from "../_shared/supabase.ts";

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    const user = await getUserFromRequest(req);
    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    const body = await req.json().catch(() => ({}));
    const subscriptionId = typeof body.subscriptionId === "string"
      ? body.subscriptionId
      : null;
    const orderId = typeof body.razorpay_order_id === "string"
      ? body.razorpay_order_id
      : null;
    const paymentId = typeof body.razorpay_payment_id === "string"
      ? body.razorpay_payment_id
      : null;
    const signature = typeof body.razorpay_signature === "string"
      ? body.razorpay_signature
      : null;

    if (!subscriptionId || !orderId || !paymentId || !signature) {
      return errorResponse("Missing required verify fields", 400);
    }

    const valid = await verifyPaymentSignature(orderId, paymentId, signature);
    if (!valid) {
      return errorResponse("Invalid payment signature", 400, {
        code: "signature_mismatch",
      });
    }

    const admin = getServiceClient();
    const { data: tx } = await admin
      .from("payment_transactions")
      .select("metadata")
      .eq("gateway_order_id", orderId)
      .eq("user_id", user.id)
      .maybeSingle();

    const flow = (tx?.metadata as Record<string, unknown> | null)?.flow;
    if (flow && flow !== "customer_subscription") {
      return errorResponse("Invalid payment flow", 400);
    }

    const result = await activateSubscriptionPayment({
      subscriptionId,
      userId: user.id,
      orderId,
      paymentId,
    });

    return jsonResponse({
      success: true,
      alreadyCompleted: result.alreadyCompleted,
      subscriptionId,
    });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Internal error";
    return errorResponse(message, 500);
  }
});
