import { provisionTrialSubscription } from "../_shared/activation.ts";
import { errorResponse, handleCors, jsonResponse } from "../_shared/http.ts";
import { getUserFromRequest } from "../_shared/supabase.ts";

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

    const result = await provisionTrialSubscription(user.id);

    if (result.status === "ineligible") {
      return jsonResponse({ success: false, reason: result.reason }, 200);
    }

    return jsonResponse({
      success: true,
      subscriptionId: result.subscriptionId,
      trialEndDate: result.trialEndDate,
      alreadyProvisioned: result.status === "already_provisioned",
    });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Internal error";
    return errorResponse(message, 500);
  }
});
