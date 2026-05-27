import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trash2,
  Users,
  BookOpen,
  MessageSquare,
  Star,
  ShieldCheck,
  Loader2,
  Mail,
  Inbox,
  Flag,
  Check,
  AlertTriangle,
  ImageOff,
  Image as ImageIcon,
  BadgeCheck,
  Bell,
  Ban,
  Clock,
  Reply,
  Send,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { sendEmail } from "@/lib/email";
import { DEFAULT_BOOK_IMAGE } from "@/lib/moderation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { AdminUsersTab } from "@/components/admin/AdminUsersTab";
import { AdminCharteTab } from "@/components/admin/AdminCharteTab";

type AdminBook = {
  id: string;
  title: string;
  description?: string | null;
  category?: string;
  condition?: string;
  city?: string;
  price?: number;
  is_donation?: boolean;
  image_url: string;
  seller_id: string;
  seller_name?: string;
  created_at?: string;
};
type AdminReview = {
  id: string;
  reviewer_name: string;
  rating: number;
  comment: string | null;
  created_at?: string;
};
type AdminProfile = {
  id: string;
  display_name: string | null;
  verified?: boolean | null;
  suspended_until?: string | null;
  suspension_reason?: string | null;
  banned_at?: string | null;
  ban_reason?: string | null;
};
type AdminContactMsg = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
};
type AdminReport = {
  id: string;
  book_id: string;
  raison: string;
  description: string | null;
  statut: string;
  created_at: string;
};
type AdminReportBook = Pick<AdminBook, "id" | "title" | "image_url" | "seller_id">;

const SUSPENSION_REASONS = [
  "Spam",
  "Arnaque",
  "Contenu inapproprié",
  "Harcèlement",
  "Non-respect des règles islamiques",
] as const;
const SUSPENSION_DURATIONS = [
  { label: "7 jours", days: 7 },
  { label: "30 jours", days: 30 },
  { label: "90 jours", days: 90 },
] as const;

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user: adminUser } = useAuth();
  const { isAdmin, loading } = useIsAdmin();
  const [stats, setStats] = useState({ users: 0, books: 0, messages: 0, reviews: 0 });
  const [books, setBooks] = useState<AdminBook[]>([]);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [contactMsgs, setContactMsgs] = useState<AdminContactMsg[]>([]);
  const [openMsgId, setOpenMsgId] = useState<string | null>(null);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [reportBooks, setReportBooks] = useState<Record<string, AdminReportBook>>({});
  const [sanctionFor, setSanctionFor] = useState<AdminProfile | null>(null);
  const [sancDays, setSancDays] = useState<number>(7);
  const [sancReason, setSancReason] = useState<string>(SUSPENSION_REASONS[0]);
  const [banFor, setBanFor] = useState<AdminProfile | null>(null);
  const [banReason, setBanReason] = useState<string>("");
  const [globalMsg, setGlobalMsg] = useState("");
  const [globalSending, setGlobalSending] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([
      supabase.from("profiles").select("*", { count: "exact" }),
      supabase.from("books").select("*").order("created_at", { ascending: false }),
      supabase.from("messages").select("id", { count: "exact", head: true }),
      supabase.from("reviews").select("*").order("created_at", { ascending: false }),
      supabase.from("contact_messages").select("*").order("created_at", { ascending: false }),
      supabase.from("reports").select("*").order("created_at", { ascending: false }),
    ]).then(async ([p, b, m, r, c, rep]) => {
      setProfiles((p.data ?? []) as AdminProfile[]);
      setBooks((b.data ?? []) as AdminBook[]);
      setReviews((r.data ?? []) as AdminReview[]);
      setContactMsgs((c.data ?? []) as AdminContactMsg[]);
      const reportRows = (rep.data ?? []) as AdminReport[];
      setReports(reportRows);
      const ids = Array.from(new Set(reportRows.map((x) => x.book_id)));
      if (ids.length) {
        const { data: bs } = await supabase
          .from("books")
          .select("id, title, image_url, seller_id")
          .in("id", ids);
        const map: Record<string, AdminReportBook> = {};
        ((bs ?? []) as AdminReportBook[]).forEach((bk) => {
          map[bk.id] = bk;
        });
        setReportBooks(map);
      }
      setStats({
        users: p.count ?? 0,
        books: b.data?.length ?? 0,
        messages: m.count ?? 0,
        reviews: r.data?.length ?? 0,
      });
    });
  }, [isAdmin]);

  if (loading)
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto p-10 text-center space-y-4">
        <ShieldCheck size={48} className="mx-auto text-muted-foreground" />
        <h1 className="text-2xl font-bold">{t("admin.denied")}</h1>
        <p className="text-muted-foreground">{t("admin.deniedText")}</p>
        <Button onClick={() => navigate({ to: "/" })}>{t("admin.back")}</Button>
      </div>
    );
  }

  const deleteBook = async (id: string) => {
    if (!confirm(t("admin.confirmDeleteBook"))) return;
    const { error } = await supabase.from("books").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setBooks((b) => b.filter((x) => x.id !== id));
    toast.success(t("admin.deletedBook"));
  };

  const deleteReview = async (id: string) => {
    if (!confirm(t("admin.confirmDeleteReview"))) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setReviews((r) => r.filter((x) => x.id !== id));
    toast.success(t("admin.deletedReview"));
  };

  const openMessage = async (id: string, isRead: boolean) => {
    setOpenMsgId((prev) => (prev === id ? null : id));
    if (!isRead) {
      const { error } = await supabase
        .from("contact_messages")
        .update({ is_read: true })
        .eq("id", id);
      if (!error)
        setContactMsgs((prev) => prev.map((m) => (m.id === id ? { ...m, is_read: true } : m)));
    }
  };

  const deleteContactMsg = async (id: string) => {
    if (!confirm(t("admin.confirmDeleteMsg"))) return;
    const { error } = await supabase.from("contact_messages").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setContactMsgs((prev) => prev.filter((m) => m.id !== id));
    toast.success(t("admin.deletedMsg"));
  };

  const unreadCount = contactMsgs.filter((m) => !m.is_read).length;
  const pendingReports = reports.filter((r) => r.statut === "en_attente").length;

  const updateReportStatus = async (id: string, statut: string) => {
    const { error } = await supabase.from("reports").update({ statut }).eq("id", id);
    if (error) return toast.error(error.message);
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, statut } : r)));
    toast.success(t("admin.statusUpdated"));
  };

  const deleteReport = async (id: string) => {
    if (!confirm(t("admin.confirmDeleteReport"))) return;
    const { error } = await supabase.from("reports").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setReports((prev) => prev.filter((r) => r.id !== id));
  };

  const warnSeller = async (sellerId: string, bookTitle: string) => {
    const { error } = await supabase.from("notifications").insert({
      user_id: sellerId,
      type: "warning",
      message: `Avertissement de la modération concernant votre annonce "${bookTitle}". Merci de vérifier qu'elle respecte nos règles.`,
      link: "/profile",
    });
    if (error) return toast.error(error.message);
    toast.success("Vendeur averti");
  };

  const removeBookPhoto = async (bookId: string) => {
    if (!confirm("Remplacer la photo par l'image par défaut ?")) return;
    const { error } = await supabase
      .from("books")
      .update({ image_url: DEFAULT_BOOK_IMAGE })
      .eq("id", bookId);
    if (error) return toast.error(error.message);
    setBooks((prev) =>
      prev.map((b) => (b.id === bookId ? { ...b, image_url: DEFAULT_BOOK_IMAGE } : b)),
    );
    toast.success("Photo remplacée");
  };

  // Group reports by book_id
  const reportsByBook = reports.reduce<Record<string, AdminReport[]>>((acc, r) => {
    (acc[r.book_id] ||= []).push(r);
    return acc;
  }, {});
  const groupedReports = Object.entries(reportsByBook)
    .map(([bookId, items]) => ({ bookId, items, count: items.length, latest: items[0] }))
    .sort((a, b) => b.count - a.count);

  // ---- Moderation helpers ----

  const refreshProfile = (id: string, patch: Partial<AdminProfile>) =>
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const suspendUser = async () => {
    if (!sanctionFor) return;
    const until = new Date(Date.now() + sancDays * 86400000).toISOString();
    const { error } = await supabase
      .from("profiles")
      .update({
        suspended_until: until,
        suspension_reason: sancReason,
        banned_at: null,
        ban_reason: null,
      })
      .eq("id", sanctionFor.id);
    if (error) return toast.error(error.message);
    await supabase.rpc("notify_user_action", {
      _user_id: sanctionFor.id,
      _message: `Votre compte a été suspendu pendant ${sancDays} jours. Raison : ${sancReason}.`,
      _link: "/profile",
      _type: "moderation",
    });
    sendEmail("send-suspension-email", {
      userId: sanctionFor.id,
      kind: "suspended",
      recipientName: sanctionFor.display_name,
      reason: sancReason,
      duration: `${sancDays} jours`,
    });
    refreshProfile(sanctionFor.id, { suspended_until: until, suspension_reason: sancReason });
    toast.success(`Utilisateur suspendu ${sancDays} jours`);
    setSanctionFor(null);
  };

  const liftSanction = async (p: AdminProfile) => {
    const { error } = await supabase
      .from("profiles")
      .update({
        suspended_until: null,
        suspension_reason: null,
        banned_at: null,
        ban_reason: null,
      })
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    refreshProfile(p.id, {
      suspended_until: null,
      suspension_reason: null,
      banned_at: null,
      ban_reason: null,
    });
    toast.success("Sanction levée");
  };

  const banUser = async () => {
    if (!banFor || !banReason.trim()) {
      toast.error("Raison requise");
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        banned_at: new Date().toISOString(),
        ban_reason: banReason.trim(),
        suspended_until: null,
      })
      .eq("id", banFor.id);
    if (error) return toast.error(error.message);
    await supabase.rpc("notify_user_action", {
      _user_id: banFor.id,
      _message: `Votre compte a été banni définitivement. Raison : ${banReason.trim()}.`,
      _link: "/profile",
      _type: "moderation",
    });
    sendEmail("send-suspension-email", {
      userId: banFor.id,
      kind: "banned",
      recipientName: banFor.display_name,
      reason: banReason.trim(),
    });
    refreshProfile(banFor.id, {
      banned_at: new Date().toISOString(),
      ban_reason: banReason.trim(),
    });
    toast.success("Utilisateur banni");
    setBanFor(null);
    setBanReason("");
  };

  const toggleVerified = async (p: AdminProfile) => {
    const next = !p.verified;
    const { error } = await supabase.from("profiles").update({ verified: next }).eq("id", p.id);
    if (error) return toast.error(error.message);
    if (next) {
      sendEmail("send-admin-email", {
        userId: p.id,
        kind: "verified",
        recipientName: p.display_name,
      });
    }
    refreshProfile(p.id, { verified: next });
    toast.success(next ? "Profil vérifié" : "Vérification retirée");
  };

  const sendGlobal = async () => {
    if (!globalMsg.trim()) return;
    setGlobalSending(true);
    const { data, error } = await supabase.rpc("send_global_notification", {
      _message: globalMsg.trim(),
      _link: undefined,
    });
    setGlobalSending(false);
    if (error) return toast.error(error.message);
    setGlobalMsg("");
    toast.success(`Notification envoyée à ${data ?? 0} utilisateurs`);
  };

  const replyInChat = async (otherUserId: string) => {
    if (!adminUser) return;
    const { data: existing } = await supabase
      .from("chats")
      .select("id")
      .contains("participants", [adminUser.id, otherUserId])
      .limit(1);
    let chatId = existing?.[0]?.id;
    if (!chatId) {
      const { data: created, error } = await supabase
        .from("chats")
        .insert({ participants: [adminUser.id, otherUserId] })
        .select("id")
        .single();
      if (error) return toast.error(error.message);
      chatId = created.id;
    }
    navigate({ to: "/messages/$id", params: { id: chatId }, search: { draft: undefined } });
  };

  const filteredProfiles = profiles.filter((p) => {
    const q = userSearch.toLowerCase().trim();
    if (!q) return true;
    return (p.display_name ?? "").toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 pb-24 space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="text-primary" size={28} />
        <h1 className="font-headline text-3xl font-bold">{t("admin.title")}</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Users size={20} />} label={t("admin.statUsers")} value={stats.users} />
        <StatCard icon={<BookOpen size={20} />} label={t("admin.statBooks")} value={stats.books} />
        <StatCard
          icon={<MessageSquare size={20} />}
          label={t("admin.statMessages")}
          value={stats.messages}
        />
        <StatCard icon={<Star size={20} />} label={t("admin.statReviews")} value={stats.reviews} />
      </div>

      <Tabs defaultValue="books">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="books">{t("admin.tabBooks")}</TabsTrigger>
          <TabsTrigger value="reviews">{t("admin.tabReviews")}</TabsTrigger>
          <TabsTrigger value="users">{t("admin.tabUsers")}</TabsTrigger>
          <TabsTrigger value="contact" className="relative">
            <Inbox size={14} className="mr-1.5" /> {t("admin.tabContact")}
            {unreadCount > 0 && (
              <Badge className="ml-2 h-5 min-w-5 px-1.5 bg-destructive text-destructive-foreground">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="photos">
            <ImageIcon size={14} className="mr-1.5" /> Photos
          </TabsTrigger>
          <TabsTrigger value="reports" className="relative">
            <Flag size={14} className="mr-1.5" /> {t("admin.tabReports")}
            {pendingReports > 0 && (
              <Badge className="ml-2 h-5 min-w-5 px-1.5 bg-destructive text-destructive-foreground">
                {pendingReports}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="charte">Charte</TabsTrigger>
        </TabsList>

        <TabsContent value="books" className="space-y-2">
          {books.map((b) => (
            <Card key={b.id} className="p-3 flex items-center gap-3">
              <img src={b.image_url} alt="" className="w-14 h-14 object-cover rounded" />
              <div className="flex-1 min-w-0">
                <Link
                  to="/book/$id"
                  params={{ id: b.id }}
                  className="font-semibold hover:underline truncate block"
                >
                  {b.title}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {b.seller_name} · {b.city} · {b.is_donation ? "Don" : `${b.price}€`}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => deleteBook(b.id)}
                className="text-destructive"
              >
                <Trash2 size={16} />
              </Button>
            </Card>
          ))}
          {books.length === 0 && (
            <p className="text-muted-foreground text-center py-8">{t("admin.noBooks")}</p>
          )}
        </TabsContent>

        <TabsContent value="reviews" className="space-y-2">
          {reviews.map((r) => (
            <Card key={r.id} className="p-3 flex items-start gap-3">
              <Star className="text-amber-500 mt-1" size={18} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">
                  {r.reviewer_name} · {r.rating}/5
                </p>
                {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => deleteReview(r.id)}
                className="text-destructive"
              >
                <Trash2 size={16} />
              </Button>
            </Card>
          ))}
          {reviews.length === 0 && (
            <p className="text-muted-foreground text-center py-8">{t("admin.noReviews")}</p>
          )}
        </TabsContent>

        <TabsContent value="users">
          <AdminUsersTab />
        </TabsContent>

        <TabsContent value="contact" className="space-y-2">
          {contactMsgs.length === 0 && (
            <p className="text-muted-foreground text-center py-8">{t("admin.noMessages")}</p>
          )}
          {contactMsgs.map((m) => {
            const isOpen = openMsgId === m.id;
            return (
              <Card
                key={m.id}
                className={`p-3 ${!m.is_read ? "border-destructive/40 bg-destructive/5" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => openMessage(m.id, m.is_read)}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {!m.is_read && (
                        <Badge className="bg-destructive text-destructive-foreground h-5 text-[10px]">
                          {t("admin.new")}
                        </Badge>
                      )}
                      <p className="font-semibold truncate">{m.subject}</p>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {m.name} &lt;{m.email}&gt; · {new Date(m.created_at).toLocaleString("fr-FR")}
                    </p>
                    {isOpen && (
                      <div className="mt-3 p-3 bg-muted/50 rounded-lg whitespace-pre-wrap text-sm">
                        {m.message}
                      </div>
                    )}
                  </button>
                  <a
                    href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject)}`}
                    className="p-2 text-primary hover:bg-primary/10 rounded-lg"
                    title={t("admin.replyEmail")}
                  >
                    <Mail size={16} />
                  </a>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteContactMsg(m.id)}
                    className="text-destructive"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent
          value="photos"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
        >
          {books.length === 0 && (
            <p className="text-muted-foreground text-center py-8 col-span-full">Aucune photo</p>
          )}
          {books.map((b) => (
            <Card key={b.id} className="p-2 space-y-2">
              <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                <img
                  src={b.image_url}
                  alt={b.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
              <p className="text-xs font-semibold truncate">{b.title}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => removeBookPhoto(b.id)}
                className="w-full text-destructive gap-1.5"
              >
                <ImageOff size={14} /> Supprimer photo
              </Button>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="reports" className="space-y-2">
          {groupedReports.length === 0 && (
            <p className="text-muted-foreground text-center py-8">{t("admin.noReports")}</p>
          )}
          {groupedReports.map(({ bookId, items, count, latest }) => {
            const bk = reportBooks[bookId];
            const reasons = Array.from(new Set(items.map((i) => i.raison)));
            const hasPending = items.some((i) => i.statut === "en_attente");
            return (
              <Card
                key={bookId}
                className={`p-3 ${hasPending ? "border-destructive/40 bg-destructive/5" : ""}`}
              >
                <div className="flex items-start gap-3">
                  {bk?.image_url && (
                    <img
                      src={bk.image_url}
                      alt=""
                      className="w-16 h-16 object-cover rounded shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="destructive" className="h-5 text-[10px] gap-1">
                        <AlertTriangle size={10} /> {count} signalement{count > 1 ? "s" : ""}
                      </Badge>
                      {reasons.map((r) => (
                        <Badge key={r} variant="outline" className="h-5 text-[10px]">
                          {r}
                        </Badge>
                      ))}
                    </div>
                    {bk ? (
                      <Link
                        to="/book/$id"
                        params={{ id: bookId }}
                        className="font-semibold hover:underline truncate block"
                      >
                        {bk.title}
                      </Link>
                    ) : (
                      <p className="font-semibold text-muted-foreground italic">
                        {t("admin.deletedListing")}
                      </p>
                    )}
                    {latest.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {latest.description}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Dernier : {new Date(latest.created_at).toLocaleString("fr-FR")}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={async () => {
                      if (!bk) return;
                      await deleteBook(bookId);
                      await Promise.all(
                        items.map((i) =>
                          supabase.from("reports").update({ statut: "traite" }).eq("id", i.id),
                        ),
                      );
                      setReports((prev) =>
                        prev.map((r) => (r.book_id === bookId ? { ...r, statut: "traite" } : r)),
                      );
                    }}
                    className="gap-1.5"
                  >
                    <Trash2 size={14} /> Supprimer l'annonce
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!bk?.seller_id}
                    onClick={() => bk?.seller_id && warnSeller(bk.seller_id, bk.title)}
                    className="gap-1.5"
                  >
                    <AlertTriangle size={14} /> Avertir
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await Promise.all(
                        items
                          .filter((i) => i.statut === "en_attente")
                          .map((i) =>
                            supabase.from("reports").update({ statut: "rejete" }).eq("id", i.id),
                          ),
                      );
                      setReports((prev) =>
                        prev.map((r) =>
                          r.book_id === bookId && r.statut === "en_attente"
                            ? { ...r, statut: "rejete" }
                            : r,
                        ),
                      );
                      toast.success("Signalements rejetés");
                    }}
                    className="gap-1.5 text-emerald-600"
                  >
                    <Check size={14} /> Approuver l'annonce
                  </Button>
                </div>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="charte">
          <AdminCharteTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
        {icon}
        {label}
      </div>
      <p className="text-3xl font-bold font-headline">{value}</p>
    </Card>
  );
}
