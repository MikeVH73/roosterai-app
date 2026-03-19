import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import Stripe from 'npm:stripe@14.14.0';

const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

// Map lookup keys back to plan IDs
const LOOKUP_KEY_TO_PLAN = {
  'starter_monthly': { planId: 'starter', employeeLimit: 25, aiActions: 500 },
  'pro_monthly': { planId: 'pro', employeeLimit: 75, aiActions: 1500 },
  'business_monthly': { planId: 'business', employeeLimit: 200, aiActions: 5000 },
};

async function getCompanyIdFromSubscription(subscription) {
  // Check subscription metadata first, then check the checkout session
  if (subscription.metadata?.companyId) {
    return subscription.metadata;
  }
  return null;
}

async function getPlanFromSubscription(subscription) {
  // Try metadata first
  if (subscription.metadata?.planId) {
    return {
      planId: subscription.metadata.planId,
      employeeLimit: parseInt(subscription.metadata.employeeLimit, 10),
      aiActions: parseInt(subscription.metadata.aiActions, 10),
    };
  }

  // Fallback: resolve from the price's lookup_key
  const item = subscription.items?.data?.[0];
  if (item?.price?.lookup_key && LOOKUP_KEY_TO_PLAN[item.price.lookup_key]) {
    return LOOKUP_KEY_TO_PLAN[item.price.lookup_key];
  }

  return null;
}

Deno.serve(async (req) => {
  try {
    const body = await req.text();

    // Verify Stripe signature
    let event;
    if (webhookSecret) {
      const signature = req.headers.get('stripe-signature');
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } else {
      event = JSON.parse(body);
    }

    const base44 = createClientFromRequest(req);

    switch (event.type) {

      // New subscription created (after checkout)
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { companyId, planId, employeeLimit, aiActions } = session.metadata || {};

        if (companyId && planId) {
          // Retrieve the subscription to check if it has a trial
          let subscriptionStatus = 'active';
          let trialEndsAt = null;

          if (session.subscription) {
            const sub = await stripe.subscriptions.retrieve(session.subscription);
            if (sub.status === 'trialing' && sub.trial_end) {
              subscriptionStatus = 'trial';
              trialEndsAt = new Date(sub.trial_end * 1000).toISOString().split('T')[0];
            }
          }

          await base44.asServiceRole.entities.Company.update(companyId, {
            subscription_plan: planId,
            subscription_status: subscriptionStatus,
            max_users: parseInt(employeeLimit, 10),
            ai_actions_limit: parseInt(aiActions, 10),
            trial_ends_at: trialEndsAt,
          });
          console.log(`Company ${companyId} updated: plan=${planId}, status=${subscriptionStatus}`);
        }
        break;
      }

      // Subscription updated (e.g. plan change, trial ended, renewal)
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const meta = await getCompanyIdFromSubscription(subscription);
        if (!meta?.companyId) break;

        const plan = await getPlanFromSubscription(subscription);
        const updateData = {};

        // Map Stripe subscription status to our app status
        if (subscription.status === 'active') {
          updateData.subscription_status = 'active';
          updateData.trial_ends_at = null;
        } else if (subscription.status === 'trialing') {
          updateData.subscription_status = 'trial';
          if (subscription.trial_end) {
            updateData.trial_ends_at = new Date(subscription.trial_end * 1000).toISOString().split('T')[0];
          }
        } else if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
          updateData.subscription_status = 'suspended';
        } else if (subscription.status === 'canceled') {
          updateData.subscription_status = 'cancelled';
        }

        // Update plan details if available
        if (plan) {
          updateData.subscription_plan = plan.planId;
          updateData.max_users = plan.employeeLimit;
          updateData.ai_actions_limit = plan.aiActions;
        }

        if (Object.keys(updateData).length > 0) {
          await base44.asServiceRole.entities.Company.update(meta.companyId, updateData);
          console.log(`Company ${meta.companyId} subscription updated:`, updateData);
        }
        break;
      }

      // Subscription cancelled
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const meta = await getCompanyIdFromSubscription(subscription);
        if (!meta?.companyId) break;

        await base44.asServiceRole.entities.Company.update(meta.companyId, {
          subscription_status: 'cancelled',
        });
        console.log(`Company ${meta.companyId} subscription cancelled`);
        break;
      }

      // Invoice payment failed
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription);
          const meta = await getCompanyIdFromSubscription(sub);
          if (meta?.companyId) {
            await base44.asServiceRole.entities.Company.update(meta.companyId, {
              subscription_status: 'suspended',
            });
            console.log(`Company ${meta.companyId} payment failed, suspended`);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error.message);
    return Response.json({ error: error.message }, { status: 400 });
  }
});