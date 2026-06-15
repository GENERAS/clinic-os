import { createClient } from "@/lib/supabase/client";

const SIMULATION_DELAYS = {
  queued: 2000,
  sent: 3000,
  delivered: 5000,
};

export function getWhatsAppSimulationService() {
  const supabase = createClient();

  function getMode() {
    return import.meta.env.WHATSAPP_MODE || "simulation";
  }

  function isProduction() {
    return getMode() === "production";
  }

  async function simulateMessageLifecycle(messageId, clinicId) {
    const lifecycle = ["sent", "delivered", "read"];
    let cumulativeDelay = 0;

    for (const status of lifecycle) {
      cumulativeDelay += SIMULATION_DELAYS[status === "sent" ? "queued" : status === "delivered" ? "sent" : "delivered"] || 3000;
      const updateData = { status };
      const now = new Date(Date.now() + cumulativeDelay).toISOString();

      if (status === "sent") updateData.sent_at = now;
      else if (status === "delivered") updateData.delivered_at = now;
      else if (status === "read") updateData.read_at = now;
      updateData.provider_message_id = `sim_${messageId}_${status}_${Date.now()}`;

      setTimeout(async () => {
        try {
          await supabase.from("whatsapp_messages").update(updateData).eq("id", messageId);
        } catch {}
      }, cumulativeDelay);
    }
  }

  async function sendMessage(clinicId, values) {
    if (isProduction()) {
      const efBase = (() => {
        const url = import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
        if (!url) return null;
        const ref = url.replace("https://", "").split(".")[0];
        return `https://${ref}.supabase.co/functions/v1`;
      })();

      const { data: message, error } = await supabase
        .from("whatsapp_messages")
        .insert({ ...values, clinic_id: clinicId, provider: "meta", status: "queued", direction: "outbound" })
        .select().single();
      if (error) throw error;

      try {
        if (efBase) {
          const edgeRes = await fetch(`${efBase}/send-whatsapp`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
            body: JSON.stringify({ messageId: message.id, clinicId }),
          });
          if (edgeRes.ok) {
            await supabase.from("whatsapp_messages").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", message.id);
            return { ...message, status: "sent" };
          }
        }
        throw new Error("Edge function unavailable");
      } catch {
        await supabase.from("whatsapp_messages").update({ status: "failed", failed_at: new Date().toISOString(), error_message: "Production send failed" }).eq("id", message.id);
        return { ...message, status: "failed" };
      }
    }

    const { data: message, error } = await supabase
      .from("whatsapp_messages")
      .insert({ ...values, clinic_id: clinicId, provider: "simulation", status: "queued", direction: "outbound" })
      .select().single();
    if (error) throw error;

    simulateMessageLifecycle(message.id, clinicId);
    return { ...message, status: "queued" };
  }

  async function simulateInboundMessage(clinicId, phoneNumber, content, conversationType) {
    const { data: message, error } = await supabase
      .from("whatsapp_messages")
      .insert({
        clinic_id: clinicId,
        phone_number: phoneNumber,
        message_type: conversationType || "inbound",
        message_content: content,
        status: "received",
        direction: "inbound",
        provider: "simulation",
      })
      .select().single();
    if (error) throw error;
    return message;
  }

  async function generateWebhookEvent(clinicId, messageId, eventType) {
    const eventTypes = {
      "message.sent": { status: "sent", field: "sent_at" },
      "message.delivered": { status: "delivered", field: "delivered_at" },
      "message.read": { status: "read", field: "read_at" },
      "message.failed": { status: "failed", field: "failed_at" },
    };

    const event = eventTypes[eventType];
    if (!event) return null;

    const now = new Date().toISOString();
    await supabase.from("whatsapp_messages").update({ status: event.status, [event.field]: now, error_message: eventType === "message.failed" ? "Simulated failure" : null }).eq("id", messageId);

    return { messageId, event: eventType, timestamp: now };
  }

  return {
    getMode,
    isProduction,
    sendMessage,
    simulateMessageLifecycle,
    simulateInboundMessage,
    generateWebhookEvent,
  };
}
