import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import Stripe from 'npm:stripe@14.14.0';

const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY'));

// Map plan IDs to Stripe lookup keys and app limits
const PLAN_CONFIG = {
  starter: {
    lookup_key: 'starter_monthly',
    employeeLimit: 25,
    aiActions: 500,
  },
  pro: {
    lookup_key: 'pro_monthly',
    employeeLimit: 75,
    aiActions: 1500,
  },
  business: {
    lookup_key: 'business_monthly',
    employeeLimit: 200,
    aiActions: 5000,
  },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId, companyId, returnUrl } = await req.json();

    if (!planId || !companyId || !returnUrl) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const planConfig = PLAN_CONFIG[planId];
    if (!planConfig) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Look up the Stripe price by lookup_key
    const prices = await stripe.prices.list({
      lookup_keys: [planConfig.lookup_key],
      active: true,
      limit: 1,
    });

    if (!prices.data.length) {
      return Response.json({ error: `Stripe price not found for lookup key: ${planConfig.lookup_key}` }, { status: 404 });
    }

    const stripePriceId = prices.data[0].id;

    // Create Stripe Checkout session using the existing price
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card', 'ideal'],
      customer_email: user.email,
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          companyId,
          planId,
          employeeLimit: String(planConfig.employeeLimit),
          aiActions: String(planConfig.aiActions),
        },
      },
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      metadata: {
        companyId,
        planId,
        employeeLimit: String(planConfig.employeeLimit),
        aiActions: String(planConfig.aiActions),
      },
      success_url: `${returnUrl}?checkout=success&plan=${planId}`,
      cancel_url: `${returnUrl}?checkout=cancelled`,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});