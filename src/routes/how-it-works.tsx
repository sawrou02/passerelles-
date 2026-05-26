import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Camera, MessageCircle, Handshake, Search, ShoppingBag, Gift } from "lucide-react";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "Comment ça marche — Acheter et vendre des livres islamiques | MYKUTUB" },
      { name: "description", content: "En 3 étapes simples : créez votre compte, publiez votre annonce, échangez avec la communauté. 100% gratuit, 100% islamique." },
      { property: "og:title", content: "Comment ça marche | MYKUTUB" },
      { property: "og:description", content: "Acheter, vendre ou donner un livre islamique en 3 étapes simples." },
      { property: "og:url", content: "https://mykutub.lovable.app/how-it-works" },
    ],
    links: [{ rel: "canonical", href: "https://mykutub.lovable.app/how-it-works" }],
  }),
  component: HowItWorks,
});

function HowItWorks() {
  const { t } = useTranslation();
  const sellerSteps = [
    { icon: Camera, title: t("hiw.s1t"), text: t("hiw.s1x") },
    { icon: MessageCircle, title: t("hiw.s2t"), text: t("hiw.s2x") },
    { icon: Handshake, title: t("hiw.s3t"), text: t("hiw.s3x") },
  ];
  const buyerSteps = [
    { icon: Search, title: t("hiw.b1t"), text: t("hiw.b1x") },
    { icon: MessageCircle, title: t("hiw.b2t"), text: t("hiw.b2x") },
    { icon: ShoppingBag, title: t("hiw.b3t"), text: t("hiw.b3x") },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-12 md:py-20 space-y-20">
      <div className="text-center space-y-4">
        <h1 className="font-headline text-4xl md:text-6xl font-black">{t("hiw.title")}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t("hiw.subtitle")}</p>
      </div>

      <section className="space-y-8">
        <h2 className="font-headline text-2xl md:text-3xl font-bold">{t("hiw.sellHead")}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {sellerSteps.map((s) => (
            <div key={s.title} className="bg-card border rounded-3xl p-6">
              <div className="w-12 h-12 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center mb-4">
                <s.icon size={22} />
              </div>
              <h3 className="font-bold mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
        <Button asChild size="lg" className="rounded-2xl">
          <Link to="/publish">{t("hiw.publishMine")}</Link>
        </Button>
      </section>

      <section className="space-y-8">
        <h2 className="font-headline text-2xl md:text-3xl font-bold">{t("hiw.buyHead")}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {buyerSteps.map((s) => (
            <div key={s.title} className="bg-card border rounded-3xl p-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <s.icon size={22} />
              </div>
              <h3 className="font-bold mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
        <Button asChild size="lg" variant="outline" className="rounded-2xl">
          <Link to="/catalog">{t("hiw.seeCatalog")}</Link>
        </Button>
      </section>

      <div className="bg-secondary/10 border border-secondary/20 rounded-3xl p-8 md:p-12 flex items-start gap-4">
        <Gift className="text-secondary shrink-0 mt-1" size={28} />
        <div>
          <h3 className="font-headline text-xl font-bold mb-2">{t("hiw.sadaqaTitle")}</h3>
          <p className="text-muted-foreground">{t("hiw.sadaqaText")}</p>
        </div>
      </div>
    </div>
  );
}
