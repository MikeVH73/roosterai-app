const Stripe = require('stripe');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const PLAN_CONFIG = {
  starter: { lookup_key: 'starter_monthly', employeeLimit: 25, aiActions: 500 },
  pro:     { lookup_key: 'pro_monthly',     employeeLimit: 75, aiActions: 1500 },
  business:{ lookup_key: 'business_monthly',employeeLimit: 200, aiActions: 5000 },
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) return res.status(401).json({ error: 'Unauthorized' });

    const decoded = await admin.auth().verifyIdToken(idToken);
    const userEmail = decoded.email;

    const { planId, companyId, returnUrl } = req.body;
    if (!planId || !companyId || !returnUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const planConfig = PLAN_CONFIG[planId];
    if (!planConfig) return res.status(400).json({ error: 'Invalid plan' });

    const stripe = new Stripe(process.env.STRIPE_API_KEY);

    const prices = await stripe.prices.list({
      lookup_keys: [planConfig.lookup_key],
      active: true,
      limit: 1,
    });

    if (!prices.data.length) {
      return res.status(404).json({ error: `Stripe price not found: ${planConfig.lookup_key}` });
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

    return res.json({ url: session.url });
  } catch (error) {
    console.error('createCheckoutSession error:', error.message);
    return res.status(500).json({ error: error.message });
  }
};
