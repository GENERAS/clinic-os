import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const { messageId, clinicId } = await req.json();
    if (!messageId || !clinicId) {
      return new Response(JSON.stringify({ error: "messageId and clinicId required" }), { status: 400 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: creds } = await supabase
      .from("whatsapp_credentials")
      .select("access_token, phone_number_id, api_version")
      .eq("clinic_id", clinicId)
      .single();

    if (!creds) {
      await supabase.from("whatsapp_messages").update({
        status: "failed",
        failed_at: new Date().toISOString(),
        error_message: "WhatsApp not configured",
      }).eq("id", messageId);
      return new Response(JSON.stringify({ error: "WhatsApp not configured" }), { status: 400 });
    }

    const { data: message } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("id", messageId)
      .single();

    if (!message) {
      return new Response(JSON.stringify({ error: "Message not found" }), { status: 404 });
    }

    const apiVersion = creds.api_version || "v22.0";
    const url = `https://graph.facebook.com/${apiVersion}/${creds.phone_number_id}/messages`;

    const metaPayload = {
      messaging_product: "whatsapp",
      to: message.phone_number,
      type: "text",
      text: { body: message.message_content },
    };

    const metaRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metaPayload),
    });

    const metaResult = await metaRes.json();
    const now = new Date().toISOString();

    if (!metaRes.ok) {
      const errMsg = metaResult?.error?.message || "Meta API error";
      await supabase.from("whatsapp_messages").update({
        status: "failed",
        failed_at: now,
        error_message: errMsg,
      }).eq("id", messageId);
      return new Response(JSON.stringify({ error: errMsg }), { status: 500 });
    }

    const providerMessageId = metaResult?.messages?.[0]?.id || null;

    await supabase.from("whatsapp_messages").update({
      status: "sent",
      provider_message_id: providerMessageId,
      sent_at: now,
    }).eq("id", messageId);

    await supabase.from("whatsapp_credentials").update({
      is_connected: true,
      last_health_check_at: now,
      health_check_passed: true,
    }).eq("clinic_id", clinicId);

    return new Response(JSON.stringify({ success: true, provider_message_id: providerMessageId }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
