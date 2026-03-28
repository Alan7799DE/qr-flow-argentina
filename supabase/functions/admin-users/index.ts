import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user's JWT and get their identity
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

    // Use service role to verify admin status (bypasses RLS)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: roleData, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) {
      console.error("Error checking admin role:", roleError);
      return new Response(
        JSON.stringify({ error: "Error verifying permissions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse pagination & search params
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10) || 50));
    const search = (url.searchParams.get("search") || "").trim();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build profiles query with optional search
    let countQuery = adminClient
      .from("profiles")
      .select("id", { count: "exact", head: true });

    let dataQuery = adminClient
      .from("profiles")
      .select("id, user_id, email, full_name, created_at")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (search) {
      const pattern = `%${search}%`;
      countQuery = countQuery.or(`email.ilike.${pattern},full_name.ilike.${pattern}`);
      dataQuery = dataQuery.or(`email.ilike.${pattern},full_name.ilike.${pattern}`);
    }

    // Execute count and data in parallel
    const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

    if (countResult.error) {
      console.error("Error counting profiles:", countResult.error);
      return new Response(
        JSON.stringify({ error: "Error fetching user count" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (dataResult.error) {
      console.error("Error fetching profiles:", dataResult.error);
      return new Response(
        JSON.stringify({ error: "Error fetching user data" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const total = countResult.count || 0;
    const profiles = dataResult.data || [];
    const userIds = profiles.map((p) => p.user_id);

    // Get subscriptions and QR counts only for the current page's users
    let subscriptions: any[] = [];
    let qrCodes: any[] = [];

    if (userIds.length > 0) {
      const [subsResult, qrResult] = await Promise.all([
        adminClient
          .from("subscriptions")
          .select("id, user_id, status, plan_id, current_period_end, plans(name)")
          .in("user_id", userIds),
        adminClient
          .from("qr_codes")
          .select("user_id")
          .in("user_id", userIds),
      ]);

      if (subsResult.error) {
        console.error("Error fetching subscriptions:", subsResult.error);
      } else {
        subscriptions = subsResult.data || [];
      }

      if (qrResult.error) {
        console.error("Error fetching QR codes:", qrResult.error);
      } else {
        qrCodes = qrResult.data || [];
      }
    }

    // Map subscriptions to users
    const subsMap = new Map(
      subscriptions.map((sub) => {
        const planData = sub.plans as { name: string } | { name: string }[] | null;
        const planName = Array.isArray(planData)
          ? planData[0]?.name
          : planData?.name;

        return [
          sub.user_id,
          {
            id: sub.id,
            status: sub.status,
            plan_id: sub.plan_id,
            current_period_end: sub.current_period_end,
            plan_name: planName || null,
          },
        ];
      })
    );

    // Count QRs per user
    const qrCounts: Record<string, number> = {};
    qrCodes.forEach((qr: { user_id: string }) => {
      qrCounts[qr.user_id] = (qrCounts[qr.user_id] || 0) + 1;
    });

    // Combine data
    const users = profiles.map((profile) => ({
      ...profile,
      subscription: subsMap.get(profile.user_id) || null,
      qr_count: qrCounts[profile.user_id] || 0,
    }));

    return new Response(
      JSON.stringify({
        users,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
