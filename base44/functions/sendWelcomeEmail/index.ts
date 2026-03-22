import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    if (!RESEND_API_KEY) {
      return Response.json({ error: 'Resend API key not configured' }, { status: 500 });
    }

    const body = await req.json();
    const company = body?.entity || body;

    const naam = company?.name || 'daar';
    const email = company?.owner_email || company?.email || null;

    if (!email) {
      return Response.json({ error: 'Geen email adres gevonden' }, { status: 400 });
    }

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <h1 style="font-size: 22px; color: #111;">Welkom bij RoosterAI, ${naam}! 🎉</h1>
        <p style="color: #444; line-height: 1.6;">
          Fijn dat je er bij bent! Je account is aangemaakt en je kunt direct aan de slag met het maken van je eerste rooster.
        </p>
        <a href="https://roosterai.nl" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #6366f1; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Open RoosterAI →
        </a>
        <p style="margin-top: 32px; color: #888; font-size: 13px;">
          Vragen? Mail naar <a href="mailto:hallo@roosterai.nl" style="color: #6366f1;">hallo@roosterai.nl</a>
        </p>
      </div>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'hallo@roosterai.nl',
        to: email,
        subject: `Welkom bij RoosterAI, ${naam}!`,
        html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend error:', data);
      return Response.json({ error: data }, { status: response.status });
    }

    return Response.json({ success: true, id: data.id });

  } catch (error) {
    console.error('sendWelcomeEmail error:', error);
    return Response.json({ error: error?.message ?? String(error) }, { status: 500 });
  }
});
