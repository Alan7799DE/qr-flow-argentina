import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "DELETE" && req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { user_id: targetUserId } = await req.json();
    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const isSelf = user.id === targetUserId;

    if (!isSelf) {
      const { data: roleData } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: targetRole } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", targetUserId)
        .eq("role", "admin")
        .maybeSingle();

      if (targetRole) {
        return new Response(
          JSON.stringify({ error: "No se puede eliminar a otro administrador" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fetch target user info for the log
    const { data: targetProfile } = await adminClient
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", targetUserId)
      .maybeSingle();

    // Count QRs
    const { count: qrCount } = await adminClient
      .from("qr_codes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", targetUserId);

    // Log the deletion before deleting data
    await adminClient.from("deleted_users_log").insert({
      user_id: targetUserId,
      email: targetProfile?.email || "unknown",
      full_name: targetProfile?.full_name || null,
      qr_count: qrCount || 0,
      deleted_by: user.id,
      deleted_by_email: user.email || "unknown",
      reason: isSelf ? "self_delete" : "admin_delete",
    });

    // Cancel MercadoPago subscription if exists
    const { data: subscription } = await adminClient
      .from("subscriptions")
      .select("mercadopago_preapproval_id, status")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (subscription?.mercadopago_preapproval_id && subscription.status === "active") {
      const mpToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
      if (mpToken) {
        try {
          const mpResponse = await fetch(
            `https://api.mercadopago.com/preapproval/${subscription.mercadopago_preapproval_id}`,
            {
              method: "PUT",
              headers: {
                "Authorization": `Bearer ${mpToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ status: "cancelled" }),
            }
          );
          const mpData = await mpResponse.json();
          console.log("MP cancel on delete-user:", JSON.stringify(mpData));
        } catch (mpErr) {
          console.error("Error cancelling MP subscription:", mpErr);
          // Continue with deletion anyway
        }
      }
    }

    // Delete related data in order
    const qrIds = (await adminClient.from("qr_codes").select("id").eq("user_id", targetUserId)).data?.map(q => q.id) || [];
    if (qrIds.length > 0) {
      await adminClient.from("qr_scan_events").delete().in("qr_code_id", qrIds);
    }
    await adminClient.from("qr_codes").delete().eq("user_id", targetUserId);
    await adminClient.from("subscriptions").delete().eq("user_id", targetUserId);
    await adminClient.from("email_logs").delete().eq("user_id", targetUserId);
    await adminClient.from("user_roles").delete().eq("user_id", targetUserId);
    await adminClient.from("profiles").delete().eq("user_id", targetUserId);

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUserId);
    if (deleteError) {
      console.error("Error deleting auth user:", deleteError);
      return new Response(
        JSON.stringify({ error: "Error al eliminar usuario de autenticación" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
