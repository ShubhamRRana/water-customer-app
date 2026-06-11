import { getServiceClient } from "./supabase.ts";

export type ProvisionTrialResult =
  | { status: "created"; subscriptionId: string; trialEndDate: string }
  | { status: "already_provisioned"; subscriptionId: string; trialEndDate: string }
  | { status: "ineligible"; reason: string };

/** Calendar month arithmetic (e.g. Jan 31 → Feb 28/29). */
export function addCalendarMonth(date: Date): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  return d;
}

export async function assertCustomerUser(userId: string): Promise<{
  accountKind: string;
  createdAt: Date;
}> {
  const admin = getServiceClient();

  const { data: roleRow, error: roleError } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "customer")
    .maybeSingle();

  if (roleError || !roleRow) {
    throw new Error("Only customer accounts can use this endpoint");
  }

  const { data: userRow, error: userError } = await admin
    .from("users")
    .select("created_at")
    .eq("id", userId)
    .single();

  if (userError || !userRow?.created_at) {
    throw new Error("User not found");
  }

  const { data: customerRow } = await admin
    .from("customers")
    .select("account_kind")
    .eq("user_id", userId)
    .maybeSingle();

  const accountKind = customerRow?.account_kind ?? "individual";

  return {
    accountKind,
    createdAt: new Date(userRow.created_at),
  };
}

export async function provisionTrialSubscription(
  userId: string
): Promise<ProvisionTrialResult> {
  const admin = getServiceClient();
  const { accountKind, createdAt } = await assertCustomerUser(userId);

  const trialEnd = addCalendarMonth(createdAt);
  const now = new Date();

  if (now > trialEnd) {
    return { status: "ineligible", reason: "trial_window_ended" };
  }

  const { data: existingSubs } = await admin
    .from("subscriptions")
    .select("id, is_trial, status, end_date, trial_end_date")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (existingSubs?.some((s) => s.is_trial === true)) {
    const trial = existingSubs.find((s) => s.is_trial === true)!;
    return {
      status: "already_provisioned",
      subscriptionId: trial.id,
      trialEndDate: trial.trial_end_date ?? trial.end_date ?? trialEnd.toISOString(),
    };
  }

  const { data: paidTx } = await admin
    .from("payment_transactions")
    .select("id, metadata")
    .eq("user_id", userId)
    .eq("status", "success")
    .limit(20);

  const hasPaidSubscription = (paidTx ?? []).some((row) => {
    const meta = row.metadata as Record<string, unknown> | null;
    return meta?.flow === "customer_subscription";
  });

  if (hasPaidSubscription) {
    return { status: "ineligible", reason: "already_paid_subscriber" };
  }

  const { data: plan, error: planError } = await admin
    .from("subscription_plans")
    .select("id")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (planError || !plan) {
    throw new Error("No active subscription plan available for trial");
  }

  const startIso = createdAt.toISOString();
  const endIso = trialEnd.toISOString();

  const { data: inserted, error: insertError } = await admin
    .from("subscriptions")
    .insert({
      user_id: userId,
      plan_id: plan.id,
      status: "active",
      is_trial: true,
      start_date: startIso,
      trial_end_date: endIso,
      end_date: endIso,
      auto_renew: false,
    })
    .select("id, trial_end_date")
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return {
    status: "created",
    subscriptionId: inserted.id,
    trialEndDate: inserted.trial_end_date ?? endIso,
  };
}

export async function hasActiveTrial(userId: string): Promise<boolean> {
  const admin = getServiceClient();
  const now = new Date().toISOString();
  const { data } = await admin
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .eq("is_trial", true)
    .eq("status", "active")
    .gt("end_date", now)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

export interface ActivateSubscriptionParams {
  subscriptionId: string;
  userId: string;
  orderId: string;
  paymentId: string;
  paymentMethod?: string | null;
  bankName?: string | null;
}

export async function activateSubscriptionPayment(
  params: ActivateSubscriptionParams
): Promise<{ alreadyCompleted: boolean }> {
  const admin = getServiceClient();

  const { data: tx, error: txError } = await admin
    .from("payment_transactions")
    .select("id, status, subscription_id, user_id")
    .eq("gateway_order_id", params.orderId)
    .maybeSingle();

  if (txError || !tx) {
    throw new Error("Payment transaction not found");
  }
  if (tx.user_id !== params.userId) {
    throw new Error("Unauthorized payment transaction");
  }
  if (tx.subscription_id && tx.subscription_id !== params.subscriptionId) {
    throw new Error("Subscription mismatch");
  }

  if (tx.status === "success") {
    return { alreadyCompleted: true };
  }

  const now = new Date().toISOString();

  await admin
    .from("payment_transactions")
    .update({
      status: "success",
      gateway_transaction_id: params.paymentId,
      payment_method: params.paymentMethod ?? null,
      bank_name: params.bankName ?? null,
      completed_at: now,
      updated_at: now,
    })
    .eq("id", tx.id);

  const { data: sub, error: subError } = await admin
    .from("subscriptions")
    .select("id, plan_id, user_id")
    .eq("id", params.subscriptionId)
    .single();

  if (subError || !sub || sub.user_id !== params.userId) {
    throw new Error("Subscription not found");
  }

  const { data: plan, error: planError } = await admin
    .from("subscription_plans")
    .select("duration_months")
    .eq("id", sub.plan_id)
    .single();

  if (planError || !plan) {
    throw new Error("Plan not found");
  }

  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + Number(plan.duration_months));

  await admin
    .from("subscriptions")
    .update({
      status: "active",
      is_trial: false,
      trial_end_date: null,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      updated_at: now,
    })
    .eq("id", params.subscriptionId);

  return { alreadyCompleted: false };
}

export interface CompleteBookingParams {
  bookingId: string;
  userId: string;
  orderId: string;
  paymentId: string;
  paymentMethod?: string | null;
  bankName?: string | null;
}

export async function completeBookingPayment(
  params: CompleteBookingParams
): Promise<{ alreadyCompleted: boolean }> {
  const admin = getServiceClient();

  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .select("id, customer_id, payment_status, payment_id")
    .eq("id", params.bookingId)
    .single();

  if (bookingError || !booking) {
    throw new Error("Booking not found");
  }
  if (booking.customer_id !== params.userId) {
    throw new Error("Unauthorized booking");
  }

  if (booking.payment_status === "completed") {
    return { alreadyCompleted: true };
  }

  const now = new Date().toISOString();

  await admin
    .from("bookings")
    .update({
      payment_status: "completed",
      payment_id: params.paymentId,
      updated_at: now,
    })
    .eq("id", params.bookingId);

  const { data: tx } = await admin
    .from("payment_transactions")
    .select("id, status")
    .eq("gateway_order_id", params.orderId)
    .maybeSingle();

  if (tx) {
    if (tx.status !== "success") {
      await admin
        .from("payment_transactions")
        .update({
          status: "success",
          gateway_transaction_id: params.paymentId,
          payment_method: params.paymentMethod ?? null,
          bank_name: params.bankName ?? null,
          completed_at: now,
          updated_at: now,
        })
        .eq("id", tx.id);
    }
  }

  return { alreadyCompleted: false };
}

export async function failPaymentTransaction(
  orderId: string,
  paymentId: string,
  message?: string
): Promise<void> {
  const admin = getServiceClient();
  const now = new Date().toISOString();
  await admin
    .from("payment_transactions")
    .update({
      status: "failed",
      gateway_transaction_id: paymentId,
      gateway_response_message: message ?? null,
      completed_at: now,
      updated_at: now,
    })
    .eq("gateway_order_id", orderId)
    .neq("status", "success");
}

export async function failBookingPayment(
  bookingId: string,
  paymentId: string
): Promise<void> {
  const admin = getServiceClient();
  const now = new Date().toISOString();
  await admin
    .from("bookings")
    .update({
      payment_status: "failed",
      payment_id: paymentId,
      updated_at: now,
    })
    .eq("id", bookingId)
    .neq("payment_status", "completed");
}
