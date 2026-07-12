// supabase/functions/delete-auth-user-on-account-deletion/index.ts
/// <reference path="./deno.d.ts" />
import { createClient } from "@supabase/supabase-js";
import { getPublishableKey, getSecretKey } from "../_shared/keys.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    let userId: string | undefined;

    // Accept Database Webhook payload (when configured in Supabase Dashboard)
    if (payload?.type === "DELETE" && payload?.table === "users" && payload?.schema === "public") {
      userId = payload.old_record?.id;
    }
    // Accept direct app call: { user_id: "..." } — self-delete or admin deleting another user
    else if (payload?.user_id && typeof payload.user_id === "string") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Authorization required" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const token = authHeader.slice(7);
      const supabaseAuth = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        getPublishableKey(),
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      );
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const isSelf = user.id === payload.user_id;
      if (!isSelf) {
        const { data: roles, error: rolesError } = await supabaseAuth
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin");
        if (rolesError || !roles || roles.length === 0) {
          return new Response(JSON.stringify({ error: "Unauthorized: can only delete own auth user" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      userId = payload.user_id;
    } else {
      return new Response(JSON.stringify({ error: "Invalid payload: use webhook format or { user_id }" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing user id in payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      getSecretKey(),
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Clear society rows first so Auth cascade + period trigger cannot block deletion
    for (const table of [
      "society_trips",
      "society_payment_transactions",
      "society_payment_periods_completed",
    ]) {
      const { error: societyError } = await supabaseAdmin
        .from(table)
        .delete()
        .eq("customer_id", userId);
      if (societyError) {
        console.error(`Failed to delete ${table}:`, societyError);
        return new Response(JSON.stringify({ error: societyError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      // Idempotent: already removed is success
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("not found") || msg.includes("user not found")) {
        return new Response(JSON.stringify({ success: true, alreadyDeleted: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("Failed to delete auth user:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
