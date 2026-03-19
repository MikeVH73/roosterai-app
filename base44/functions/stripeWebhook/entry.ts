import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import Stripe from 'npm:stripe@14.14.0';

const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

Deno.serve(async (req) => {
  try {
    const body = await req.text();

    // If webhook secret is set, verify signature
    let event;
    if (webhookSecret) {
      const signature = req.headers.get('stripe-signature');
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } else {
      event = JSON.parse(body);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { companyId, planId, employeeLimit, aiActions } = session.metadata;

      if (companyId && planId) {
        // Create a service-role client to update the company
        const base44 = createClientFromRequest(req);
        await base44.asServiceRole.entities.Company.update(companyId, {
          subscription_plan: planId,
          subscription_status: 'active',
          max_users: parseInt(employeeLimit, 10),
          ai_actions_limit: parseInt(aiActions, 10),
        });
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error.message);
    return Response.json({ error: error.message }, { status: 400 });
  }
});