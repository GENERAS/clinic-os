import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const PROVIDERS = ["africastalking", "twilio"] as const;
type Provider = (typeof PROVIDERS)[number];

function isProvider(value: unknown): value is Provider {
  return typeof value === "string" && (PROVIDERS as readonly string[]).includes(value);
}

async function sendViaAfricasTalking(config: Record<string, unknown>, senderId: string | null, phoneNumber: string, content: string) {
  const username = config.username;
  const apiKey = config.apiKey;
  if (!username || !apiKey) {
    return { ok: false, error: "Africa's Talking username/apiKey not configured", messageId: null };
  }

  const body = new URLSearchParams();
  body.set("username", String(username));
  body.set("to", phoneNumber);
  body.set("message", content);
  if (senderId) body.set("from", senderId);

  const res = await fetch("https://api.africastalking.com/version1/messaging", {
    method: "POST",
    headers: {
      apiKey: String(apiKey),
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const result = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: result?.message || "Africa's Talking API error", messageId: null };
  }

  const recipient = result?.SMSMessageData?.Recipients?.[0];
  const messageId = recipient?.messageId || null;
  if (recipient?.status === "Rejected" || recipient?.status?.startsWith("Error")) {
    return { ok: false, error: recipient.status, messageId };
  }
  return { ok: true, error: null, messageId };
}

async function sendViaTwilio(config: Record<string, unknown>, senderId: string | null, phoneNumber: string, content: string) {
  const accountSid = config.accountSid;
  const authToken = config.authToken;
  const from = config.from || senderId;
  if (!accountSid || !authToken || !from) {
    return { ok: false, error: "Twilio accountSid/authToken/from not configured", messageId: null };
  }

  const credentials = btoa(`${accountSid}:${authToken}`);
  const body = new URLSearchParams();
  body.set("From", from);
  body.set("To", phoneNumber);
  body.set("Body", content);

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const result = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: result?.message || "Twilio API error", messageId: null };
  }
  return { ok: !result?.error_code, error: result?.error_message || result?.error_code || null, messageId: result?.sid || null };
}

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
      .from("sms_credentials")
      .select("provider, sender_id, config, is_enabled")
      .eq("clinic_id", clinicId)
      .single();

    if (!creds || !creds.is_enabled) {
      await supabase.from("whatsapp_messages").update({
        status: "failed",
        failed_at: new Date().toISOString(),
        error_message: "SMS not configured",
      }).eq("id", messageId);
      return new Response(JSON.stringify({ error: "SMS not configured" }), { status: 400 });
    }

    const { data: message } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("id", messageId)
      .single();

    if (!message || !message.phone_number) {
      return new Response(JSON.stringify({ error: "Message not found" }), { status: 404 });
    }

    if (!isProvider(creds.provider)) {
      await supabase.from("whatsapp_messages").update({
        status: "failed",
        failed_at: new Date().toISOString(),
        error_message: `Unsupported SMS provider: ${creds.provider}`,
      }).eq("id", messageId);
      return new Response(JSON.stringify({ error: "Unsupported SMS provider" }), { status: 500 });
    }

    const config = (creds.config || {}) as Record<string, unknown>;
    const sendResult = creds.provider === "twilio"
      ? await sendViaTwilio(config, creds.sender_id, message.phone_number, message.message_content)
      : await sendViaAfricasTalking(config, creds.sender_id, message.phone_number, message.message_content);

    const now = new Date().toISOString();

    if (!sendResult.ok) {
      await supabase.from("whatsapp_messages").update({
        status: "failed",
        failed_at: now,
        error_message: sendResult.error || "SMS provider error",
      }).eq("id", messageId);
      return new Response(JSON.stringify({ error: sendResult.error || "SMS provider error" }), { status: 500 });
    }

    await supabase.from("whatsapp_messages").update({
      status: "sent",
      provider_message_id: sendResult.messageId,
      sent_at: now,
    }).eq("id", messageId);

    await supabase.from("sms_credentials").update({
      connection_status: "connected",
      last_health_check_at: now,
      health_check_passed: true,
    }).eq("clinic_id", clinicId);

    return new Response(JSON.stringify({ success: true, provider_message_id: sendResult.messageId }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});