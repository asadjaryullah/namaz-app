import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return;
  if (!process.env.VAPID_SUBJECT) throw new Error("VAPID_SUBJECT nicht gesetzt");
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  vapidConfigured = true;
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

// Sendet an alle Subscriptions in der Datenbank
export async function sendPushToAll(payload: PushPayload, logs: string[] = []) {
  ensureVapid();
  const { data: subs, error } = await getSupabase()
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth");

  if (error) {
    logs.push(`❌ push_subscriptions fetch error: ${error.message}`);
    return 0;
  }

  if (!subs?.length) {
    logs.push("⚠️ Keine Subscriptions gefunden");
    return 0;
  }

  logs.push(`📤 Sende an ${subs.length} Subscriber...`);

  let successCount = 0;
  const invalidIds: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
        successCount++;
      } catch (err: any) {
        // 410 Gone = Subscription ungültig → löschen
        if (err.statusCode === 410 || err.statusCode === 404) {
          invalidIds.push(sub.id);
          logs.push(`🗑️ Ungültige Subscription gelöscht: ${sub.endpoint.slice(-30)}`);
        } else {
          logs.push(`⚠️ Push fehlgeschlagen (${err.statusCode}): ${err.message}`);
        }
      }
    })
  );

  if (invalidIds.length > 0) {
    await getSupabase().from("push_subscriptions").delete().in("id", invalidIds);
  }

  logs.push(`✅ ${successCount}/${subs.length} erfolgreich gesendet`);
  return successCount;
}

// Sendet an einen bestimmten User (für Fahrer/Mitfahrer-Benachrichtigungen)
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
  logs: string[] = []
) {
  ensureVapid();
  const { data: subs, error } = await getSupabase()
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error) {
    logs.push(`❌ Subscription fetch error: ${error.message}`);
    return 0;
  }

  if (!subs?.length) {
    logs.push(`⚠️ Keine Subscription für User ${userId}`);
    return 0;
  }

  let successCount = 0;
  const invalidIds: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
        successCount++;
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          invalidIds.push(sub.id);
        } else {
          logs.push(`⚠️ Push fehlgeschlagen: ${err.message}`);
        }
      }
    })
  );

  if (invalidIds.length > 0) {
    await getSupabase().from("push_subscriptions").delete().in("id", invalidIds);
  }

  return successCount;
}
