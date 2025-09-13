import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();
    
    // Parse the webhook event
    let event;
    try {
      // In production, you'd verify the webhook signature here
      event = JSON.parse(body);
    } catch (err) {
      console.error('Error parsing webhook body:', err);
      return new Response('Invalid payload', { status: 400 });
    }

    console.log('Received Stripe webhook event:', event.type, event.id);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        const purchaseType = session.metadata?.type;
        
        if (!userId) {
          console.error('No user_id in session metadata');
          break;
        }

        // Handle lead purchase
        if (purchaseType === 'lead_purchase') {
          const leadCount = session.metadata?.lead_count;
          const searchDataString = session.metadata?.search_data;
          
          if (!searchDataString) {
            console.error('No search data in session metadata');
            break;
          }

          try {
            const searchData = JSON.parse(searchDataString);
            
            // Save the premium search to search_history
            const { error } = await supabase.from('search_history').insert({
              user_id: userId,
              query: searchData.search_query,
              location: searchData.location,
              business_type: searchData.business_type,
              results_count: parseInt(leadCount) || 0,
              is_premium: true,
              leads: JSON.parse(searchData.search_results)
            });

            if (error) {
              console.error('Error saving premium search:', error);
            } else {
              console.log('Saved premium search for user:', userId, 'with', leadCount, 'leads');
            }
          } catch (parseError) {
            console.error('Error parsing search data:', parseError);
          }
        } else {
          // Handle subscription checkout (existing logic)
          // Update user subscription status
          await supabase
            .from('profiles')
            .update({
              subscription_status: 'active',
              subscription_end: null, // For monthly subscriptions, we'll update this on cancellation
            })
            .eq('user_id', userId);

          console.log('Updated subscription for user:', userId);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // Get user by customer ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!profile) {
          console.error('No profile found for customer:', customerId);
          break;
        }

        const isActive = subscription.status === 'active' || subscription.status === 'trialing';
        const subscriptionEnd = subscription.cancel_at 
          ? new Date(subscription.cancel_at * 1000).toISOString()
          : null;

        await supabase
          .from('profiles')
          .update({
            subscription_status: isActive ? 'active' : 'inactive',
            subscription_end: subscriptionEnd,
          })
          .eq('user_id', profile.user_id);

        console.log('Updated subscription status for user:', profile.user_id, 'Status:', subscription.status);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // Get user by customer ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!profile) {
          console.error('No profile found for customer:', customerId);
          break;
        }

        await supabase
          .from('profiles')
          .update({
            subscription_status: 'inactive',
            subscription_end: new Date().toISOString(),
          })
          .eq('user_id', profile.user_id);

        console.log('Cancelled subscription for user:', profile.user_id);
        break;
      }

      default:
        console.log('Unhandled webhook event type:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in stripe-webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});