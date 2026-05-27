import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Heart, PlusCircle, ShieldCheck, Sparkles } from "lucide-react";
import { BookCard } from "@/components/BookCard";
import { supabase } from "@/integrations/supabase/client";
import type { Book } from "@/lib/mykutub";
import heroImage from "@/assets/hero-books.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MYKUTUB — Acheter et vendre des livres islamiques d'occasion en Europe" },
      {
        name: "description",
        content:
          "Marketplace gratuite dédiée aux livres de science islamique d'occasion. Achetez, vendez ou donnez vos livres en Sadaqa Jariya. Communauté musulmane de confiance en Europe.",
      },
      {
        name: "keywords",
        content:
          "livres islamiques occasion, livres science islamique, marketplace musulmane, sadaqa jariya livres, vente livres coran europe",
      },
      { property: "og:title", content: "MYKUTUB — Marketplace de livres islamiques d'occasion" },
      {
        property: "og:description",
        content:
          "Achetez, vendez et donnez vos livres de science islamique. Une plateforme gratuite, sécurisée, au service de la communauté.",
      },
      { property: "og:url", content: "https://mykutub.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://mykutub.lovable.app/" }],
  }),
  component: Landing,
});

function Landing() {
  const { t } = useTranslation();
  const [featured, setFeatured] = useState<Book[]>([]);

  useEffect(() => {
    supabase
      .from("books")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(8)
      .then(({ data }) => {
        setFeatured((data as Book[]) ?? []);
      });
  }, []);

  return (
    <div>
      {/* Hero compact */}
      <section className="relative overflow-hidden bg-card">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-6 grid md:grid-cols-2 gap-4 md:gap-8 items-center w-full md:max-h-[50vh]">
          <div className="space-y-3 md:space-y-4 z-10">
            <h1 className="font-headline font-black leading-[1.05] tracking-tight text-[2rem] md:text-[3rem]">
              {t("home.h1a")} <span className="text-primary">{t("home.h1b")}</span>
            </h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-lg">{t("home.intro")}</p>
            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="gap-2 h-12 rounded-2xl text-sm font-black px-6 uppercase tracking-wide shadow-xl shadow-primary/30 ring-2 ring-primary/20 hover:scale-105 transition-transform"
              >
                <Link to="/publish">
                  <PlusCircle size={18} /> {t("home.publishBtn")}
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="gap-2 h-12 rounded-2xl text-sm font-bold px-6"
              >
                <Link to="/catalog">
                  {t("common.explore")} <ArrowRight size={16} />
                </Link>
              </Button>
            </div>
          </div>
          <div className="relative aspect-[4/3] md:aspect-[16/10] md:max-h-[42vh] rounded-2xl overflow-hidden shadow-2xl">
            <img
              src={heroImage}
              alt="Livres de science islamique empilés dont un Coran vert avec calligraphie arabe"
              width={1536}
              height={1024}
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Featured catalog */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 pt-6 md:pt-8 pb-16 md:pb-24">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="font-headline text-3xl md:text-4xl font-black">{t("home.latest")}</h2>
            <p className="text-muted-foreground mt-2">{t("home.latestSub")}</p>
          </div>
          <Button asChild variant="ghost" className="hidden sm:inline-flex gap-2">
            <Link to="/catalog">
              {t("common.seeAll")} <ArrowRight size={16} />
            </Link>
          </Button>
        </div>
        {featured.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground bg-muted/30 rounded-3xl">
            {t("home.empty")}{" "}
            <Link to="/publish" className="text-primary font-bold underline">
              {t("home.emptyCta")}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {featured.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        )}
      </section>

      {/* Values */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 pb-16 md:pb-24">
        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {[
            { icon: BookOpen, title: t("home.valueA_title"), text: t("home.valueA_text") },
            { icon: Heart, title: t("home.valueB_title"), text: t("home.valueB_text") },
            { icon: ShieldCheck, title: t("home.valueC_title"), text: t("home.valueC_text") },
          ].map((v) => (
            <div
              key={v.title}
              className="bg-card border rounded-3xl p-8 hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <v.icon size={22} />
              </div>
              <h3 className="font-headline font-bold text-xl mb-2">{v.title}</h3>
              <p className="text-muted-foreground">{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 pb-16 md:pb-24">
        <div className="bg-primary rounded-3xl p-8 md:p-16 text-primary-foreground text-center md:text-left md:flex md:items-center md:justify-between gap-8 shadow-xl">
          <div className="space-y-3 max-w-xl">
            <h2 className="font-headline text-3xl md:text-4xl font-black">{t("home.ctaTitle")}</h2>
            <p className="opacity-90 text-lg">{t("home.ctaText")}</p>
          </div>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="mt-6 md:mt-0 h-14 rounded-2xl font-bold px-8 text-base"
          >
            <Link to="/signup">{t("home.ctaBtn")}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
