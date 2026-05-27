// send-suspension-email: suspension or definitive ban (no preference filter — moderation)
import {
  corsHeaders,
  renderEmail,
  sendResendEmail,
  sendResendEmail as _,
  admin,
} from "../_shared/email.ts";

interface Body {
  userId: string;
  kind: "suspended" | "banned";
  recipientName?: string;
  reason: string;
  duration?: string; // for suspended: "7 jours", "30 jours", "90 jours"
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const b: Body = await req.json();
    const { data: u } = await admin.auth.admin.getUserById(b.userId);
    const email = u?.user?.email;
    if (!email)
      return new Response(JSON.stringify({ skipped: "no_email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const name = b.recipientName ?? "";
    let subject = "",
      title = "",
      body = "";
    if (b.kind === "suspended") {
      subject = "⚠️ Compte suspendu";
      title = subject;
      body = `<p>Salam <strong>${name}</strong>,</p>
        <p>Votre compte a été <strong>suspendu</strong>.</p>
        <p><strong>Raison :</strong> ${b.reason}<br/>
           <strong>Durée :</strong> ${b.duration ?? "—"}</p>
        <p>Pour toute question : <a href="mailto:admin@mykutub.com" style="color:#0d6e6e">admin@mykutub.com</a></p>`;
    } else {
      subject = "🚫 Compte banni";
      title = subject;
      body = `<p>Votre compte a été <strong>définitivement banni</strong> de MyKutub.</p>
        <p><strong>Raison :</strong> ${b.reason}</p>
        <p>Contact : <a href="mailto:admin@mykutub.com" style="color:#0d6e6e">admin@mykutub.com</a></p>`;
    }

    const html = renderEmail({ title, bodyHtml: body, recipientEmail: email });
    await sendResendEmail(email, subject, html);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
