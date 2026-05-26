// send-phone-verification: emails a 6-digit code to verify the user's phone number.
import { corsHeaders, renderEmail, sendResendEmail, admin } from "../_shared/email.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = userData.user.id;
    const email = userData.user.email;
    if (!email) {
      return new Response(JSON.stringify({ error: "No email" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const phoneRaw = (body?.phone ?? "").toString().trim();
    if (!/^[+0-9 ().-]{6,20}$/.test(phoneRaw)) {
      return new Response(JSON.stringify({ error: "Numéro invalide" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Throttle: 60s between sends per user
    const { data: existing } = await admin.from("phone_verifications").select("last_sent_at").eq("user_id", userId).maybeSingle();
    if (existing?.last_sent_at) {
      const elapsed = Date.now() - new Date(existing.last_sent_at).getTime();
      if (elapsed < 60_000) {
        const wait = Math.ceil((60_000 - elapsed) / 1000);
        return new Response(JSON.stringify({ error: `Patientez ${wait}s avant de redemander un code.` }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60_000).toISOString();
    const { error: upErr } = await admin.from("phone_verifications").upsert({
      user_id: userId,
      phone: phoneRaw,
      code,
      expires_at: expires,
      last_sent_at: new Date().toISOString(),
      attempts: 0,
    });
    if (upErr) throw upErr;

    const { data: profile } = await admin.from("profiles").select("display_name").eq("id", userId).maybeSingle();
    const name = profile?.display_name ?? "";
    const html = renderEmail({
      title: "🔐 Votre code de vérification MyKutub",
      bodyHtml: `<p>Salam <strong>${name}</strong>,</p>
        <p>Pour vérifier votre numéro de téléphone <strong>${phoneRaw}</strong>, saisissez ce code à 6 chiffres dans MyKutub :</p>
        <div style="font-size:32px;font-weight:900;letter-spacing:8px;text-align:center;background:#f0f4f4;color:#0d6e6e;padding:18px;border-radius:12px;margin:18px 0">${code}</div>
        <p style="font-size:13px;color:#586b6b">Ce code expire dans 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>`,
      recipientEmail: email,
    });
    await sendResendEmail(email, "🔐 Votre code de vérification MyKutub", html);
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
