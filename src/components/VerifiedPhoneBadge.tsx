import { BadgeCheck } from "lucide-react";

export function VerifiedPhoneBadge({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      title="Numéro vérifié"
      className={`inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 ${className}`}
    >
      <BadgeCheck size={size} className="fill-sky-500 text-white" />
      <span className="hidden sm:inline">Numéro vérifié</span>
    </span>
  );
}
