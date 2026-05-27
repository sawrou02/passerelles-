// Thin helper to invoke MyKutub email edge functions from the client.
// Best-effort: failures are logged but never block the user flow.
import { supabase } from "@/integrations/supabase/client";

type Fn =
  | "send-welcome-email"
  | "send-reservation-email"
  | "send-message-notification-email"
  | "send-admin-email"
  | "send-suspension-email";

export async function sendEmail(fn: Fn, body: Record<string, unknown>) {
  try {
    const { error } = await supabase.functions.invoke(fn, { body });
    if (error) console.warn(`[email:${fn}]`, error.message);
  } catch (e) {
    console.warn(`[email:${fn}] failed`, e);
  }
}
