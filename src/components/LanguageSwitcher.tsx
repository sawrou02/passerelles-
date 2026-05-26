import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Languages } from "lucide-react";
import { applyDirection } from "@/lib/i18n";

const LANGS = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = LANGS.find(l => l.code === i18n.language) || LANGS[0];

  const change = (code: string) => {
    i18n.changeLanguage(code);
    applyDirection(code);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Languages size={16} />
          <span className="text-xs font-bold uppercase">{current.code}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGS.map(l => (
          <DropdownMenuItem key={l.code} onClick={() => change(l.code)} className="gap-2 cursor-pointer">
            <span>{l.flag}</span> <span>{l.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
