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

    // User is verified admin - fetch all profiles using service role
    const { data: profiles, error: profilesError } = await adminClient
      .from("profiles")
      .select("id, user_id, email, full_name, created_at")
      .order("created_at", { ascending: false });

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return new Response(
        JSON.stringify({ error: "Error fetching user data" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get subscriptions with plan names
    const { data: subscriptions, error: subsError } = await adminClient
      .from("subscriptions")
      .select("id, user_id, status, plan_id, current_period_end, plans(name)");

    if (subsError) {
      console.error("Error fetching subscriptions:", subsError);
      return new Response(
        JSON.stringify({ error: "Error fetching subscription data" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map subscriptions to users
    const subsMap = new Map(
      subscriptions?.map((sub) => {
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

    // Get QR counts per user
    const { data: qrCodes, error: qrError } = await adminClient
      .from("qr_codes")
      .select("user_id");

    if (qrError) {
      console.error("Error fetching QR codes:", qrError);
    }

    const qrCounts: Record<string, number> = {};
    qrCodes?.forEach((qr: { user_id: string }) => {
      qrCounts[qr.user_id] = (qrCounts[qr.user_id] || 0) + 1;
    });

    // Combine data
    const users = profiles.map((profile) => ({
      ...profile,
      subscription: subsMap.get(profile.user_id) || null,
      qr_count: qrCounts[profile.user_id] || 0,
    }));

    return new Response(
      JSON.stringify({ users }),
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
