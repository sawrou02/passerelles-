import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  Send,
  MoreVertical,
  User,
  Flag,
  Trash2,
  BookOpen,
  User as UserIcon,
  Check,
  CheckCheck,
  Smile,
  Plus,
  Star,
  X,
  Info,
  Trash,
  UserMinus,
  BellOff,
  Bell,
  Archive,
  ArchiveRestore,
  Ban,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { sendEmail } from "@/lib/email";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Chat, Message, Book } from "@/lib/mykutub";
import { ContactsSidebar } from "@/components/ContactsSidebar";
import { OnlineDot, OnlineStatusLabel } from "@/components/OnlineDot";
import { cn } from "@/lib/utils";
import { VerifiedBadge } from "@/components/VerifiedBadge";

export const Route = createFileRoute("/messages/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    draft: typeof search.draft === "string" ? search.draft : undefined,
  }),
  component: ChatDetailPage,
});

type ProfileLite = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  verified?: boolean | null;
};

const SYSTEM_PREFIX = "__system__:";
const IMAGE_PREFIX = "__image__:";

const CHAT_BG =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'><g fill='%23128C7E' fill-opacity='0.04'><circle cx='10' cy='10' r='2'/><circle cx='40' cy='30' r='1.5'/><circle cx='70' cy='15' r='2'/><circle cx='25' cy='55' r='1.5'/><circle cx='60' cy='65' r='2'/></g></svg>\")";

function dateLabel(d: Date) {
  const today = new Date();
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return "Aujourd'hui";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(d, yesterday)) return "Hier";
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: d.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

function relativeTime(iso: string | null | undefined) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `il y a ${d} j`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

function ChatDetailPage() {
  const { id: chatId } = Route.useParams();
  const { draft } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherProfile, setOtherProfile] = useState<ProfileLite | null>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [reviewStats, setReviewStats] = useState<{ avg: number; count: number }>({
    avg: 0,
    count: 0,
  });
  const [input, setInput] = useState(draft ?? "");
  const draftAppliedRef = useRef(false);

  const [otherTyping, setOtherTyping] = useState(false);
  const [showBookInfo, setShowBookInfo] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [actionMsg, setActionMsg] = useState<Message | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReasons, setReportReasons] = useState<Set<string>>(new Set());
  const [reportDescription, setReportDescription] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [confirmDeleteChat, setConfirmDeleteChat] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastTypingSent = useRef(0);
  const longPressTimer = useRef<number | null>(null);

  useEffect(() => {
    supabase
      .from("chats")
      .select("*")
      .eq("id", chatId)
      .single()
      .then(({ data }) => setChat(data as Chat | null));
    supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMessages((data as Message[]) ?? []));
  }, [chatId]);

  // Seed input with prefilled draft (only once per navigation)
  useEffect(() => {
    if (draft && !draftAppliedRef.current) {
      setInput(draft);
      draftAppliedRef.current = true;
    }
  }, [draft]);

  useEffect(() => {
    if (!chat || !user) return;
    const otherId = chat.participants.find((p) => p !== user.id);
    if (otherId) {
      supabase
        .from("profiles")
        .select("id,display_name,avatar_url,verified")
        .eq("id", otherId)
        .single()
        .then(({ data }) => setOtherProfile(data as ProfileLite | null));
    }
    if (chat.book_id) {
      supabase
        .from("books")
        .select("*")
        .eq("id", chat.book_id)
        .maybeSingle()
        .then(({ data }) => setBook(data as Book | null));
    }
  }, [chat, user]);

  useEffect(() => {
    if (!book) return;
    supabase
      .from("reviews")
      .select("rating")
      .eq("seller_id", book.seller_id)
      .then(({ data }) => {
        const arr = (data as { rating: number }[]) ?? [];
        const count = arr.length;
        const avg = count ? arr.reduce((s, r) => s + r.rating, 0) / count : 0;
        setReviewStats({ avg, count });
      });
  }, [book]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`chat-${chatId}`, { config: { broadcast: { self: false } } })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        (payload) => setMessages((prev) => [...prev, payload.new as Message]),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        (payload) =>
          setMessages((prev) =>
            prev.map((m) => (m.id === (payload.new as Message).id ? (payload.new as Message) : m)),
          ),
      )
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload?.user_id && payload.user_id !== user.id) {
          setOtherTyping(true);
          window.setTimeout(() => setOtherTyping(false), 3000);
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, user]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, otherTyping]);

  useEffect(() => {
    if (!chat || !user) return;
    if (chat.unread_by?.includes(user.id)) {
      const newUnread = chat.unread_by.filter((id) => id !== user.id);
      supabase
        .from("chats")
        .update({ unread_by: newUnread })
        .eq("id", chatId)
        .then(() => {});
    }
    supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("chat_id", chatId)
      .neq("sender_id", user.id)
      .is("read_at", null)
      .then(() => {});
  }, [chat, user, chatId, messages.length]);

  const broadcastTyping = () => {
    if (!user) return;
    const now = Date.now();
    if (now - lastTypingSent.current < 1500) return;
    lastTypingSent.current = now;
    supabase.channel(`chat-${chatId}`).send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: user.id },
    });
  };

  const sendRaw = async (text: string) => {
    if (!user || !chat) return;
    const recipientId = chat.participants.find((p) => p !== user.id);
    const senderName =
      user.user_metadata?.display_name || user.email?.split("@")[0] || "Utilisateur";
    const { error } = await supabase.from("messages").insert({
      chat_id: chatId,
      sender_id: user.id,
      sender_name: senderName,
      text,
    });
    if (error) {
      // RLS block from blocked_users restrictive policy returns a 42501 / row-level error
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("row-level") || msg.includes("policy") || error.code === "42501") {
        toast.error("Vous ne pouvez pas contacter cet utilisateur");
      } else {
        toast.error("Échec de l'envoi");
      }
      throw error;
    }
    const preview = text.startsWith(IMAGE_PREFIX) ? "📷 Photo" : text;
    await supabase
      .from("chats")
      .update({
        last_message: preview,
        last_message_at: new Date().toISOString(),
        unread_by: recipientId ? [recipientId] : [],
      })
      .eq("id", chatId);
    if (recipientId) {
      sendEmail("send-message-notification-email", {
        userId: recipientId,
        senderName,
        preview,
        chatId,
      });
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");
    await sendRaw(text);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    e.target.value = "";
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image trop volumineuse (max 5 Mo)");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", "chat");
      fd.append("role", "attachment");
      const { data: out, error: invErr } = await supabase.functions.invoke("validate-book-image", {
        body: fd,
      });
      const payload = out as { ok?: boolean; publicUrl?: string; error?: string } | null;
      if (invErr || payload?.error || !payload?.publicUrl) {
        throw new Error(payload?.error || invErr?.message || "Upload refusé");
      }
      await sendRaw(`${IMAGE_PREFIX}${payload.publicUrl}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'envoi");
    } finally {
      setUploading(false);
    }
  };

  const updateChatArray = async (
    column: "deleted_for" | "archived_for" | "muted_for",
    add: boolean,
  ) => {
    if (!chat || !user) return;
    const current = (chat[column] ?? []) as string[];
    const next = add
      ? Array.from(new Set([...current, user.id]))
      : current.filter((id) => id !== user.id);
    setChat({ ...chat, [column]: next } as Chat);
    const payload: Record<string, string[]> = { [column]: next };
    const { error } = await supabase
      .from("chats")
      .update(payload as never)
      .eq("id", chatId);
    if (error) {
      toast.error("Action impossible");
      setChat({ ...chat, [column]: current } as Chat);
      return false;
    }
    return true;
  };

  const handleDeleteChat = async () => {
    const ok = await updateChatArray("deleted_for", true);
    setConfirmDeleteChat(false);
    if (ok) {
      toast.success("Conversation supprimée");
      navigate({ to: "/messages" });
    }
  };

  const handleToggleArchive = async () => {
    const isArchived = (chat?.archived_for ?? []).includes(user?.id ?? "");
    const ok = await updateChatArray("archived_for", !isArchived);
    if (ok) toast.success(isArchived ? "Conversation désarchivée" : "Conversation archivée");
  };

  const handleToggleMute = async () => {
    const isMuted = (chat?.muted_for ?? []).includes(user?.id ?? "");
    const ok = await updateChatArray("muted_for", !isMuted);
    if (ok) toast.success(isMuted ? "Notifications réactivées" : "Notifications désactivées");
  };

  const handleBlockUser = async () => {
    const targetId = chat?.participants.find((p) => p !== user?.id);
    if (!user || !targetId) return;
    const { error } = await supabase.from("blocked_users").insert({
      blocker_id: user.id,
      blocked_id: targetId,
    });
    setConfirmBlock(false);
    if (error && !error.message.toLowerCase().includes("duplicate")) {
      toast.error("Impossible de bloquer cet utilisateur");
    } else {
      toast.success(`${otherProfile?.display_name ?? "Utilisateur"} a été bloqué`);
      navigate({ to: "/messages" });
    }
  };

  const submitReport = async () => {
    if (!user || reportReasons.size === 0) {
      toast.error("Sélectionnez au moins une raison");
      return;
    }
    setReportSubmitting(true);
    const reasons = Array.from(reportReasons).join(", ");
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      book_id: chat?.book_id ?? chatId,
      raison: reasons,
      description: reportDescription.slice(0, 500) || null,
    });
    setReportSubmitting(false);
    if (error) {
      toast.error("Échec du signalement");
      return;
    }
    setReportOpen(false);
    setReportReasons(new Set());
    setReportDescription("");
    toast.success("JazakAllahu Khayran 🤲", {
      description: "Votre signalement a bien été transmis à notre équipe.",
    });
  };

  const deleteForEveryone = async (m: Message) => {
    if (!user || m.sender_id !== user.id) return;
    const ageMs = Date.now() - new Date(m.created_at).getTime();
    if (ageMs > 24 * 60 * 60 * 1000) {
      toast.error("Trop tard : la suppression pour tous n'est possible que dans les 24h.");
      return;
    }
    const { error } = await supabase
      .from("messages")
      .update({
        deleted_for_everyone: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
        text: "",
      })
      .eq("id", m.id);
    if (error) toast.error("Échec de la suppression");
    else setActionMsg(null);
  };

  const deleteForMe = async (m: Message) => {
    if (!user) return;
    const next = Array.from(new Set([...(m.hidden_for ?? []), user.id]));
    const { error } = await supabase.from("messages").update({ hidden_for: next }).eq("id", m.id);
    if (error) toast.error("Échec");
    else {
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, hidden_for: next } : x)));
      setActionMsg(null);
    }
  };

  const startLongPress = (m: Message) => {
    if (m.sender_id !== user?.id || m.deleted_for_everyone) return;
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => setActionMsg(m), 500);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const visibleMessages = useMemo(
    () => messages.filter((m) => !(m.hidden_for ?? []).includes(user?.id ?? "")),
    [messages, user?.id],
  );

  const grouped = useMemo(() => {
    const out: Array<{ type: "date"; label: string; key: string } | { type: "msg"; msg: Message }> =
      [];
    let lastDay = "";
    for (const m of visibleMessages) {
      const d = new Date(m.created_at);
      const key = d.toDateString();
      if (key !== lastDay) {
        out.push({ type: "date", label: dateLabel(d), key });
        lastDay = key;
      }
      out.push({ type: "msg", msg: m });
    }
    return out;
  }, [visibleMessages]);

  if (!chat) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <p className="text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  const otherId = chat.participants.find((p) => p !== user?.id);
  const isMuted = (chat.muted_for ?? []).includes(user?.id ?? "");
  const isArchived = (chat.archived_for ?? []).includes(user?.id ?? "");
  const otherName =
    otherProfile?.display_name ||
    messages.find((m) => m.sender_id !== user?.id)?.sender_name ||
    "Utilisateur";
  const initials = otherName
    .split(" ")
    .map((s: string) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const bookStatus = book?.status ?? "available";
  const statusLabel =
    bookStatus === "available" ? "Disponible" : bookStatus === "reserved" ? "Réservé" : "Donné";
  const statusColor =
    bookStatus === "available"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : bookStatus === "reserved"
        ? "bg-amber-100 text-amber-700 border-amber-200"
        : "bg-muted text-muted-foreground border-border";

  const BookInfoPanel = book ? (
    <div className="flex flex-col h-full bg-card overflow-y-auto thin-scroll">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <p className="font-semibold text-sm">Détails de l'annonce</p>
        <button
          onClick={() => setShowBookInfo(false)}
          className="md:hidden p-1 hover:bg-muted rounded"
        >
          <X size={18} />
        </button>
      </div>
      <div className="p-4 space-y-4">
        <Link to="/book/$id" params={{ id: book.id }} className="block">
          <div className="aspect-[4/3] w-full rounded-lg overflow-hidden bg-muted border">
            {book.image_url ? (
              <img
                src={book.image_url}
                alt={book.title}
                className="w-full h-full object-cover hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen size={40} className="text-muted-foreground/40" />
              </div>
            )}
          </div>
        </Link>

        <div>
          <h2 className="font-bold text-base leading-tight line-clamp-2">{book.title}</h2>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span
              className={cn(
                "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border",
                statusColor,
              )}
            >
              {statusLabel}
            </span>
            <span className="text-base font-bold text-primary">
              {book.is_donation ? "Gratuit" : `${book.price} €`}
            </span>
          </div>
        </div>

        {/* Seller rating */}
        <div className="border-t pt-3">
          <p className="text-xs text-muted-foreground mb-1">Vendeur</p>
          <p className="font-semibold text-sm">{book.seller_name}</p>
          {reviewStats.count > 0 ? (
            <div className="flex items-center gap-1.5 mt-1">
              <Star size={14} className="fill-amber-400 text-amber-400" />
              <span className="text-sm font-semibold">{reviewStats.avg.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({reviewStats.count} avis)</span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">Aucun avis</p>
          )}
        </div>

        <div className="border-t pt-3">
          <p className="text-xs text-muted-foreground">Dernière activité</p>
          <p className="text-sm font-medium">
            {relativeTime(chat.last_message_at ?? chat.created_at)}
          </p>
        </div>

        <Link
          to="/book/$id"
          params={{ id: book.id }}
          className="block w-full text-center px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
        >
          Voir l'annonce
        </Link>
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-card">
      <BookOpen size={40} className="text-muted-foreground/30 mb-2" />
      <p className="text-sm font-semibold">Aucun livre lié</p>
      <p className="text-xs text-muted-foreground mt-1">
        Cette conversation n'est rattachée à aucune annonce.
      </p>
    </div>
  );

  const ChatPane = (
    <div
      className="flex flex-col h-full"
      style={{ background: "#efeae2", backgroundImage: CHAT_BG }}
    >
      {/* Top bar */}
      <header className="bg-card border-b px-3 md:px-4 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate({ to: "/messages" })}
            className="p-1 md:hidden -ml-1"
            aria-label="Retour à la liste"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden border">
              {otherProfile?.avatar_url ? (
                <img
                  src={otherProfile.avatar_url}
                  alt={otherName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs font-bold text-muted-foreground">
                  {initials || <UserIcon size={18} />}
                </span>
              )}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5">
              <OnlineDot userId={otherId} size={11} />
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm leading-tight truncate flex items-center gap-1">
              {otherName}
              {otherProfile?.verified && <VerifiedBadge size={12} />}
            </p>
            {otherTyping ? (
              <p className="text-xs text-primary italic">en train d'écrire…</p>
            ) : (
              <OnlineStatusLabel userId={otherId} />
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {book && (
            <button
              onClick={() => setShowBookInfo(true)}
              className="lg:hidden p-2 hover:bg-muted rounded-full transition-colors"
              aria-label="Voir le livre"
            >
              <Info size={18} className="text-primary" />
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-2 hover:bg-muted rounded-full transition-colors"
                aria-label="Options"
              >
                <MoreVertical size={18} className="text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 rounded-xl">
              <DropdownMenuItem
                onClick={() =>
                  otherId &&
                  navigate({ to: "/user/$id", params: { id: otherId }, search: { chatId } })
                }
                disabled={!otherId}
                className="py-2.5 cursor-pointer"
              >
                <User size={16} className="mr-2" /> Voir le profil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleMute} className="py-2.5 cursor-pointer">
                {isMuted ? (
                  <Bell size={16} className="mr-2" />
                ) : (
                  <BellOff size={16} className="mr-2" />
                )}
                {isMuted ? "Réactiver les notifications" : "Désactiver les notifications"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleArchive} className="py-2.5 cursor-pointer">
                {isArchived ? (
                  <ArchiveRestore size={16} className="mr-2" />
                ) : (
                  <Archive size={16} className="mr-2" />
                )}
                {isArchived ? "Désarchiver" : "Archiver la conversation"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setReportOpen(true)}
                className="py-2.5 text-amber-600 focus:text-amber-700 focus:bg-amber-50 cursor-pointer"
              >
                <Flag size={16} className="mr-2" /> Signaler
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setConfirmBlock(true)}
                disabled={!otherId}
                className="py-2.5 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
              >
                <Ban size={16} className="mr-2" /> Bloquer
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setConfirmDeleteChat(true)}
                className="py-2.5 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
              >
                <Trash2 size={16} className="mr-2" /> Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto thin-scroll px-3 md:px-6 py-4 space-y-1.5"
      >
        {grouped.map((item) => {
          if (item.type === "date") {
            return (
              <div key={item.key} className="flex justify-center my-3">
                <span className="text-[11px] font-medium px-3 py-1 rounded-md bg-white/80 text-muted-foreground shadow-sm">
                  {item.label}
                </span>
              </div>
            );
          }
          const m = item.msg;
          const isDeleted = !!m.deleted_for_everyone;
          const isSystem = !isDeleted && m.text.startsWith(SYSTEM_PREFIX);
          const isImage = !isDeleted && m.text.startsWith(IMAGE_PREFIX);
          const mine = m.sender_id === user?.id;
          const time = new Date(m.created_at).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          });

          if (isSystem) {
            return (
              <div key={m.id} className="flex justify-center my-2">
                <p className="text-[11px] italic text-muted-foreground bg-white/70 px-3 py-1 rounded-md shadow-sm max-w-[80%] text-center">
                  {m.text.slice(SYSTEM_PREFIX.length).trim()}
                </p>
              </div>
            );
          }

          return (
            <div
              key={m.id}
              className={cn(
                "flex group animate-in fade-in slide-in-from-bottom-1 duration-200",
                mine ? "justify-end" : "justify-start",
              )}
            >
              <div
                onContextMenu={(e) => {
                  if (mine && !isDeleted) {
                    e.preventDefault();
                    setActionMsg(m);
                  }
                }}
                onTouchStart={() => !isDeleted && startLongPress(m)}
                onTouchEnd={cancelLongPress}
                onTouchMove={cancelLongPress}
                onTouchCancel={cancelLongPress}
                className={cn(
                  "relative max-w-[78%] md:max-w-[65%] rounded-lg text-sm shadow-sm overflow-hidden select-none",
                  isImage ? "p-1" : "px-3 py-1.5",
                  isDeleted
                    ? "bg-muted text-muted-foreground italic"
                    : mine
                      ? "rounded-tr-sm text-white"
                      : "rounded-tl-sm bg-white text-foreground",
                )}
                style={!isDeleted && mine ? { background: "#008069" } : undefined}
              >
                {mine && !isDeleted && (
                  <button
                    type="button"
                    onClick={() => setActionMsg(m)}
                    className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-full hover:bg-black/10"
                    aria-label="Options du message"
                  >
                    <MoreVertical size={14} className="text-white/90" />
                  </button>
                )}
                {isDeleted ? (
                  <p className="whitespace-pre-wrap break-words leading-snug">
                    🚫 Ce message a été supprimé
                  </p>
                ) : isImage ? (
                  <a
                    href={m.text.slice(IMAGE_PREFIX.length)}
                    target="_blank"
                    rel="noreferrer"
                    className="block"
                  >
                    <img
                      src={m.text.slice(IMAGE_PREFIX.length)}
                      alt="Pièce jointe"
                      className="rounded max-w-[260px] max-h-[260px] object-cover"
                    />
                  </a>
                ) : (
                  <p className="whitespace-pre-wrap break-words leading-snug">{m.text}</p>
                )}
                <div
                  className={cn(
                    "flex items-center gap-1 mt-0.5 px-1 justify-end",
                    isDeleted
                      ? "text-muted-foreground"
                      : mine
                        ? "text-white/80"
                        : "text-muted-foreground",
                  )}
                >
                  <span className="text-[10px]">{time}</span>
                  {mine &&
                    !isDeleted &&
                    (m.read_at ? (
                      <CheckCheck size={14} className="text-sky-200" />
                    ) : (
                      <Check size={14} />
                    ))}
                </div>
              </div>
            </div>
          );
        })}
        {otherTyping && (
          <div className="flex justify-start">
            <div className="bg-white rounded-lg rounded-tl-sm px-3 py-2 shadow-sm">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0.3s]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div
        className="px-2 md:px-4 py-2 flex items-end gap-2 flex-shrink-0"
        style={{ background: "#f0f2f5" }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoUpload}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="p-2.5 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
          aria-label="Envoyer une photo"
          title="Envoyer une photo"
        >
          <Plus size={22} />
        </button>
        <button
          type="button"
          className="p-2.5 text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
          aria-label="Emoji"
        >
          <Smile size={22} />
        </button>
        <div className="flex-1 bg-white rounded-lg shadow-sm">
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              broadcastTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={uploading ? "Envoi de la photo..." : "Écrire un message..."}
            rows={1}
            className="w-full resize-none px-4 py-2.5 rounded-lg bg-transparent outline-none text-sm max-h-32"
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className={cn(
            "p-2.5 rounded-full transition-all flex-shrink-0",
            input.trim() ? "text-white scale-100" : "text-muted-foreground bg-muted scale-90",
          )}
          style={input.trim() ? { background: "#008069" } : undefined}
          aria-label="Envoyer"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden w-full">
      <aside className="hidden md:flex w-[320px] min-w-[320px] max-w-[320px] flex-shrink-0 h-full border-r overflow-hidden">
        <ContactsSidebar activeChatId={chatId} />
      </aside>
      <section className="flex-1 h-full min-w-0 flex flex-col overflow-hidden">{ChatPane}</section>
      <aside className="hidden lg:flex w-[280px] min-w-[280px] max-w-[280px] flex-shrink-0 h-full border-l overflow-hidden">
        {BookInfoPanel}
      </aside>

      {/* Mobile/tablet drawer for book info */}
      {showBookInfo && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <button
            className="flex-1 bg-black/40"
            onClick={() => setShowBookInfo(false)}
            aria-label="Fermer"
          />
          <div className="w-full max-w-sm h-full bg-card shadow-xl animate-in slide-in-from-right duration-200">
            {BookInfoPanel}
          </div>
        </div>
      )}

      <Dialog open={!!actionMsg} onOpenChange={(o) => !o && setActionMsg(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Supprimer le message ?</DialogTitle>
            <DialogDescription>Choisis comment supprimer ce message.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-2">
            {actionMsg &&
              Date.now() - new Date(actionMsg.created_at).getTime() < 24 * 60 * 60 * 1000 && (
                <button
                  onClick={() => actionMsg && deleteForEveryone(actionMsg)}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
                >
                  <Trash size={18} /> Supprimer pour tout le monde
                </button>
              )}
            <button
              onClick={() => actionMsg && deleteForMe(actionMsg)}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-full bg-primary/10 text-primary font-semibold text-sm hover:bg-primary/20 transition-colors"
            >
              <UserMinus size={18} /> Supprimer pour moi
            </button>
            <button
              onClick={() => setActionMsg(null)}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-full bg-muted text-foreground font-semibold text-sm hover:bg-muted/80 transition-colors justify-center"
            >
              Annuler
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report dialog with reasons */}
      <Dialog
        open={reportOpen}
        onOpenChange={(o) => {
          if (!o) {
            setReportOpen(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag size={18} className="text-amber-600" /> Signaler la conversation
            </DialogTitle>
            <DialogDescription>
              Sélectionnez la ou les raisons de votre signalement. Notre équipe examinera la
              situation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto thin-scroll pr-1">
            {[
              "Messages inappropriés",
              "Arnaque ou fraude",
              "Spam",
              "Harcèlement",
              "Non-respect des règles islamiques",
              "Fausse identité",
              "Contenu indécent",
              "Autre",
            ].map((reason) => {
              const checked = reportReasons.has(reason);
              return (
                <label
                  key={reason}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted cursor-pointer"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => {
                      setReportReasons((prev) => {
                        const next = new Set(prev);
                        if (v) next.add(reason);
                        else next.delete(reason);
                        return next;
                      });
                    }}
                  />
                  <span className="text-sm">{reason}</span>
                </label>
              );
            })}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Description (facultative)
            </label>
            <textarea
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value.slice(0, 500))}
              rows={3}
              maxLength={500}
              placeholder="Apportez plus de détails…"
              className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="text-[10px] text-right text-muted-foreground">
              {reportDescription.length}/500
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setReportOpen(false)}
              disabled={reportSubmitting}
            >
              Annuler
            </Button>
            <Button onClick={submitReport} disabled={reportSubmitting || reportReasons.size === 0}>
              {reportSubmitting ? "Envoi…" : "Envoyer le signalement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block confirm */}
      <AlertDialog open={confirmBlock} onOpenChange={setConfirmBlock}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Bloquer {otherProfile?.display_name ?? "cet utilisateur"} ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Il ne pourra plus vous envoyer de messages ni voir vos annonces.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlockUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Bloquer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete chat confirm */}
      <AlertDialog open={confirmDeleteChat} onOpenChange={setConfirmDeleteChat}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la conversation ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette conversation disparaîtra de votre liste. L'autre participant pourra encore la
              voir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteChat}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
