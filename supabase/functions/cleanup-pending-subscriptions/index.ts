import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cancel a preapproval in Mercado Pago
async function cancelMPPreapproval(preapprovalId: string, accessToken: string): Promise<boolean> {
  try {
    console.log(`Cancelling MP preapproval: ${preapprovalId}`);
    const response = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    
    const data = await response.json();
    console.log(`MP cancel response for ${preapprovalId}:`, JSON.stringify(data));
    
    return response.ok;
  } catch (error) {
    console.error(`Error cancelling MP preapproval ${preapprovalId}:`, error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Validate cron secret for security
  const CRON_SECRET = Deno.env.get('CRON_SECRET');
  const providedSecret = req.headers.get('x-cron-secret');

  if (!CRON_SECRET || providedSecret !== CRON_SECRET) {
    console.error('Unauthorized access attempt - invalid or missing cron secret');
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!MERCADOPAGO_ACCESS_TOKEN) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN is not configured');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find pending subscriptions older than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    console.log(`Looking for pending subscriptions older than: ${fiveMinutesAgo}`);

    const { data: stalePending, error: fetchError } = await supabase
      .from('subscriptions')
      .select('id, user_id, mercadopago_preapproval_id, updated_at')
      .eq('status', 'pending')
      .lt('updated_at', fiveMinutesAgo);

    if (fetchError) {
      console.error('Error fetching stale subscriptions:', fetchError);
      throw fetchError;
    }

    if (!stalePending || stalePending.length === 0) {
      console.log('No stale pending subscriptions found');
      return new Response(
        JSON.stringify({ success: true, cleaned: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${stalePending.length} stale pending subscriptions to clean up`);

    let cleanedCount = 0;
    let errorCount = 0;

    for (const sub of stalePending) {
      try {
        // Cancel in Mercado Pago if has preapproval ID
        if (sub.mercadopago_preapproval_id) {
          await cancelMPPreapproval(sub.mercadopago_preapproval_id, MERCADOPAGO_ACCESS_TOKEN);
        }

        // Delete the pending subscription from database
        const { error: deleteError } = await supabase
          .from('subscriptions')
          .delete()
          .eq('id', sub.id)
          .eq('status', 'pending'); // Extra safety check

        if (deleteError) {
          console.error(`Error deleting subscription ${sub.id}:`, deleteError);
          errorCount++;
        } else {
          console.log(`Cleaned up subscription ${sub.id} for user ${sub.user_id}`);
          cleanedCount++;
        }
      } catch (error) {
        console.error(`Error processing subscription ${sub.id}:`, error);
        errorCount++;
      }
    }

    console.log(`Cleanup complete: ${cleanedCount} cleaned, ${errorCount} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        cleaned: cleanedCount, 
        errors: errorCount,
        total_found: stalePending.length 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in cleanup-pending-subscriptions:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to cleanup pending subscriptions' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
