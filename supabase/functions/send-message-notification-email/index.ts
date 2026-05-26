// send-message-notification-email: 1 email / chat / 30 min
import { corsHeaders, renderEmail, sendResendEmail, siteLink, shouldSend, logSent } from "../_shared/email.ts";

interface Body {
  userId: string;        // recipient
  recipientName?: string;
  senderName: string;
  preview: string;
  chatId: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const b: Body = await req.json();
    const allow = await shouldSend({
      userId: b.userId,
      emailType: "message",
      preferenceCol: "notify_messages",
      contextId: b.chatId,
      perContextWindowMinutes: 30,
    });
    if (!allow.ok) return new Response(JSON.stringify({ skipped: allow.reason }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const snippet = (b.preview ?? "").slice(0, 50) + ((b.preview ?? "").length > 50 ? "…" : "");
    const subject = `💬 Nouveau message de ${b.senderName}`;
    const html = renderEmail({
      title: subject,
      bodyHtml: `<p>Salam <strong>${b.recipientName ?? ""}</strong>,</p>
        <p><strong>${b.senderName}</strong> vous a envoyé un message :</p>
        <blockquote style="margin:8px 0;padding:10px 14px;border-left:3px solid #0d6e6e;background:#f0f4f4;border-radius:8px;color:#1a2424">${snippet}</blockquote>`,
      buttons: [{ label: "Répondre", url: siteLink(`/messages/${b.chatId}`) }],
      recipientEmail: allow.email!,
    });
    await sendResendEmail(allow.email!, subject, html);
    await logSent(b.userId, "message", b.chatId);
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
