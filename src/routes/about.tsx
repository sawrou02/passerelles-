import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Users,
  Sprout,
  Sparkles,
  Shield,
  Share2,
  Eye,
  HeartHandshake,
} from "lucide-react";
import libraryImage from "@/assets/library.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "À propos de MYKUTUB — Notre mission pour la communauté musulmane" },
      {
        name: "description",
        content: "MYKUTUB est né d'une volonté de donner une seconde vie aux livres islamiques.",
      },
      { property: "og:title", content: "À propos — MYKUTUB" },
      { property: "og:url", content: "https://mykutub.lovable.app/about" },
    ],
    links: [{ rel: "canonical", href: "https://mykutub.lovable.app/about" }],
  }),
  component: About,
});

function About() {
  const { t } = useTranslation();
  const mission = [
    { emoji: "📚", title: t("about.m1Title"), text: t("about.m1Text") },
    { emoji: "🤝", title: t("about.m2Title"), text: t("about.m2Text") },
    { emoji: "🌱", title: t("about.m3Title"), text: t("about.m3Text") },
  ];
  const values = [
    { icon: Shield, title: t("about.v1Title"), text: t("about.v1Text") },
    { icon: Share2, title: t("about.v2Title"), text: t("about.v2Text") },
    { icon: Eye, title: t("about.v3Title"), text: t("about.v3Text") },
    { icon: HeartHandshake, title: t("about.v4Title"), text: t("about.v4Text") },
  ];

  return (
    <div className="bg-background">
      <section className="relative overflow-hidden bg-[oklch(0.28_0.06_155)] text-white">
        <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]" />
        <div className="relative max-w-5xl mx-auto px-4 md:px-8 py-20 md:py-32 text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider">
            <Sparkles size={14} /> {t("about.badge")}
          </div>
          <h1 className="font-headline text-4xl md:text-6xl lg:text-7xl font-black leading-tight">
            {t("about.title")}
          </h1>
          <p className="text-lg md:text-2xl text-white/85 max-w-3xl mx-auto leading-relaxed">
            {t("about.intro")}
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-24">
        <div className="text-center mb-12 space-y-3">
          <h2 className="font-headline text-3xl md:text-5xl font-black text-primary">
            {t("about.missionTitle")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{t("about.missionSub")}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {mission.map((m) => (
            <div
              key={m.title}
              className="bg-card border border-border rounded-3xl p-8 hover:shadow-xl hover:-translate-y-1 transition-all"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl mb-5">
                {m.emoji}
              </div>
              <h3 className="font-headline text-xl font-bold mb-3 leading-snug">{m.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{m.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-card border-y border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-24 grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl">
            <img
              src={libraryImage}
              alt="Bibliothèque islamique"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
          <div className="space-y-5">
            <h2 className="font-headline text-3xl md:text-5xl font-black text-primary">
              {t("about.storyTitle")}
            </h2>
            <p className="text-lg text-foreground/80 leading-relaxed">{t("about.storyP1")}</p>
            <p className="text-lg text-foreground/80 leading-relaxed">
              {t("about.storyP2_a")}
              <span className="font-bold text-secondary">MYKUTUB</span>
              {t("about.storyP2_b")}
              <span className="font-arabic text-2xl">كتب</span>
              {t("about.storyP2_c")}
              <strong>{t("about.storyP2_d")}</strong>.
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-24">
        <div className="text-center mb-12 space-y-3">
          <h2 className="font-headline text-3xl md:text-5xl font-black text-primary">
            {t("about.valuesTitle")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{t("about.valuesSub")}</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {values.map((v) => (
            <div
              key={v.title}
              className="bg-card border border-border rounded-3xl p-6 hover:border-primary/40 hover:shadow-lg transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-secondary/15 text-secondary flex items-center justify-center mb-4">
                <v.icon size={22} />
              </div>
              <h3 className="font-headline text-lg font-bold mb-2">{v.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 md:px-8 pb-20 md:pb-28">
        <div className="max-w-5xl mx-auto bg-gradient-to-br from-primary to-[oklch(0.45_0.08_180)] text-primary-foreground rounded-3xl p-10 md:p-16 text-center shadow-2xl">
          <Sparkles className="mx-auto mb-4 opacity-80" size={32} />
          <h2 className="font-headline text-3xl md:text-5xl font-black mb-4 leading-tight">
            {t("about.ctaTitle")}
          </h2>
          <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto mb-8">
            {t("about.ctaText")}
          </p>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="h-14 px-10 rounded-2xl text-base font-black"
          >
            <Link to="/signup">{t("about.ctaBtn")}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
