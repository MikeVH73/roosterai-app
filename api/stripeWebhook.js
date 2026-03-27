import Stripe from 'stripe';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const LOOKUP_KEY_TO_PLAN = {
  starter_monthly: { planId: 'starter', employeeLimit: 25, aiActions: 500 },
  pro_monthly:     { planId: 'pro',     employeeLimit: 75, aiActions: 1500 },
  business_monthly:{ planId: 'business',employeeLimit: 200, aiActions: 5000 },
};

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripe = new Stripe(process.env.STRIPE_API_KEY);
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const db = getFirestore();

  let event;
  try {
    const rawBody = await getRawBody(req);
    const signature = req.headers['stripe-signature'];
    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } else {
      event = JSON.parse(rawBody.toString());
    }
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).json({ error: err.message });
  }

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object;
        const { companyId, planId, employeeLimit, aiActions } = session.metadata || {};
        if (!companyId || !planId) break;

        let subscriptionStatus = 'active';
        let trialEndsAt = null;

        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          if (sub.status === 'trialing' && sub.trial_end) {
            subscriptionStatus = 'trial';
            trialEndsAt = new Date(sub.trial_end * 1000).toISOString().split('T')[0];
          }
        }

        await db.collection('companies').doc(companyId).update({
          subscription_plan: planId,
          subscription_status: subscriptionStatus,
          max_users: parseInt(employeeLimit, 10),
          ai_actions_limit: parseInt(aiActions, 10),
          trial_ends_at: trialEndsAt,
        });
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const companyId = sub.metadata?.companyId;
        if (!companyId) break;

        const update = {};
        if (sub.status === 'active') {
          update.subscription_status = 'active';
          update.trial_ends_at = null;
        } else if (sub.status === 'trialing') {
          update.subscription_status = 'trial';
          update.trial_ends_at = sub.trial_end
            ? new Date(sub.trial_end * 1000).toISOString().split('T')[0]
            : null;
        } else if (sub.status === 'past_due' || sub.status === 'unpaid') {
          update.subscription_status = 'suspended';
        } else if (sub.status === 'canceled') {
          update.subscription_status = 'cancelled';
        }

        const item = sub.items?.data?.[0];
        const plan = item?.price?.lookup_key ? LOOKUP_KEY_TO_PLAN[item.price.lookup_key] : null;
        if (plan) {
          update.subscription_plan = plan.planId;
          update.max_users = plan.employeeLimit;
          update.ai_actions_limit = plan.aiActions;
        }

        if (Object.keys(update).length > 0) {
          await db.collection('companies').doc(companyId).update(update);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const companyId = sub.metadata?.companyId;
        if (!companyId) break;
        await db.collection('companies').doc(companyId).update({ subscription_status: 'cancelled' });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription);
          const companyId = sub.metadata?.companyId;
          if (companyId) {
            await db.collection('companies').doc(companyId).update({ subscription_status: 'suspended' });
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event: ${event.type}`);
    }

    return res.json({ received: true });
  } catch (error) {
    console.error('Webhook handling error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
