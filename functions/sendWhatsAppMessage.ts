import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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
      status: 'active'
    });

    if (!membership.length || !['planner', 'company_admin'].includes(membership[0].company_role)) {
      return Response.json({ error: 'Forbidden: Only planners and admins can send WhatsApp messages' }, { status: 403 });
    }

    const { phoneNumber, message, employeeName, companyId, scheduleId, aiSuggestionId, subject } = await req.json();

    if (!phoneNumber || !message) {
      return Response.json({ error: 'Phone number and message are required' }, { status: 400 });
    }

    const PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    const ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN');

    // Uitgebreide logging voor debugging
    console.log('=== WhatsApp API Debug Info ===');
    console.log('PHONE_NUMBER_ID:', PHONE_NUMBER_ID);
    console.log('ACCESS_TOKEN (eerste 8 chars):', ACCESS_TOKEN ? ACCESS_TOKEN.substring(0, 8) + '...' : 'NIET GEVONDEN');
    console.log('ACCESS_TOKEN lengte:', ACCESS_TOKEN ? ACCESS_TOKEN.length : 0);
    console.log('Timestamp:', new Date().toISOString());
    console.log('===============================');

    if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
      return Response.json({ error: 'WhatsApp credentials not configured' }, { status: 500 });
    }

    // Format phone number - remove all non-digits and ensure it starts with country code
    let formattedPhone = phoneNumber.replace(/\D/g, '');
    if (!formattedPhone.startsWith('31') && formattedPhone.length === 9) {
      formattedPhone = '31' + formattedPhone;
    }

    console.log('=== WhatsApp API Request ===');
    console.log('Endpoint:', `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`);
    console.log('To (formatted):', formattedPhone);
    console.log('Message length:', message.length);
    console.log('============================');

    const whatsappResponse = await fetch(
      `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'text',
          text: {
            body: message
          }
        })
      }
    );

    const responseData = await whatsappResponse.json();

    console.log('=== WhatsApp API Response ===');
    console.log('Status:', whatsappResponse.status);
    console.log('Status Text:', whatsappResponse.statusText);
    console.log('Response:', JSON.stringify(responseData, null, 2));
    console.log('=============================');

    if (!whatsappResponse.ok) {
      console.error('WhatsApp API error details:', {
        status: whatsappResponse.status,
        error_message: responseData.error?.message,
        error_code: responseData.error?.code,
        error_type: responseData.error?.type,
        error_subcode: responseData.error?.error_subcode,
        fbtrace_id: responseData.error?.fbtrace_id
      });
      
      // Log failed message
      if (companyId) {
        await base44.asServiceRole.entities.WhatsAppMessageLog.create({
          companyId,
          scheduleId: scheduleId || null,
          aiSuggestionId: aiSuggestionId || null,
          recipient_name: employeeName || 'Onbekend',
          recipient_phone: formattedPhone,
          subject: subject || 'WhatsApp bericht',
          status: 'failed',
          error_message: JSON.stringify(responseData),
          sent_by: user.email
        });
      }
      
      return Response.json({ 
        error: 'Failed to send WhatsApp message', 
        details: responseData 
      }, { status: whatsappResponse.status });
    }

    // Log successful message
    if (companyId) {
      await base44.asServiceRole.entities.WhatsAppMessageLog.create({
        companyId,
        scheduleId: scheduleId || null,
        aiSuggestionId: aiSuggestionId || null,
        recipient_name: employeeName || 'Onbekend',
        recipient_phone: formattedPhone,
        subject: subject || 'WhatsApp bericht',
        status: 'sent',
        sent_by: user.email
      });
    }

    return Response.json({ 
      success: true, 
      messageId: responseData.messages?.[0]?.id,
      to: formattedPhone,
      employeeName
    });

  } catch (error) {
    console.error('Error sending WhatsApp:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});