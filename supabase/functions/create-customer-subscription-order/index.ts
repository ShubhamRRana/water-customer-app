import {
  assertCustomerUser,
  hasActiveTrial,
} from "../_shared/activation.ts";
import { errorResponse, handleCors, jsonResponse } from "../_shared/http.ts";
import {
  createOrder,
  getRazorpayConfig,
  rupeesToPaise,
} from "../_shared/razorpay.ts";
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
    const planId = typeof body.planId === "string" ? body.planId : null;

    if (!subscriptionId || !planId) {
      return errorResponse("subscriptionId and planId are required", 400);
    }

    if (await hasActiveTrial(user.id)) {
      return errorResponse(
        "Active free trial in progress; paid checkout is not available yet",
        409,
        { code: "trial_active" }
      );
    }

    const { accountKind } = await assertCustomerUser(user.id);
    const admin = getServiceClient();

    const { data: sub, error: subError } = await admin
      .from("subscriptions")
      .select("id, user_id, plan_id, status")
      .eq("id", subscriptionId)
      .single();

    if (subError || !sub) {
      return errorResponse("Subscription not found", 404);
    }
    if (sub.user_id !== user.id) {
      return errorResponse("Unauthorized", 403);
    }
    if (sub.plan_id !== planId) {
      return errorResponse("Plan does not match subscription", 400);
    }
    if (sub.status !== "pending" && sub.status !== "expired") {
      return errorResponse("Subscription is not eligible for payment", 400);
    }

    const { data: plan, error: planError } = await admin
      .from("subscription_plans")
      .select("id, price, currency, is_active")
      .eq("id", planId)
      .eq("is_active", true)
      .single();

    if (planError || !plan) {
      return errorResponse("Plan not found", 404);
    }

    const amountPaise = rupeesToPaise(Number(plan.price));
    const currency = (plan.currency as string) || "INR";
    const receipt = `sub_${subscriptionId.slice(0, 8)}_${Date.now()}`;

    const order = await createOrder({
      amountPaise,
      currency,
      receipt,
      notes: {
        subscription_id: subscriptionId,
        plan_id: planId,
        user_id: user.id,
        account_kind: accountKind,
        flow: "customer_subscription",
      },
    });

    const { error: txError } = await admin.from("payment_transactions").insert({
      user_id: user.id,
      subscription_id: subscriptionId,
      amount: Number(plan.price),
      currency,
      payment_gateway: "razorpay",
      gateway_order_id: order.id,
      status: "pending",
      metadata: {
        flow: "customer_subscription",
        plan_id: planId,
        account_kind: accountKind,
      },
    });

    if (txError) {
      throw new Error(txError.message);
    }

    const { keyId } = getRazorpayConfig();

    return jsonResponse({
      orderId: order.id,
      amount: amountPaise,
      currency,
      keyId,
    });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Internal error";
    return errorResponse(message, 500);
  }
});
