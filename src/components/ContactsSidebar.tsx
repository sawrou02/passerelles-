import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { OnlineDot } from "@/components/OnlineDot";
import { cn } from "@/lib/utils";
import type { Chat } from "@/lib/mykutub";
import {
  MessageSquare,
  Search,
  User as UserIcon,
  BookOpen,
  MoreVertical,
  Trash2,
  Archive,
  ArchiveRestore,
  BellOff,
  Bell,
  Ban,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type ProfileLite = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

function formatTime(date: Date) {
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Hier";
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays < 7) return date.toLocaleDateString("fr-FR", { weekday: "short" });
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

type FilterMode = "all" | "unread" | "archived";

export function ContactsSidebar({ activeChatId }: { activeChatId?: string }) {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [me, setMe] = useState<ProfileLite | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [confirmDelete, setConfirmDelete] = useState<Chat | null>(null);
  const [confirmBlock, setConfirmBlock] = useState<{
    chat: Chat;
    userId: string;
    name: string;
  } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    supabase
      .from("profiles")
      .select("id,display_name,avatar_url")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setMe(data as ProfileLite | null));
    const loadBlocked = async () => {
      const { data } = await supabase
        .from("blocked_users")
        .select("blocked_id")
        .eq("blocker_id", user.id);
      setBlockedIds(new Set((data ?? []).map((r: { blocked_id: string }) => r.blocked_id)));
    };
    const load = async () => {
      const { data } = await supabase
        .from("chats")
        .select("*")
        .contains("participants", [user.id])
        .order("last_message_at", { ascending: false });
      const list = (data as Chat[]) ?? [];
      setChats(list);
      const otherIds = Array.from(
        new Set(
          list.map((c) => c.participants.find((p) => p !== user.id)).filter(Boolean) as string[],
        ),
      );
      if (otherIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id,display_name,avatar_url")
          .in("id", otherIds);
        const map: Record<string, ProfileLite> = {};
        ((profs as ProfileLite[]) ?? []).forEach((p) => {
          map[p.id] = p;
        });
        setProfiles(map);
      }
      setLoading(false);
    };
    loadBlocked();
    load();
    const channel = supabase
      .channel(`chats-sidebar-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chats" }, load)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "blocked_users",
          filter: `blocker_id=eq.${user.id}`,
        },
        loadBlocked,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const filtered = useMemo(() => {
    if (!user) return [];
    const q = search.trim().toLowerCase();
    return chats.filter((c) => {
      const otherId = c.participants.find((p) => p !== user.id);
      if (otherId && blockedIds.has(otherId)) return false;
      const isDeleted = (c.deleted_for ?? []).includes(user.id);
      if (isDeleted) return false;
      const isArchived = (c.archived_for ?? []).includes(user.id);
      if (filter === "archived") {
        if (!isArchived) return false;
      } else {
        if (isArchived) return false;
        if (filter === "unread" && !c.unread_by?.includes(user.id)) return false;
      }
      if (!q) return true;
      const name = (otherId && profiles[otherId]?.display_name) || "";
      return (
        name.toLowerCase().includes(q) ||
        (c.book_title ?? "").toLowerCase().includes(q) ||
        (c.last_message ?? "").toLowerCase().includes(q)
      );
    });
  }, [chats, profiles, search, user, filter, blockedIds]);

  const counts = useMemo(() => {
    if (!user) return { all: 0, unread: 0, archived: 0 };
    const visible = chats.filter((c) => !(c.deleted_for ?? []).includes(user.id));
    const archived = visible.filter((c) => (c.archived_for ?? []).includes(user.id));
    const active = visible.filter((c) => !(c.archived_for ?? []).includes(user.id));
    return {
      all: active.length,
      unread: active.filter((c) => c.unread_by?.includes(user.id)).length,
      archived: archived.length,
    };
  }, [chats, user]);

  if (!user) return null;

  const updateChatArray = async (
    chat: Chat,
    column: "deleted_for" | "archived_for" | "muted_for",
    add: boolean,
  ) => {
    const current = (chat[column] ?? []) as string[];
    const next = add
      ? Array.from(new Set([...current, user.id]))
      : current.filter((id) => id !== user.id);
    // optimistic
    setChats((prev) => prev.map((c) => (c.id === chat.id ? { ...c, [column]: next } : c)));
    const payload: Record<string, string[]> = { [column]: next };
    const { error } = await supabase
      .from("chats")
      .update(payload as never)
      .eq("id", chat.id);
    if (error) {
      toast.error("Action impossible");
      setChats((prev) => prev.map((c) => (c.id === chat.id ? { ...c, [column]: current } : c)));
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await updateChatArray(confirmDelete, "deleted_for", true);
    setConfirmDelete(null);
    toast.success("Conversation supprimée");
  };

  const handleBlock = async () => {
    if (!confirmBlock) return;
    const { error } = await supabase.from("blocked_users").insert({
      blocker_id: user.id,
      blocked_id: confirmBlock.userId,
    });
    if (error && !error.message.toLowerCase().includes("duplicate")) {
      toast.error("Impossible de bloquer cet utilisateur");
    } else {
      setBlockedIds((prev) => new Set(prev).add(confirmBlock.userId));
      toast.success(`${confirmBlock.name} a été bloqué`);
    }
    setConfirmBlock(null);
  };

  const startLongPress = (chat: Chat) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => setOpenMenuId(chat.id), 450);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const myName =
    me?.display_name || user.user_metadata?.display_name || user.email?.split("@")[0] || "Moi";
  const myInitials = myName
    .split(" ")
    .map((s: string) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col h-full bg-card">
      {/* My profile header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden border">
          {me?.avatar_url ? (
            <img src={me.avatar_url} alt={myName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-muted-foreground">
              {myInitials || <UserIcon size={18} />}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{myName}</p>
          <p className="text-xs text-muted-foreground">Mes conversations</p>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une conversation"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-muted/50 text-sm border-none outline-none focus:bg-muted"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-3 py-2 border-b flex items-center gap-2 flex-wrap">
        {[
          { key: "all" as const, label: `Tout (${counts.all})` },
          { key: "unread" as const, label: "Non lus", badge: counts.unread },
          { key: "archived" as const, label: `Archivées (${counts.archived})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1",
              filter === t.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70",
            )}
          >
            {t.label}
            {t.key === "unread" && (t.badge ?? 0) > 0 && (
              <span
                className={cn(
                  "min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
                  filter === "unread"
                    ? "bg-primary-foreground text-primary"
                    : "bg-destructive text-white",
                )}
              >
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto thin-scroll">
        {loading ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <MessageSquare size={32} className="text-muted-foreground/30 mb-2" />
            <p className="text-sm font-semibold">
              {filter === "archived" ? "Aucune conversation archivée" : "Aucune conversation"}
            </p>
          </div>
        ) : (
          filtered.map((chat) => {
            const isActive = activeChatId === chat.id || pathname === `/messages/${chat.id}`;
            const isUnread = chat.unread_by?.includes(user.id);
            const isArchived = (chat.archived_for ?? []).includes(user.id);
            const isMuted = (chat.muted_for ?? []).includes(user.id);
            const otherId = chat.participants.find((p) => p !== user.id);
            const profile = otherId ? profiles[otherId] : null;
            const contactName = profile?.display_name || "Utilisateur";
            const lastUpdate = chat.last_message_at ? new Date(chat.last_message_at) : null;
            return (
              <div
                key={chat.id}
                className={cn(
                  "group relative border-b border-border/40 border-l-4",
                  isActive
                    ? "bg-primary/5 border-l-primary"
                    : "border-l-transparent bg-card hover:bg-muted/40",
                )}
                onTouchStart={() => startLongPress(chat)}
                onTouchEnd={cancelLongPress}
                onTouchMove={cancelLongPress}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setOpenMenuId(chat.id);
                }}
              >
                <Link
                  to="/messages/$id"
                  params={{ id: chat.id }}
                  search={{ draft: undefined }}
                  className="flex items-center gap-3 px-3 py-3 pr-10"
                >
                  {/* Book thumbnail */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-14 rounded-md bg-muted overflow-hidden border flex items-center justify-center">
                      {chat.book_image_url ? (
                        <img
                          src={chat.book_image_url}
                          alt={chat.book_title ?? ""}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <BookOpen size={18} className="text-muted-foreground/50" />
                      )}
                    </div>
                    <span className="absolute -bottom-1 -right-1">
                      <OnlineDot userId={otherId} size={10} />
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline gap-2">
                      <p
                        className={cn(
                          "text-sm truncate flex items-center gap-1",
                          isUnread ? "font-bold" : "font-semibold",
                        )}
                      >
                        {chat.book_title || "Conversation"}
                        {isMuted && (
                          <BellOff size={11} className="text-muted-foreground/70 flex-shrink-0" />
                        )}
                      </p>
                      <span
                        className={cn(
                          "text-[10px] flex-shrink-0",
                          isUnread ? "text-primary font-semibold" : "text-muted-foreground",
                        )}
                      >
                        {lastUpdate ? formatTime(lastUpdate) : ""}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{contactName}</p>
                    <div className="flex justify-between items-center gap-2 mt-0.5">
                      <p
                        className={cn(
                          "text-xs truncate",
                          isUnread ? "font-semibold text-foreground" : "text-muted-foreground/80",
                        )}
                      >
                        {chat.last_message || "Nouvelle conversation"}
                      </p>
                      {isUnread && !isMuted && (
                        <span className="flex-shrink-0 px-1.5 h-4 rounded-full bg-destructive text-white text-[9px] font-bold flex items-center justify-center uppercase tracking-wide">
                          Nouveau
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
                {/* Kebab menu */}
                <div className="absolute right-1 top-1/2 -translate-y-1/2">
                  <DropdownMenu
                    open={openMenuId === chat.id}
                    onOpenChange={(o) => setOpenMenuId(o ? chat.id : null)}
                  >
                    <DropdownMenuTrigger
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      className={cn(
                        "h-8 w-8 inline-flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-opacity",
                        "md:opacity-0 md:group-hover:opacity-100",
                        openMenuId === chat.id && "opacity-100 bg-muted",
                      )}
                      aria-label="Options"
                    >
                      <MoreVertical size={16} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-56 shadow-lg animate-in fade-in-0 zoom-in-95"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenuItem
                        onSelect={() => updateChatArray(chat, "archived_for", !isArchived)}
                      >
                        {isArchived ? (
                          <ArchiveRestore size={15} className="mr-2" />
                        ) : (
                          <Archive size={15} className="mr-2" />
                        )}
                        {isArchived ? "Désarchiver" : "Archiver la conversation"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => updateChatArray(chat, "muted_for", !isMuted)}
                      >
                        {isMuted ? (
                          <Bell size={15} className="mr-2" />
                        ) : (
                          <BellOff size={15} className="mr-2" />
                        )}
                        {isMuted ? "Réactiver les notifications" : "Désactiver les notifications"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                        onSelect={() => {
                          if (otherId)
                            setConfirmBlock({ chat, userId: otherId, name: contactName });
                        }}
                      >
                        <Ban size={15} className="mr-2" />
                        Bloquer cet utilisateur
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                        onSelect={() => setConfirmDelete(chat)}
                      >
                        <Trash2 size={15} className="mr-2" />
                        Supprimer la conversation
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })
        )}
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la conversation ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette conversation ? Elle disparaîtra de votre
              liste, mais l'autre utilisateur la verra toujours.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmBlock} onOpenChange={(o) => !o && setConfirmBlock(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Ban size={18} className="text-destructive" /> Bloquer {confirmBlock?.name} ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous bloquer {confirmBlock?.name} ? Il ne pourra plus vous envoyer de messages
              ni voir vos annonces.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlock}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Bloquer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
