import { Bell } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const { items, unreadCount, markAllRead, markRead } = useNotifications();
  const navigate = useNavigate();

  return (
    <DropdownMenu onOpenChange={(o) => o && unreadCount > 0 && markAllRead()}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 max-h-[400px] overflow-y-auto">
        <div className="px-3 py-2 border-b flex items-center justify-between">
          <p className="font-semibold text-sm">Notifications</p>
        </div>
        {items.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">Aucune notification</div>
        ) : (
          <ul className="divide-y">
            {items.map((n) => (
              <li
                key={n.id}
                onClick={() => {
                  markRead(n.id);
                  if (n.link) navigate({ to: n.link });
                }}
                className={cn(
                  "px-3 py-2.5 text-sm cursor-pointer hover:bg-muted/50",
                  !n.is_read && "bg-primary/5",
                )}
              >
                <p className="leading-snug">{n.message}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
