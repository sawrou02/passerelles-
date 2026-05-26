import { Link, useLocation } from "@tanstack/react-router";
import { Home, PlusCircle, MessageCircle, User, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useUnreadChats } from "@/hooks/useUnreadChats";

export function BottomNav() {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const unreadCount = useUnreadChats();
  const navItems = [
    { label: t("nav.home"), to: "/", icon: Home },
    { label: t("nav.catalog"), to: "/catalog", icon: BookOpen },
    { label: t("nav.publish"), to: "/publish", icon: PlusCircle },
    { label: t("nav.messages"), to: "/messages", icon: MessageCircle },
    { label: t("nav.account"), to: "/profile", icon: User },
  ] as const;

  return (
    <nav className="md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-xl h-16 bg-card border-t flex items-center justify-around z-50 px-2">
      {navItems.map((item) => {
        const isActive = pathname === item.to;
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex flex-col items-center justify-center space-y-1 w-full h-full transition-colors relative",
              isActive ? "text-primary" : "text-muted-foreground hover:text-primary/70"
            )}
          >
            <div className="relative">
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              {item.to === "/messages" && unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
