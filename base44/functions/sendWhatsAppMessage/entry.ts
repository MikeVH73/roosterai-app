import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

function normalizeNlPhone(input: string): string {
  let p = (input || '').replace(/\D/g, '');

  // +31... or 31...
  if (p.startsWith('31')) return p;

  // 06xxxxxxxx (10 digits)
  if (p.startsWith('06') && p.length === 10) return '31' + p.slice(1);

  // 6xxxxxxxx (9 digits, missing leading 0)
  if (p.length === 9 && p.startsWith('6')) return '31' + p;

  // fallback: return digits as-is
  return p;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only planner and company_admin can send WhatsApp messages
    const membership = await base44.entities.CompanyMember.filter({
      email: user.email,
      status: 'active',
    });

    if (!membership.length || !['planner', 'company_admin'].includes(membership[0].company_role)) {
      return Response.json(
        { error: 'Forbidden: Only planners and admins can send WhatsApp messages' },
        { status: 403 }
      );
    }

    /**
     * Expected payload (template-first):
     * - phoneNumber: string (e.g. +316...)
     * - employeeName: string (for {{1}})
     * - periodLabel: string (for {{2}} e.g. "week 6 (3–9 feb)")
     * - rosterUrl: string (for {{3}} deep link)
     *
     * Backwards compatible:
     * - message can be used as rosterUrl if rosterUrl not provided
     * - subject can be used as periodLabel if periodLabel not provided
     */
    const {
      phoneNumber,
      employeeName,
      employeeId,
      companyId,
      scheduleId,
      aiSuggestionId,
      subject,
      periodLabel,
      rosterUrl,
      message,
      directMessage,
    } = await req.json();

    if (!phoneNumber) {
      return Response.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Check if employee has opted in to WhatsApp notifications
    if (employeeId) {
      const employee = await base44.asServiceRole.entities.EmployeeProfile.filter({ id: employeeId });
      if (employee.length > 0 && !employee[0].whatsapp_opt_in) {
        return Response.json(
          { error: 'Employee has not opted in to WhatsApp notifications' },
          { status: 403 }
        );
      }
    }

    const PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    const ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN');

    if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
      return Response.json({ error: 'WhatsApp credentials not configured' }, { status: 500 });
    }

    const formattedPhone = normalizeNlPhone(phoneNumber);

    // Build message text
    let messageText;
    
    if (directMessage) {
      // Pre-built message from template selector or other sources - send as-is
      messageText = directMessage;
    } else {
      const p1 = (employeeName || 'collega').toString();
      const p2 = (periodLabel || subject || 'je planning').toString();
      const p3 = (rosterUrl || message || '').toString();

      if (!p3) {
        return Response.json(
          { error: 'rosterUrl (or message as fallback) is required' },
          { status: 400 }
        );
      }

      messageText = `Hoi ${p1},\n\nEr is een update over ${p2}.\n\n${p3}`;
    }

    // Send as regular text message (no template needed)
    const payload = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'text',
      text: {
        body: messageText,
      },
    };

    const whatsappResponse = await fetch(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const responseData = await whatsappResponse.json();

    if (!whatsappResponse.ok) {
      console.error('WhatsApp API error:', responseData);

      // Log failed message
      if (companyId) {
        await base44.asServiceRole.entities.WhatsAppMessageLog.create({
          companyId,
          employee_id: employeeId || undefined,
          scheduleId: scheduleId || null,
          aiSuggestionId: aiSuggestionId || null,
          message: messageText,
          recipient_name: employeeName || 'Onbekend',
          recipient_phone: formattedPhone,
          direction: 'outbound',
          status: 'failed',
          error_message: JSON.stringify(responseData),
          sent_by: user.email,
        });
      }

      return Response.json(
        { error: 'Failed to send WhatsApp template message', details: responseData },
        { status: whatsappResponse.status }
      );
    }

    // Log successful message (with employee_id and message for visibility in MijnBerichten)
    if (companyId) {
      await base44.asServiceRole.entities.WhatsAppMessageLog.create({
        companyId,
        employee_id: employeeId || undefined,
        scheduleId: scheduleId || null,
        aiSuggestionId: aiSuggestionId || null,
        message: messageText,
        recipient_name: employeeName || 'Onbekend',
        recipient_phone: formattedPhone,
        direction: 'outbound',
        status: 'sent',
        sent_by: user.email,
      });
    }

    return Response.json({
      success: true,
      messageId: responseData.messages?.[0]?.id,
      to: formattedPhone,
      employeeName,
    });
  } catch (error) {
    console.error('Error sending WhatsApp:', error);
    return Response.json({ error: error?.message ?? String(error) }, { status: 500 });
  }
});