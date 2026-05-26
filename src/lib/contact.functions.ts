import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ADMIN_EMAIL = "ousmanebarry073@gmail.com";

const ContactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  subject: z.string().trim().min(1).max(150),
  message: z.string().trim().min(50).max(2000),
});

export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((input) => ContactSchema.parse(input))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("contact_messages").insert({
      name: data.name,
      email: data.email,
      subject: data.subject,
      message: data.message,
    });
    if (error) throw new Error(error.message);

    // Best-effort email notification via Resend (only if configured)
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "MYKUTUB <onboarding@resend.dev>",
            to: [ADMIN_EMAIL],
            reply_to: data.email,
            subject: `[Contact MYKUTUB] ${data.subject}`,
            html: `
              <h2>Nouveau message de contact</h2>
              <p><strong>De :</strong> ${escapeHtml(data.name)} &lt;${escapeHtml(data.email)}&gt;</p>
              <p><strong>Sujet :</strong> ${escapeHtml(data.subject)}</p>
              <hr/>
              <p style="white-space:pre-wrap">${escapeHtml(data.message)}</p>
            `,
          }),
        });
      } catch (e) {
        console.error("Resend send failed", e);
      }
    }

    return { success: true };
  });

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
