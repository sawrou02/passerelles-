// send-welcome-email: sent on signup. No throttle (one-shot).
import { corsHeaders, renderEmail, sendResendEmail, siteLink, admin } from "../_shared/email.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { userId } = await req.json();
    if (!userId)
      return new Response(JSON.stringify({ error: "userId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const { data: u } = await admin.auth.admin.getUserById(userId);
    const email = u?.user?.email;
    if (!email)
      return new Response(JSON.stringify({ skipped: "no_email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const { data: profile } = await admin
      .from("profiles")
      .select("display_name,unsubscribed_all")
      .eq("id", userId)
      .maybeSingle();
    if (profile?.unsubscribed_all)
      return new Response(JSON.stringify({ skipped: "unsubscribed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const name = profile?.display_name ?? "";
    const html = renderEmail({
      title: "🌟 Bienvenue sur MyKutub !",
      bodyHtml: `<p>Salam <strong>${name}</strong>,</p>
        <p>Bienvenue sur MyKutub, la plateforme de partage de livres islamiques !</p>
        <p>Achetez, vendez ou donnez vos livres en Sadaqa Jariya, partout en Europe.</p>
        <p>JazakAllahu Khayran 🤲</p>`,
      buttons: [
        { label: "Explorer le catalogue", url: siteLink("/catalog") },
        { label: "Déposer une annonce", url: siteLink("/publish") },
      ],
      recipientEmail: email,
    });
    await sendResendEmail(email, "🌟 Bienvenue sur MyKutub !", html);
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
