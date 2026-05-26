import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Mail, Clock, Globe, Instagram, Send, ArrowRight, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { submitContactMessage } from "@/lib/contact.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Nous contacter — Support MYKUTUB" },
      { name: "description", content: "Une question sur MYKUTUB ? Contactez notre équipe." },
      { property: "og:url", content: "https://mykutub.lovable.app/contact" },
    ],
    links: [{ rel: "canonical", href: "https://mykutub.lovable.app/contact" }],
  }),
  component: Contact,
});

function Contact() {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = useServerFn(submitContactMessage);
  const subjects = [t("contact.subj1"), t("contact.subj2"), t("contact.subj3"), t("contact.subj4"), t("contact.subj5")];

  const schema = z.object({
    name: z.string().trim().min(2, t("contact.errNameMin")).max(100),
    email: z.string().trim().email(t("contact.errEmail")).max(255),
    subject: z.string().min(1, t("contact.errSubject")),
    message: z.string().trim().min(50, t("contact.errMsgMin")).max(2000),
  });

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      name: String(fd.get("name") || ""),
      email: String(fd.get("email") || ""),
      subject: String(fd.get("subject") || ""),
      message: String(fd.get("message") || ""),
    };
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as string;
        if (!errs[k]) errs[k] = issue.message;
      }
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await submit({ data: parsed.data });
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err?.message ?? t("contact.sendError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-background">
      <section className="relative overflow-hidden bg-[oklch(0.28_0.06_155)] text-white">
        <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]" />
        <div className="relative max-w-5xl mx-auto px-4 md:px-8 py-16 md:py-24 text-center space-y-4">
          <h1 className="font-headline text-4xl md:text-6xl font-black">{t("contact.title")}</h1>
          <p className="text-lg md:text-xl text-white/85 max-w-2xl mx-auto">{t("contact.subtitle")}</p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 md:px-8 py-12 md:py-20 grid lg:grid-cols-[1.3fr_1fr] gap-10">
        <div>
          {submitted ? (
            <div className="bg-card border border-secondary/30 rounded-3xl p-10 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-secondary/15 text-secondary flex items-center justify-center">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="font-headline text-2xl md:text-3xl font-black text-secondary">{t("contact.successTitle")}</h2>
              <p className="text-muted-foreground max-w-md mx-auto">{t("contact.successText")}</p>
              <Button variant="outline" onClick={() => setSubmitted(false)}>{t("contact.sendAnother")}</Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="bg-card border border-border rounded-3xl p-6 md:p-8 space-y-5 shadow-sm">
              <div className="space-y-2">
                <Label htmlFor="name">{t("contact.name")} <span className="text-destructive">*</span></Label>
                <Input id="name" name="name" placeholder={t("contact.namePlaceholder")} />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("contact.email")} <span className="text-destructive">*</span></Label>
                <Input id="email" name="email" type="email" placeholder={t("contact.emailPlaceholder")} />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">{t("contact.subject")} <span className="text-destructive">*</span></Label>
                <select id="subject" name="subject" defaultValue=""
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="" disabled>{t("contact.chooseSubject")}</option>
                  {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.subject && <p className="text-sm text-destructive">{errors.subject}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">{t("contact.message")} <span className="text-destructive">*</span></Label>
                <Textarea id="message" name="message" rows={7} placeholder={t("contact.msgPlaceholder")} />
                {errors.message && <p className="text-sm text-destructive">{errors.message}</p>}
              </div>
              <Button type="submit" disabled={submitting}
                className="w-full h-13 py-6 rounded-xl font-black text-base bg-secondary text-secondary-foreground hover:opacity-90">
                <Send size={18} /> {submitting ? t("common.sending") : t("common.send")}
              </Button>
            </form>
          )}
        </div>

        <aside className="space-y-6">
          <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
            <h2 className="font-headline text-lg font-black">{t("contact.info")}</h2>
            {[
              { emoji: "📧", label: t("contact.infoEmail"), value: "contact@mykutub.com" },
              { emoji: "⏱️", label: t("contact.infoTime"), value: t("contact.infoTimeVal") },
              { emoji: "🌍", label: t("contact.infoBased"), value: t("contact.infoBasedVal") },
            ].map((c) => (
              <div key={c.label} className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl shrink-0">{c.emoji}</div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold">{c.label}</div>
                  <div className="font-medium">{c.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 rounded-3xl p-6 space-y-4">
            <h3 className="font-headline text-lg font-black">{t("contact.joinCommunity")}</h3>
            <div className="flex gap-3">
              {[
                { label: "Instagram", icon: Instagram, href: "#" },
                { label: "WhatsApp", icon: Send, href: "#" },
                { label: "Telegram", icon: Send, href: "#" },
              ].map((s) => (
                <a key={s.label} href={s.href} aria-label={s.label}
                  className="w-12 h-12 rounded-2xl bg-card border border-border text-primary hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition">
                  <s.icon size={20} />
                </a>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="max-w-6xl mx-auto px-4 md:px-8 pb-20">
        <h2 className="font-headline text-2xl md:text-3xl font-black text-primary text-center mb-6">{t("contact.quickFaq")}</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[t("contact.q1"), t("contact.q2"), t("contact.q3")].map((q) => (
            <Link key={q} to="/faq"
              className="group bg-card border border-border rounded-2xl p-5 flex items-center justify-between gap-3 hover:border-primary/40 hover:shadow-md transition">
              <span className="font-bold">{q}</span>
              <ArrowRight size={18} className="text-primary shrink-0 group-hover:translate-x-1 transition-transform" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
