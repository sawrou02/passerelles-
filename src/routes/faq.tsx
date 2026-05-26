import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, BookOpen, ShoppingBag, Shield, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Questions fréquentes | MYKUTUB" },
      { name: "description", content: "Toutes les réponses à vos questions sur MYKUTUB." },
      { property: "og:title", content: "FAQ — MYKUTUB" },
      { property: "og:url", content: "https://mykutub.lovable.app/faq" },
    ],
    links: [{ rel: "canonical", href: "https://mykutub.lovable.app/faq" }],
  }),
  component: Faq,
});

function Faq() {
  const { t } = useTranslation();
  const categories = [
    { icon: HelpCircle, title: t("faq.catGeneral"), keys: ["g1", "g2", "g3"] },
    { icon: BookOpen, title: t("faq.catSell"), keys: ["s1", "s2", "s3", "s4"] },
    { icon: ShoppingBag, title: t("faq.catBuy"), keys: ["b1", "b2", "b3"] },
    { icon: Shield, title: t("faq.catSecurity"), keys: ["sec1", "sec2"] },
  ];

  return (
    <div className="bg-background">
      <section className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-16 md:py-24 text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
            <HelpCircle size={14} /> {t("faq.badge")}
          </div>
          <h1 className="font-headline text-4xl md:text-6xl font-black text-primary">{t("faq.title")}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t("faq.subtitle")}</p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 md:px-8 py-12 md:py-16 space-y-12">
        {categories.map((cat) => (
          <section key={cat.title} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <cat.icon size={20} />
              </div>
              <h2 className="font-headline text-2xl md:text-3xl font-black text-primary">{cat.title}</h2>
            </div>
            <Accordion type="single" collapsible className="space-y-3">
              {cat.keys.map((k) => (
                <AccordionItem key={k} value={`${cat.title}-${k}`} className="bg-card border border-border rounded-2xl px-5 md:px-6 last:border-b">
                  <AccordionTrigger className="font-bold text-left hover:no-underline py-5">{t(`faq.items.${k}q`)}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-5">{t(`faq.items.${k}a`)}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ))}

        <div className="bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 rounded-3xl p-8 md:p-10 text-center space-y-4">
          <h3 className="font-headline text-xl md:text-2xl font-black">{t("faq.moreTitle")}</h3>
          <p className="text-muted-foreground">{t("faq.moreText")}</p>
          <Link to="/contact" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold hover:opacity-90 transition">
            {t("faq.contactUs")} <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}
