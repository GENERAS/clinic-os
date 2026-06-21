import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // GET: Webhook verification (Meta handshake)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token && challenge) {
      const { data: cred } = await supabase
        .from("whatsapp_credentials")
        .select("webhook_verify_token")
        .eq("webhook_verify_token", token)
        .maybeSingle();

      if (cred) {
        return new Response(challenge, { status: 200 });
      }
    }
    return new Response("Verification failed", { status: 403 });
  }

  // POST: Status update callbacks + inbound messages from Meta
  if (req.method === "POST") {
    try {
      const payload = await req.json();

      const entries = payload?.entry || [];
      for (const entry of entries) {
        const changes = entry?.changes || [];
        for (const change of changes) {
          const value = change?.value;
          if (!value) continue;

          const metadata = value.metadata;
          const phoneNumberId = metadata?.phone_number_id;

          const statuses = value.statuses || [];
          for (const status of statuses) {
            const providerMessageId = status.id;
            const statusName = status.status;
            const timestamp = status.timestamp;
            const dateStr = timestamp
              ? new Date(Number(timestamp) * 1000).toISOString()
              : new Date().toISOString();

            const statusDb =
              statusName === "sent" ? "sent" :
              statusName === "delivered" ? "delivered" :
              statusName === "read" ? "read" : "failed";

            const updateData: Record<string, unknown> = { status: statusDb };
            if (statusDb === "sent") updateData.sent_at = dateStr;
            else if (statusDb === "delivered") updateData.delivered_at = dateStr;
            else if (statusDb === "read") updateData.read_at = dateStr;
            else if (statusDb === "failed") {
              updateData.failed_at = dateStr;
              updateData.error_message = status.errors?.[0]?.title || null;
            }

            await supabase
              .from("whatsapp_messages")
              .update(updateData)
              .eq("provider_message_id", providerMessageId);
          }

          // --- Inbound messages from patients ---
          const messages = value.messages || [];
          for (const msg of messages) {
            if (msg.type !== "text") continue;
            const fromNumber = msg.from;
            const textBody = (msg.text?.body || "").trim().toLowerCase();

            // Lookup clinic by phone_number_id
            let clinicId: string | null = null;
            if (phoneNumberId) {
              const { data: cred } = await supabase
                .from("whatsapp_credentials")
                .select("clinic_id")
                .eq("phone_number_id", phoneNumberId)
                .maybeSingle();
              if (cred) clinicId = cred.clinic_id;
            }

            if (!clinicId) continue;

            // Store inbound message
            await supabase.from("whatsapp_messages").insert({
              clinic_id: clinicId,
              phone_number: fromNumber,
              message_content: msg.text?.body || "",
              message_type: "inbound",
              provider: "meta",
              provider_message_id: msg.id,
              status: "received",
              received_at: new Date().toISOString(),
              direction: "inbound",
            }).then().catch(() => {});

            // Process reply: "1" -> confirm appointment, "2" -> mark available
            const { data: conversation } = await supabase
              .from("whatsapp_conversations")
              .select("*")
              .eq("clinic_id", clinicId)
              .eq("phone_number", fromNumber)
              .eq("session_status", "active")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (conversation) {
              const step = conversation.current_step || "menu";

              if (step === "awaiting_confirmation") {
                if (textBody === "1") {
                  const { data: appointment } = await supabase
                    .from("appointments")
                    .select("id, patient_id")
                    .eq("clinic_id", clinicId)
                    .eq("id", conversation.context?.appointmentId)
                    .maybeSingle();
                  if (appointment) {
                    await supabase.from("appointments")
                      .update({ status: "confirmed", updated_at: new Date().toISOString() })
                      .eq("id", appointment.id);
                  }
                  await supabase.from("whatsapp_conversations")
                    .update({ session_status: "completed", ended_at: new Date().toISOString() })
                    .eq("id", conversation.id);
                } else if (textBody === "2") {
                  await supabase.from("appointments")
                    .update({ status: "available", updated_at: new Date().toISOString() })
                    .eq("id", conversation.context?.appointmentId)
                    .eq("clinic_id", clinicId);
                  await supabase.from("whatsapp_conversations")
                    .update({ session_status: "completed", ended_at: new Date().toISOString() })
                    .eq("id", conversation.id);
                }
              } else if (step === "menu" || step === "general") {
                if (textBody === "1" || textBody.includes("book")) {
                  await supabase.from("whatsapp_conversations")
                    .update({ current_step: "booking_date", conversation_type: "booking" })
                    .eq("id", conversation.id);
                } else if (textBody === "2" || textBody.includes("hour")) {
                  const { data: hours } = await supabase
                    .from("clinic_operating_hours")
                    .select("day_of_week, open_time, close_time, is_open")
                    .eq("clinic_id", clinicId)
                    .order("day_of_week");
                  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                  const hoursText = (hours || []).map((h) =>
                    `${dayNames[h.day_of_week % 7]}: ${h.is_open ? `${(h.open_time || "").substring(0, 5)} - ${(h.close_time || "").substring(0, 5)}` : "Closed"}`
                  ).join("\n");
                  await sendReply(supabase, clinicId, phoneNumberId, fromNumber,
                    `Our hours:\n${hoursText}\n\nReply 'MENU' for main menu.`);
                } else if (textBody === "3" || textBody.includes("direction")) {
                  const { data: clinic } = await supabase.from("clinics").select("name, address").eq("id", clinicId).single();
                  const address = clinic?.address || "Please call the clinic for directions.";
                  await sendReply(supabase, clinicId, phoneNumberId, fromNumber,
                    `${clinic?.name}\n${address}\n\nReply 'MENU' for main menu.`);
                } else if (textBody === "4" || textBody.includes("contact") || textBody.includes("reception")) {
                  const { data: clinic } = await supabase.from("clinics").select("phone, email").eq("id", clinicId).single();
                  await sendReply(supabase, clinicId, phoneNumberId, fromNumber,
                    `Phone: ${clinic?.phone || "N/A"}\nEmail: ${clinic?.email || "N/A"}\n\nReply 'MENU' for main menu.`);
                } else {
                  await sendReply(supabase, clinicId, phoneNumberId, fromNumber,
                    `Welcome! Reply with:\n1. Book Appointment\n2. Clinic Hours\n3. Directions\n4. Contact Reception`);
                }
              }
            } else {
              // New conversation — start with menu
              await supabase.from("whatsapp_conversations").insert({
                clinic_id: clinicId,
                phone_number: fromNumber,
                session_status: "active",
                conversation_type: "general",
                current_step: "menu",
              }).then().catch(() => {});
              await sendReply(supabase, clinicId, phoneNumberId, fromNumber,
                `Welcome! Reply with:\n1. Book Appointment\n2. Clinic Hours\n3. Directions\n4. Contact Reception`);
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});

async function sendReply(
  supabase: any,
  clinicId: string,
  phoneNumberId: string,
  to: string,
  text: string,
) {
  const { data: creds } = await supabase
    .from("whatsapp_credentials")
    .select("access_token, api_version")
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (!creds?.access_token) return;

  const apiVersion = creds.api_version || "v22.0";
  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  }).catch(() => {});

  await supabase.from("whatsapp_messages").insert({
    clinic_id: clinicId,
    phone_number: to,
    message_content: text,
    message_type: "inbound_reply",
    provider: "meta",
    status: "sent",
    direction: "outbound",
    sent_at: new Date().toISOString(),
  }).then().catch(() => {});
}
