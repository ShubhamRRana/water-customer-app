import { getServiceClient } from "./supabase.ts";
import {
  extractTxnMeta,
  isPhonePeOrderPending,
  isPhonePeOrderSuccess,
} from "./phonepe.ts";

export async function applySuccessfulPayment(
  orderId: string,
  statusPayload: unknown,
): Promise<{ ok: boolean; reason?: string }> {
  if (!isPhonePeOrderSuccess(statusPayload)) {
    return { ok: false, reason: "not_success" };
  }
  const meta = extractTxnMeta(statusPayload);
  const admin = getServiceClient();

  const { data: tx, error: txErr } = await admin
    .from("payment_transactions")
    .select("id, user_id, subscription_id, amount, status, gateway_order_id")
    .eq("gateway_order_id", orderId)
    .maybeSingle();

  if (txErr || !tx) return { ok: false, reason: "transaction_not_found" };
  if (tx.status === "success") return { ok: true };

  if (!tx.subscription_id) {
    return { ok: false, reason: "missing_subscription" };
  }

  const { data: sub, error: subErr } = await admin
    .from("subscriptions")
    .select("id, plan_id, status")
    .eq("id", tx.subscription_id)
    .maybeSingle();

  if (subErr || !sub) return { ok: false, reason: "subscription_not_found" };

  const { data: plan, error: planErr } = await admin
    .from("subscription_plans")
    .select("duration_months")
    .eq("id", sub.plan_id)
    .single();

  if (planErr || !plan) return { ok: false, reason: "plan_not_found" };

  const start = new Date();
  const end = new Date(start);
  end.setMonth(end.getMonth() + Number(plan.duration_months));

  const { error: txUpdateErr } = await admin
    .from("payment_transactions")
    .update({
      status: "success",
      gateway_transaction_id: meta.txnId ?? null,
      gateway_response_code: meta.respCode ?? null,
      gateway_response_message: meta.respMsg ?? null,
      payment_method: meta.paymentMode ?? null,
      bank_name: meta.bankName ?? null,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", tx.id);

  if (txUpdateErr) return { ok: false, reason: "transaction_update_failed" };

  const { error: subUpdateErr } = await admin
    .from("subscriptions")
    .update({
      status: "active",
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sub.id);

  if (subUpdateErr) return { ok: false, reason: "subscription_update_failed" };

  return { ok: true };
}

export async function recordFailedPayment(
  orderId: string,
  statusPayload: unknown,
): Promise<void> {
  if (isPhonePeOrderSuccess(statusPayload)) return;
  if (isPhonePeOrderPending(statusPayload)) return;
  const meta = extractTxnMeta(statusPayload);
  const admin = getServiceClient();

  const { data: tx } = await admin
    .from("payment_transactions")
    .select("id, status")
    .eq("gateway_order_id", orderId)
    .maybeSingle();

  if (!tx || tx.status === "success") return;

  await admin
    .from("payment_transactions")
    .update({
      status: "failed",
      gateway_response_code: meta.respCode ?? null,
      gateway_response_message: meta.respMsg ?? null,
      payment_method: meta.paymentMode ?? null,
      bank_name: meta.bankName ?? null,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", tx.id);
}
