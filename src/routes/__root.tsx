import { Outlet, Link, createRootRoute, HeadContent, Scripts, useLocation } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider } from "@/components/I18nProvider";
import { usePresence } from "@/hooks/usePresence";
import { CharteGate } from "@/components/CharteGate";
import { PhoneVerifyGate } from "@/components/PhoneVerifyGate";
import "@/lib/i18n";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground font-headline">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page introuvable</h2>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MYKUTUB — Livres de science islamique" },
      { name: "description", content: "Achetez, vendez et donnez des livres de science islamique d'occasion." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "MYKUTUB" },
      { property: "og:locale", content: "fr_FR" },
      { property: "og:image", content: "https://mykutub.lovable.app/og-cover.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@mykutub" },
      { name: "twitter:image", content: "https://mykutub.lovable.app/og-cover.jpg" },
      { name: "theme-color", content: "#0d6e6e" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "MyKutub" },
      { name: "mobile-web-app-capable", content: "yes" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=Space+Grotesk:wght@500;600;700&display=swap" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "MYKUTUB",
          url: "https://mykutub.lovable.app",
          logo: "https://mykutub.lovable.app/og-cover.jpg",
          description: "Marketplace de livres de science islamique d'occasion en Europe",
          foundingDate: "2025",
          areaServed: "Europe",
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { pathname } = useLocation();
  const hideAll = pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname.startsWith("/forgot-password") || pathname.startsWith("/reset-password");
  const isChat = pathname.startsWith("/messages/");
  const hideHeader = hideAll;
  const hideBottomNav = hideAll || isChat || pathname.startsWith("/book/");
  const hideFooter = hideAll || pathname.startsWith("/messages") || pathname.startsWith("/publish") || pathname.startsWith("/book/");

  return (
    <AuthProvider>
      <I18nProvider>
        <PresenceTracker />
        <div className="min-h-screen bg-background flex flex-col">
          {!hideHeader && <SiteHeader />}
          <main className="flex-1 pb-20 md:pb-0">
            <Outlet />
          </main>
          {!hideFooter && <SiteFooter />}
        </div>
        {!hideBottomNav && <BottomNav />}
        <CharteGate />
        <PhoneVerifyGate />
        <Toaster />
      </I18nProvider>
    </AuthProvider>
  );
}

function PresenceTracker() {
  usePresence();
  return null;
}
