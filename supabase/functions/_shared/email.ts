// Shared email helper for MyKutub edge functions
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FROM = "MyKutub <onboarding@resend.dev>";
const ADMIN = "admin@mykutub.com";
const SITE = "https://mykutub.lovable.app";
const TEAL = "#0d6e6e";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const admin = createClient(SUPABASE_URL, SERVICE_KEY);

export interface EmailButton {
  label: string;
  url: string;
}

export function renderEmail(opts: {
  title: string;
  bodyHtml: string;
  buttons?: EmailButton[];
  recipientEmail: string;
}): string {
  const buttons = (opts.buttons ?? [])
    .map(
      (b) => `
    <a href="${b.url}" style="display:inline-block;background:${TEAL};color:#fff;text-decoration:none;padding:12px 22px;border-radius:12px;font-weight:700;margin:6px 6px 0 0;font-family:Arial,sans-serif">${b.label}</a>
  `,
    )
    .join("");
  const unsub = `${SITE}/unsubscribe?email=${encodeURIComponent(opts.recipientEmail)}`;
  return `<!doctype html><html><body style="margin:0;background:#f5f7f7;font-family:Arial,sans-serif;color:#1a2424">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7f7;padding:24px 12px">
      <tr><td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(13,110,110,.08)">
          <tr><td style="background:${TEAL};padding:20px 24px"><div style="color:#fff;font-size:22px;font-weight:900;letter-spacing:.5px">📚 MyKutub</div></td></tr>
          <tr><td style="padding:28px 24px">
            <h1 style="margin:0 0 14px;font-size:20px;color:${TEAL}">${opts.title}</h1>
            <div style="font-size:15px;line-height:1.55">${opts.bodyHtml}</div>
            ${buttons ? `<div style="margin-top:22px">${buttons}</div>` : ""}
          </td></tr>
          <tr><td style="padding:18px 24px;background:#f0f4f4;font-size:12px;color:#586b6b;text-align:center">
            © MyKutub — partout en Europe<br/>
            <a href="${unsub}" style="color:${TEAL}">Se désabonner</a> ·
            <a href="${SITE}/privacy" style="color:${TEAL}">Politique de confidentialité</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}

export async function sendResendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html, reply_to: ADMIN }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.warn("Resend skipped", res.status, err);
    // Best-effort: don't fail the calling action (e.g. admin sanction)
    // when Resend is in sandbox mode (403) or rate-limited (429).
    return { skipped: true, status: res.status, error: err };
  }
  return await res.json();
}

// Returns true if email is allowed (passes all anti-spam + preference checks).
// ⚠️ Cette fonction ne logue PAS l'envoi — l'appelant doit ensuite invoquer
// logSent() pour réserver le quota de manière atomique (anti race-condition).
//
// L'usage typique est : check via shouldSend → si ok, immédiatement logSent
// (qui re-vérifie atomiquement). Si logSent renvoie false, ne pas envoyer.
export async function shouldSend(opts: {
  userId: string;
  emailType: string;
  preferenceCol?: "notify_reservations" | "notify_messages" | "notify_followers" | "notify_admin";
  contextId?: string;
  perContextWindowMinutes?: number; // e.g. 30 for messages
}): Promise<{ ok: boolean; email?: string; reason?: string }> {
  const { data: profile } = await admin
    .from("profiles")
    .select("unsubscribed_all,notify_reservations,notify_messages,notify_followers,notify_admin")
    .eq("id", opts.userId)
    .maybeSingle();
  if (!profile) return { ok: false, reason: "no_profile" };
  if (profile.unsubscribed_all) return { ok: false, reason: "unsubscribed_all" };
  const prefs = profile as Record<string, boolean | null>;
  if (opts.preferenceCol && !prefs[opts.preferenceCol]) {
    return { ok: false, reason: "pref_off" };
  }

  // Resolve email from auth.users
  const { data: u } = await admin.auth.admin.getUserById(opts.userId);
  const email = u?.user?.email;
  if (!email) return { ok: false, reason: "no_email" };

  return { ok: true, email };
}

// Logue un envoi de manière ATOMIQUE via la RPC email_throttle_try_log qui
// prend un advisory lock sur l'user_id, re-vérifie les caps (5/jour,
// 1/contexte/fenêtre) et insert dans la même transaction. Renvoie true si
// le log a été créé (= l'email peut partir), false si un cap est atteint.
//
// Remplace l'ancien helper logSent() qui se contentait d'un INSERT sans
// vérification — pouvant générer des dépassements en cas d'appels parallèles.
export async function logSent(
  userId: string,
  emailType: string,
  contextId?: string,
  perContextWindowMinutes?: number,
): Promise<boolean> {
  const { data, error } = await admin.rpc("email_throttle_try_log", {
    _user_id: userId,
    _email_type: emailType,
    _context_id: contextId ?? null,
    _per_context_window_minutes: perContextWindowMinutes ?? null,
  });
  if (error) {
    console.error("email_throttle_try_log failed", error);
    return false;
  }
  return data === true;
}

export function siteLink(path: string) {
  return `${SITE}${path}`;
}
