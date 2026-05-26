// send-reservation-email: handles new request, confirmed, cancelled
import { corsHeaders, renderEmail, sendResendEmail, siteLink, shouldSend, logSent } from "../_shared/email.ts";

interface Body {
  userId: string; // recipient
  kind: "request" | "confirmed" | "cancelled";
  recipientName?: string;
  otherName?: string; // demandeur or donneur
  bookTitle: string;
  bookId?: string;
  chatId?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const b: Body = await req.json();
    const allow = await shouldSend({ userId: b.userId, emailType: `reservation_${b.kind}`, preferenceCol: "notify_reservations" });
    if (!allow.ok) return new Response(JSON.stringify({ skipped: allow.reason }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const name = b.recipientName ?? "";
    let subject = "", title = "", body = "", buttons: { label: string; url: string }[] = [];

    if (b.kind === "request") {
      subject = `📚 Nouvelle demande pour ${b.bookTitle}`;
      title = subject;
      body = `<p>Salam <strong>${name}</strong>,</p><p><strong>${b.otherName ?? "Un utilisateur"}</strong> souhaite obtenir votre livre « ${b.bookTitle} ».</p>`;
      buttons = [{ label: "Voir la demande", url: siteLink(b.bookId ? `/book/${b.bookId}` : "/messages") }];
    } else if (b.kind === "confirmed") {
      subject = "✅ Réservation confirmée !";
      title = subject;
      body = `<p>Salam <strong>${name}</strong>,</p><p><strong>${b.otherName ?? "Le donneur"}</strong> a confirmé votre réservation pour « ${b.bookTitle} ».</p>`;
      buttons = [{ label: "Envoyer un message", url: siteLink(b.chatId ? `/messages/${b.chatId}` : "/messages") }];
    } else {
      subject = "❌ Réservation annulée";
      title = subject;
      body = `<p>Salam <strong>${name}</strong>,</p><p>Votre réservation pour « ${b.bookTitle} » a été annulée.</p>`;
      buttons = [{ label: "Explorer le catalogue", url: siteLink("/catalog") }];
    }

    const html = renderEmail({ title, bodyHtml: body, buttons, recipientEmail: allow.email! });
    await sendResendEmail(allow.email!, subject, html);
    await logSent(b.userId, `reservation_${b.kind}`, b.bookId ?? null);
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
