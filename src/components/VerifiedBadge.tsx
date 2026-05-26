import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function VerifiedBadge({ size = 14, className, withLabel = false }: { size?: number; className?: string; withLabel?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-emerald-600", className)} title="Profil vérifié">
      <BadgeCheck size={size} className="fill-emerald-100" />
      {withLabel && <span className="text-xs font-medium">Profil vérifié</span>}
    </span>
  );
}
