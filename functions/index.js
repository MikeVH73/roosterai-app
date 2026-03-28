const { onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');
const Stripe = require('stripe');

admin.initializeApp();
setGlobalOptions({ region: 'europe-west1' });

// ─── 0. createPaperclipTask ────────────────────────────────────────────────
// Ontvangt een taakaanvraag van de browser en maakt een issue aan in Paperclip.
// Zo blijft de Paperclip API key nooit zichtbaar in de browser.
//
// POST body: {
//   taskType,       // 'vervanging' | 'optimalisatie' | 'conflicten' | etc.
//   companyId,      // Firebase companyId (doorgegeven als metadata)
//   assigneeAgentId,// Paperclip agent ID die de taak moet oppakken
//   goalId,         // Paperclip goal ID (planning)
//   title,          // Taaktitel (optioneel, anders auto-gegenereerd)
//   metadata,       // Vrij object met extra context (scheduleId, shiftId, etc.)
// }
//
// Env-vars (stel in via Firebase console → Functions → Config):
//   PAPERCLIP_API_URL      bijv. https://paperclip.roosterai.nl
//   PAPERCLIP_API_KEY      lang-levende agent API key
//   PAPERCLIP_COMPANY_ID   company ID binnen Paperclip

exports.createPaperclipTask = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  // Authenticeer Firebase gebruiker
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) { res.status(401).json({ error: 'Unauthorized' }); return; }

  try {
    await admin.auth().verifyIdToken(idToken);
  } catch {
    res.status(401).json({ error: 'Invalid token' }); return;
  }

  const {
    taskType,
    companyId,
    assigneeAgentId,
    goalId,
    title,
    metadata = {},
  } = req.body;

  if (!taskType || !companyId || !assigneeAgentId) {
    res.status(400).json({ error: 'Missing required fields: taskType, companyId, assigneeAgentId' });
    return;
  }

  const paperclipUrl  = process.env.PAPERCLIP_API_URL;
  const paperclipKey  = process.env.PAPERCLIP_API_KEY;
  const paperclipComp = process.env.PAPERCLIP_COMPANY_ID;

  if (!paperclipUrl || !paperclipKey || !paperclipComp) {
    console.error('Paperclip env vars niet geconfigureerd');
    res.status(500).json({ error: 'Paperclip not configured' }); return;
  }

  const taskTitles = {
    vervanging:     'Vervanger zoeken',
    optimalisatie:  'Rooster optimaliseren',
    conflicten:     'Conflicten detecteren',
    alternatieven:  'Alternatief rooster genereren',
    deterministisch:'Rooster genereren (deterministisch)',
    verlof_analyse: 'Verlofaanvraag impact analyseren',
    ruil_check:     'Ruilverzoek beoordelen',
  };

  const issueTitle = title || taskTitles[taskType] || `AI taak: ${taskType}`;

  try {
    const response = await fetch(`${paperclipUrl}/api/companies/${paperclipComp}/issues`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${paperclipKey}`,
      },
      body: JSON.stringify({
        title: issueTitle,
        description: `Automatisch aangemaakt via RoosterAI.nl\nTaskType: ${taskType}\nCompanyId: ${companyId}`,
        assigneeAgentId,
        ...(goalId ? { goalId } : {}),
        priority: 'high',
        metadata: {
          taskType,
          companyId,
          ...metadata,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Paperclip API fout:', data);
      res.status(502).json({ error: 'Paperclip API error', detail: data }); return;
    }

    // Sla het issue ID ook op in Firestore voor traceerbaarheid (optioneel)
    if (metadata.sickReportId) {
      await admin.firestore()
        .collection('sick_reports')
        .doc(metadata.sickReportId)
        .update({ paperclip_issue_id: data.id, status: 'agent_working' })
        .catch(() => {}); // Niet fataal als dit mislukt
    }

    res.json({ issueId: data.id, title: issueTitle });

  } catch (error) {
    console.error('createPaperclipTask error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const db = admin.firestore();

const PLAN_CONFIG = {
  starter: { lookup_key: 'starter_monthly', employeeLimit: 25, aiActions: 500 },
  pro:     { lookup_key: 'pro_monthly',     employeeLimit: 75, aiActions: 1500 },
  business:{ lookup_key: 'business_monthly',employeeLimit: 200, aiActions: 5000 },
};

const LOOKUP_KEY_TO_PLAN = {
  starter_monthly: { planId: 'starter', employeeLimit: 25, aiActions: 500 },
  pro_monthly:     { planId: 'pro',     employeeLimit: 75, aiActions: 1500 },
  business_monthly:{ planId: 'business',employeeLimit: 200, aiActions: 5000 },
};

// ─── 1. createCheckoutSession ──────────────────────────────────────────────

exports.createCheckoutSession = onRequest({ cors: true }, async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const decoded = await admin.auth().verifyIdToken(idToken);
    const userEmail = decoded.email;

    const { planId, companyId, returnUrl } = req.body;
    if (!planId || !companyId || !returnUrl) {
      res.status(400).json({ error: 'Missing required fields' }); return;
    }

    const planConfig = PLAN_CONFIG[planId];
    if (!planConfig) { res.status(400).json({ error: 'Invalid plan' }); return; }

    const stripe = new Stripe(process.env.STRIPE_API_KEY);

    const prices = await stripe.prices.list({
      lookup_keys: [planConfig.lookup_key],
      active: true,
      limit: 1,
    });

    if (!prices.data.length) {
      res.status(404).json({ error: `Stripe price not found: ${planConfig.lookup_key}` }); return;
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card', 'ideal'],
      customer_email: userEmail,
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          companyId,
          planId,
          employeeLimit: String(planConfig.employeeLimit),
          aiActions: String(planConfig.aiActions),
        },
      },
      line_items: [{ price: prices.data[0].id, quantity: 1 }],
      metadata: {
        companyId,
        planId,
        employeeLimit: String(planConfig.employeeLimit),
        aiActions: String(planConfig.aiActions),
      },
      success_url: `${returnUrl}?checkout=success&plan=${planId}`,
      cancel_url:  `${returnUrl}?checkout=cancelled`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('createCheckoutSession error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ─── 2. stripeWebhook ──────────────────────────────────────────────────────

exports.stripeWebhook = onRequest({ cors: false }, async (req, res) => {
  const stripe = new Stripe(process.env.STRIPE_API_KEY);
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    const signature = req.headers['stripe-signature'];
    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(req.rawBody, signature, webhookSecret);
    } else {
      event = req.body;
    }
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    res.status(400).json({ error: err.message }); return;
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
        console.log(`Company ${companyId} → plan=${planId}, status=${subscriptionStatus}`);
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

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handling error:', error.message);
    res.status(500).json({ error: error.message });
  }
});
