import { useUserPresence } from "@/hooks/useUserPresence";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

export function OnlineDot({
  userId,
  size = 10,
  className,
}: {
  userId?: string | null;
  size?: number;
  className?: string;
}) {
  const { is_online } = useUserPresence(userId);
  return (
    <span
      title={is_online ? "En ligne" : "Hors ligne"}
      style={{ width: size, height: size }}
      className={cn(
        "inline-block rounded-full ring-2 ring-card",
        is_online ? "bg-emerald-500" : "bg-muted-foreground/40",
        className,
      )}
    />
  );
}

export function OnlineStatusLabel({ userId }: { userId?: string | null }) {
  const { is_online, last_seen } = useUserPresence(userId);
  if (is_online) {
    return (
      <span className="text-xs text-emerald-600 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        En ligne
      </span>
    );
  }
  if (!last_seen) {
    return <span className="text-xs text-muted-foreground">Hors ligne</span>;
  }
  return (
    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
      Vu {formatDistanceToNow(new Date(last_seen), { addSuffix: true, locale: fr })}
    </span>
  );
}
