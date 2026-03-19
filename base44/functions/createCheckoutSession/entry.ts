import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import Stripe from 'npm:stripe@14.14.0';

const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY'));

// Map plan IDs to Stripe price configuration
const PLAN_CONFIG = {
  starter: {
    name: 'RoosterAI Starter',
    price: 3900, // cents
    employeeLimit: 25,
    aiActions: 500,
  },
  pro: {
    name: 'RoosterAI Pro',
    price: 7900,
    employeeLimit: 75,
    aiActions: 1500,
  },
  business: {
    name: 'RoosterAI Business',
    price: 14900,
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

    // Create Stripe Checkout session with a recurring subscription
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card', 'ideal'],
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: planConfig.name,
              description: `Tot ${planConfig.employeeLimit} medewerkers, ${planConfig.aiActions} AI acties/maand`,
            },
            unit_amount: planConfig.price,
            recurring: { interval: 'month' },
          },
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
    return Response.json({ error: error.message }, { status: 500 });
  }
});