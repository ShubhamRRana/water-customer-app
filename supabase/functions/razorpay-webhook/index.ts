import {
  activateSubscriptionPayment,
  completeBookingPayment,
  failBookingPayment,
  failPaymentTransaction,
} from "../_shared/activation.ts";
import { errorResponse, handleCors, jsonResponse } from "../_shared/http.ts";
import { verifyWebhookSignature } from "../_shared/razorpay.ts";
import { getServiceClient } from "../_shared/supabase.ts";

interface RazorpayWebhookPayload {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        method?: string;
        bank?: string;
        error_description?: string;
        notes?: Record<string, string>;
      };
    };
  };
}

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    const rawBody = await req.text();
    const signature = req.headers.get("X-Razorpay-Signature");

    let valid = false;
    try {
      valid = await verifyWebhookSignature(rawBody, signature);
    } catch (sigError) {
      const msg = sigError instanceof Error ? sigError.message : "";
      if (msg.includes("RAZORPAY_WEBHOOK_SECRET")) {
        return errorResponse(
          "Webhook secret not configured in Supabase secrets",
          503,
          { code: "webhook_not_configured" }
        );
      }
      throw sigError;
    }
    if (!valid) {
      return errorResponse("Invalid webhook signature", 401);
    }

    const payload = JSON.parse(rawBody) as RazorpayWebhookPayload;
    const event = payload.event ?? "";
    const payment = payload.payload?.payment?.entity;

    if (!payment?.id || !payment.order_id) {
      return jsonResponse({ received: true, skipped: "no_payment_entity" });
    }

    const admin = getServiceClient();
    const { data: existingTx } = await admin
      .from("payment_transactions")
      .select("id, status, metadata, subscription_id, user_id")
      .eq("gateway_order_id", payment.order_id)
      .maybeSingle();

    if (existingTx?.status === "success" && event === "payment.captured") {
      return jsonResponse({ received: true, alreadyProcessed: true });
    }

    const notes = payment.notes ?? {};
    const flow = notes.flow ??
      (existingTx?.metadata as Record<string, unknown> | null)?.flow;

    if (event === "payment.captured") {
      if (flow === "customer_subscription") {
        const subscriptionId = notes.subscription_id ??
          (existingTx?.subscription_id as string | undefined);
        const userId = notes.user_id ?? (existingTx?.user_id as string | undefined);
        if (subscriptionId && userId) {
          await activateSubscriptionPayment({
            subscriptionId,
            userId,
            orderId: payment.order_id,
            paymentId: payment.id,
            paymentMethod: payment.method ?? null,
            bankName: payment.bank ?? null,
          });
        }
      } else if (flow === "customer_booking") {
        const bookingId = notes.booking_id;
        const userId = notes.customer_id ?? (existingTx?.user_id as string | undefined);
        if (bookingId && userId) {
          await completeBookingPayment({
            bookingId,
            userId,
            orderId: payment.order_id,
            paymentId: payment.id,
            paymentMethod: payment.method ?? null,
            bankName: payment.bank ?? null,
          });
        }
      }
    } else if (event === "payment.failed") {
      await failPaymentTransaction(
        payment.order_id,
        payment.id,
        payment.error_description
      );
      if (flow === "customer_booking" && notes.booking_id) {
        await failBookingPayment(notes.booking_id, payment.id);
      }
    }

    return jsonResponse({ received: true });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Internal error";
    return errorResponse(message, 500);
  }
});
