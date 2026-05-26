// send-admin-email: verified badge, new follower, global admin notification
import { corsHeaders, renderEmail, sendResendEmail, siteLink, shouldSend, logSent } from "../_shared/email.ts";

interface Body {
  userId: string;
  kind: "verified" | "follower" | "global" | "warning" | "unsuspended" | "unbanned" | "account_deleted";
  recipientName?: string;
  followerName?: string;
  followerId?: string;
  reason?: string;
  note?: string;
  // global:
  title?: string;
  message?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const b: Body = await req.json();
    const prefCol = b.kind === "follower" ? "notify_followers" : "notify_admin";
    const allow = await shouldSend({ userId: b.userId, emailType: `admin_${b.kind}`, preferenceCol: prefCol });
    if (!allow.ok) return new Response(JSON.stringify({ skipped: allow.reason }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let subject = "", title = "", body = "", buttons: { label: string; url: string }[] = [];
    const name = b.recipientName ?? "";

    if (b.kind === "verified") {
      subject = "✅ Profil vérifié sur MyKutub !";
      title = subject;
      body = `<p>Salam <strong>${name}</strong>,</p>
        <p>Votre profil a été vérifié par notre équipe.</p>
        <p>Le badge ✅ est désormais visible sur votre profil, vos fiches livres et la messagerie.</p>
        <p>JazakAllahu Khayran 🤲</p>`;
    } else if (b.kind === "follower") {
      subject = `➕ ${b.followerName ?? "Quelqu'un"} vous suit sur MyKutub`;
      title = subject;
      body = `<p>Salam <strong>${name}</strong>,</p><p><strong>${b.followerName ?? "Un utilisateur"}</strong> a commencé à vous suivre.</p>`;
      buttons = [{ label: "Voir le profil", url: siteLink(b.followerId ? `/user/${b.followerId}` : "/") }];
    } else if (b.kind === "warning") {
      subject = "⚠️ Avertissement de la modération MyKutub";
      title = subject;
      body = `<p>Salam <strong>${name}</strong>,</p>
        <p>Vous avez reçu un avertissement de notre équipe de modération.</p>
        <p><strong>Raison :</strong> ${b.reason ?? "Non spécifiée"}</p>
        <p>Merci de vérifier que votre activité respecte les règles de MyKutub.</p>`;
    } else if (b.kind === "unsuspended") {
      subject = "✅ Votre compte MyKutub a été réactivé";
      title = subject;
      body = `<p>Salam <strong>${name}</strong>,</p>
        <p>Votre suspension a été levée. Vous pouvez à nouveau utiliser MyKutub normalement.</p>
        ${b.note ? `<p><em>Note de l'admin : ${b.note}</em></p>` : ""}`;
    } else if (b.kind === "unbanned") {
      subject = "✅ Votre compte MyKutub a été réactivé";
      title = subject;
      body = `<p>Salam <strong>${name}</strong>,</p>
        <p>Votre compte a été débanni. Bienvenue à nouveau sur MyKutub.</p>
        ${b.note ? `<p><em>Note de l'admin : ${b.note}</em></p>` : ""}`;
    } else if (b.kind === "account_deleted") {
      subject = "Suppression de votre compte MyKutub";
      title = subject;
      body = `<p>Salam <strong>${name}</strong>,</p>
        <p>Votre compte MyKutub a été supprimé par notre équipe de modération.</p>
        ${b.note ? `<p><em>Note : ${b.note}</em></p>` : ""}
        <p>Pour toute question, contactez-nous via notre formulaire de contact.</p>`;
    } else {
      subject = b.title ?? "Notification MyKutub";
      title = subject;
      body = `<p>${(b.message ?? "").replace(/\n/g, "<br/>")}</p>`;
    }

    const html = renderEmail({ title, bodyHtml: body, buttons, recipientEmail: allow.email! });
    await sendResendEmail(allow.email!, subject, html);
    await logSent(b.userId, `admin_${b.kind}`);
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
