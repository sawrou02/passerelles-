import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { sendEmail } from "@/lib/email";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  MoreVertical,
  AlertTriangle,
  Clock,
  Ban,
  Trash2,
  Send,
  BadgeCheck,
  Eye,
  ShieldOff,
  Shield,
  Search,
} from "lucide-react";

const REASONS = [
  "Spam",
  "Arnaque",
  "Contenu inapproprié",
  "Harcèlement",
  "Non-respect règles islamiques",
  "Comportement suspect",
  "Autre",
] as const;
const DURATIONS = [1, 3, 7, 30, 90] as const;

type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  suspended_until: string | null;
  suspension_reason: string | null;
  banned_at: string | null;
  ban_reason: string | null;
  verified: boolean;
  warning_count: number;
  last_seen: string | null;
};

type Filter = "all" | "active" | "suspended" | "banned" | "verified";

export function AdminUsersTab() {
  const { user: admin } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [bookCounts, setBookCounts] = useState<Record<string, number>>({});
  const [reportCounts, setReportCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sortBy, setSortBy] = useState<"date" | "reports" | "activity">("date");

  // Action state
  const [target, setTarget] = useState<Profile | null>(null);
  const [action, setAction] = useState<
    null | "warn" | "suspend" | "unsuspend" | "ban" | "unban" | "delete" | "message" | "detail"
  >(null);
  const [reason, setReason] = useState<string>(REASONS[0]);
  const [reasonOther, setReasonOther] = useState("");
  const [days, setDays] = useState<number>(7);
  const [note, setNote] = useState("");
  const [text, setText] = useState("");
  const [confirmStep, setConfirmStep] = useState(0);
  const [confirmTyped, setConfirmTyped] = useState("");
  const [busy, setBusy] = useState(false);

  // Detail sheet
  type DetailHistory = {
    id: string;
    created_at: string;
    action: string;
    reason: string | null;
    duration_days: number | null;
    note: string | null;
  };
  type DetailReport = {
    id: string;
    created_at: string;
    raison: string | null;
    statut: string | null;
  };
  type DetailBook = {
    id: string;
    title: string;
    status: string | null;
    created_at: string;
  };
  const [detailHistory, setDetailHistory] = useState<DetailHistory[]>([]);
  const [detailReports, setDetailReports] = useState<DetailReport[]>([]);
  const [detailBooks, setDetailBooks] = useState<DetailBook[]>([]);

  const loadAll = async () => {
    const [p, b, r, ur] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id,display_name,avatar_url,created_at,suspended_until,suspension_reason,banned_at,ban_reason,verified,warning_count,last_seen",
        ),
      supabase.from("books").select("id,seller_id"),
      supabase.from("reports").select("id,reported_id"),
      supabase.from("user_roles").select("user_id,role").eq("role", "admin"),
    ]);
    setProfiles((p.data ?? []) as Profile[]);
    const bc: Record<string, number> = {};
    (b.data ?? []).forEach((x: { seller_id: string }) => {
      bc[x.seller_id] = (bc[x.seller_id] ?? 0) + 1;
    });
    setBookCounts(bc);
    const rc: Record<string, number> = {};
    (r.data ?? []).forEach((x: { reported_id: string | null }) => {
      if (x.reported_id) rc[x.reported_id] = (rc[x.reported_id] ?? 0) + 1;
    });
    setReportCounts(rc);
    setAdminIds(new Set((ur.data ?? []).map((x: { user_id: string }) => x.user_id)));
  };
  useEffect(() => {
    loadAll();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const now = Date.now();
    let list = profiles.filter((p) => {
      if (q && !(p.display_name ?? "").toLowerCase().includes(q) && !p.id.toLowerCase().includes(q))
        return false;
      const isBan = !!p.banned_at;
      const isSusp = !!p.suspended_until && new Date(p.suspended_until).getTime() > now;
      if (filter === "active") return !isBan && !isSusp;
      if (filter === "suspended") return isSusp;
      if (filter === "banned") return isBan;
      if (filter === "verified") return p.verified;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sortBy === "reports") return (reportCounts[b.id] ?? 0) - (reportCounts[a.id] ?? 0);
      if (sortBy === "activity")
        return new Date(b.last_seen ?? 0).getTime() - new Date(a.last_seen ?? 0).getTime();
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return list;
  }, [profiles, search, filter, sortBy, reportCounts]);

  const open = (p: Profile, a: typeof action) => {
    setTarget(p);
    setAction(a);
    setReason(REASONS[0]);
    setReasonOther("");
    setDays(7);
    setNote("");
    setText("");
    setConfirmStep(0);
    setConfirmTyped("");
  };
  const close = () => {
    setAction(null);
    setTarget(null);
  };

  const finalReason = () => (reason === "Autre" ? reasonOther.trim() : reason);

  const refreshOne = (id: string, patch: Partial<Profile>) =>
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  // ---- Actions ----
  const doWarn = async () => {
    if (!target) return;
    const r = finalReason();
    if (!r) return toast.error("Raison requise");
    setBusy(true);
    const { error } = await supabase.rpc("admin_warn_user", { _target: target.id, _reason: r });
    setBusy(false);
    if (error) return toast.error(error.message);
    sendEmail("send-admin-email", {
      userId: target.id,
      kind: "warning",
      recipientName: target.display_name,
      reason: r,
    });
    refreshOne(target.id, { warning_count: (target.warning_count ?? 0) + 1 });
    toast.success("Avertissement envoyé");
    close();
  };

  const doSuspend = async () => {
    if (!target) return;
    const r = finalReason();
    if (!r) return toast.error("Raison requise");
    setBusy(true);
    const { error } = await supabase.rpc("admin_suspend_user", {
      _target: target.id,
      _days: days,
      _reason: r,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    sendEmail("send-suspension-email", {
      userId: target.id,
      kind: "suspended",
      recipientName: target.display_name,
      reason: r,
      duration: `${days} jour(s)`,
    });
    const until = new Date(Date.now() + days * 86400000).toISOString();
    refreshOne(target.id, {
      suspended_until: until,
      suspension_reason: r,
      banned_at: null,
      ban_reason: null,
    });
    toast.success(`Suspendu ${days} jour(s)`);
    close();
  };

  const doUnsuspend = async () => {
    if (!target) return;
    setBusy(true);
    const { error } = await supabase.rpc("admin_unsuspend_user", {
      _target: target.id,
      _note: note,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    sendEmail("send-admin-email", {
      userId: target.id,
      kind: "unsuspended",
      recipientName: target.display_name,
      note,
    });
    refreshOne(target.id, { suspended_until: null, suspension_reason: null });
    toast.success("Suspension levée");
    close();
  };

  const doBan = async () => {
    if (!target) return;
    const r = finalReason();
    if (!r) return toast.error("Raison requise");
    if (confirmStep < 1) {
      setConfirmStep(1);
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc("admin_ban_user", { _target: target.id, _reason: r });
    setBusy(false);
    if (error) return toast.error(error.message);
    sendEmail("send-suspension-email", {
      userId: target.id,
      kind: "banned",
      recipientName: target.display_name,
      reason: r,
    });
    refreshOne(target.id, {
      banned_at: new Date().toISOString(),
      ban_reason: r,
      suspended_until: null,
    });
    toast.success("Utilisateur banni");
    close();
  };

  const doUnban = async () => {
    if (!target) return;
    if (!note.trim()) return toast.error("Note obligatoire");
    setBusy(true);
    const { error } = await supabase.rpc("admin_unban_user", {
      _target: target.id,
      _note: note.trim(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    sendEmail("send-admin-email", {
      userId: target.id,
      kind: "unbanned",
      recipientName: target.display_name,
      note: note.trim(),
    });
    refreshOne(target.id, { banned_at: null, ban_reason: null });
    toast.success("Compte débanni");
    close();
  };

  const doDelete = async () => {
    if (!target) return;
    if (confirmStep < 2) {
      setConfirmStep((s) => s + 1);
      return;
    }
    if (confirmTyped !== "SUPPRIMER") return toast.error("Tapez SUPPRIMER pour confirmer");
    setBusy(true);
    sendEmail("send-admin-email", {
      userId: target.id,
      kind: "account_deleted",
      recipientName: target.display_name,
      note,
    });
    const { error } = await supabase.rpc("admin_delete_user", {
      _target: target.id,
      _confirm: "SUPPRIMER",
      _note: note,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setProfiles((prev) => prev.filter((p) => p.id !== target.id));
    toast.success("Compte supprimé");
    close();
  };

  const doMessage = async () => {
    if (!target || !text.trim()) return toast.error("Message vide");
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_send_message", {
      _target: target.id,
      _text: text.trim(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Message envoyé");
    close();
    if (data)
      navigate({
        to: "/messages/$id",
        params: { id: data as string },
        search: { draft: undefined },
      });
  };

  const doToggleVerified = async (p: Profile) => {
    const next = !p.verified;
    const { error } = await supabase.rpc("admin_set_verified", { _target: p.id, _value: next });
    if (error) return toast.error(error.message);
    if (next)
      sendEmail("send-admin-email", {
        userId: p.id,
        kind: "verified",
        recipientName: p.display_name,
      });
    refreshOne(p.id, { verified: next });
    toast.success(next ? "Profil vérifié" : "Vérification retirée");
  };

  const openDetail = async (p: Profile) => {
    open(p, "detail");
    const [h, r, b] = await Promise.all([
      supabase
        .from("admin_actions")
        .select("*")
        .eq("target_user_id", p.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("reports")
        .select("*")
        .eq("reported_id", p.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("books")
        .select("id,title,status,created_at")
        .eq("seller_id", p.id)
        .order("created_at", { ascending: false }),
    ]);
    setDetailHistory((h.data ?? []) as DetailHistory[]);
    setDetailReports((r.data ?? []) as DetailReport[]);
    setDetailBooks((b.data ?? []) as DetailBook[]);
  };

  // ---- Render ----
  const statusBadge = (p: Profile) => {
    const now = Date.now();
    if (p.banned_at)
      return (
        <Badge variant="destructive" className="gap-1">
          🔴 Banni
        </Badge>
      );
    if (p.suspended_until && new Date(p.suspended_until).getTime() > now)
      return <Badge className="bg-amber-500 text-white gap-1">🟡 Suspendu</Badge>;
    return <Badge className="bg-emerald-500 text-white gap-1">🟢 Actif</Badge>;
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={16}
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (nom ou ID)…"
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="active">🟢 Actifs</SelectItem>
            <SelectItem value="suspended">🟡 Suspendus</SelectItem>
            <SelectItem value="banned">🔴 Bannis</SelectItem>
            <SelectItem value="verified">✅ Vérifiés</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={sortBy}
          onValueChange={(v) => setSortBy(v as "date" | "reports" | "activity")}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Trier : inscription</SelectItem>
            <SelectItem value="reports">Trier : signalements</SelectItem>
            <SelectItem value="activity">Trier : activité</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.map((p) => {
        const isAdminTarget = adminIds.has(p.id);
        const isSelf = p.id === admin?.id;
        const banned = !!p.banned_at;
        const suspended = !!p.suspended_until && new Date(p.suspended_until).getTime() > Date.now();
        return (
          <Card key={p.id} className="p-3 flex items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={p.avatar_url ?? undefined} />
              <AvatarFallback>{(p.display_name ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold truncate">{p.display_name ?? "Sans nom"}</p>
                {p.verified && (
                  <Badge className="bg-blue-500 text-white h-5 gap-0.5">
                    <BadgeCheck size={10} /> Vérifié
                  </Badge>
                )}
                {isAdminTarget && (
                  <Badge variant="outline" className="h-5">
                    Admin
                  </Badge>
                )}
                {statusBadge(p)}
                {p.warning_count > 0 && (
                  <Badge variant="outline" className="h-5 gap-0.5">
                    <AlertTriangle size={10} /> {p.warning_count}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {p.id.slice(0, 8)}… · {bookCounts[p.id] ?? 0} annonce(s) · {reportCounts[p.id] ?? 0}{" "}
                signalement(s) · inscrit {new Date(p.created_at).toLocaleDateString("fr-FR")}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost">
                  <MoreVertical size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => openDetail(p)}>
                  <Eye size={14} className="mr-2" /> Fiche détaillée
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => open(p, "message")}>
                  <Send size={14} className="mr-2" /> Envoyer un message
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => doToggleVerified(p)}>
                  {p.verified ? (
                    <ShieldOff size={14} className="mr-2" />
                  ) : (
                    <BadgeCheck size={14} className="mr-2" />
                  )}
                  {p.verified ? "Retirer la vérification" : "Vérifier le profil"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => open(p, "warn")} disabled={isSelf}>
                  <AlertTriangle size={14} className="mr-2" /> Avertir
                </DropdownMenuItem>
                {suspended ? (
                  <DropdownMenuItem onClick={() => open(p, "unsuspend")}>
                    <Shield size={14} className="mr-2" /> Lever la suspension
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => open(p, "suspend")}
                    disabled={isAdminTarget || isSelf}
                  >
                    <Clock size={14} className="mr-2" /> Suspendre
                  </DropdownMenuItem>
                )}
                {banned ? (
                  <DropdownMenuItem onClick={() => open(p, "unban")}>
                    <Shield size={14} className="mr-2" /> Débannir
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => open(p, "ban")}
                    disabled={isAdminTarget || isSelf}
                    className="text-destructive"
                  >
                    <Ban size={14} className="mr-2" /> Bannir
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => open(p, "delete")}
                  disabled={isAdminTarget || isSelf}
                  className="text-destructive"
                >
                  <Trash2 size={14} className="mr-2" /> Supprimer le compte
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Card>
        );
      })}
      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-8">Aucun utilisateur</p>
      )}

      {/* WARN */}
      <Dialog open={action === "warn"} onOpenChange={(v) => !v && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>⚠️ Avertir {target?.display_name}</DialogTitle>
          </DialogHeader>
          <ReasonPicker
            reason={reason}
            setReason={setReason}
            reasonOther={reasonOther}
            setReasonOther={setReasonOther}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={close}>
              Annuler
            </Button>
            <Button onClick={doWarn} disabled={busy}>
              Envoyer l'avertissement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SUSPEND */}
      <Dialog open={action === "suspend"} onOpenChange={(v) => !v && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>⏸️ Suspendre {target?.display_name}</DialogTitle>
          </DialogHeader>
          <Label>Durée</Label>
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATIONS.map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {d} jour(s)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ReasonPicker
            reason={reason}
            setReason={setReason}
            reasonOther={reasonOther}
            setReasonOther={setReasonOther}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={close}>
              Annuler
            </Button>
            <Button onClick={doSuspend} disabled={busy}>
              Suspendre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* UNSUSPEND */}
      <Dialog open={action === "unsuspend"} onOpenChange={(v) => !v && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lever la suspension</DialogTitle>
          </DialogHeader>
          <Label>Note (facultative)</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
          <DialogFooter>
            <Button variant="ghost" onClick={close}>
              Annuler
            </Button>
            <Button onClick={doUnsuspend} disabled={busy}>
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BAN */}
      <Dialog open={action === "ban"} onOpenChange={(v) => !v && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">🚫 Bannir {target?.display_name}</DialogTitle>
            <DialogDescription>Cette action bloque définitivement le compte.</DialogDescription>
          </DialogHeader>
          {confirmStep === 0 ? (
            <ReasonPicker
              reason={reason}
              setReason={setReason}
              reasonOther={reasonOther}
              setReasonOther={setReasonOther}
            />
          ) : (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
              ⚠️ Êtes-vous sûr ? Cliquez à nouveau sur <strong>Confirmer le bannissement</strong>{" "}
              pour valider.
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={close}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={doBan} disabled={busy}>
              {confirmStep === 0 ? "Continuer" : "Confirmer le bannissement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* UNBAN */}
      <Dialog open={action === "unban"} onOpenChange={(v) => !v && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Débannir {target?.display_name}</DialogTitle>
          </DialogHeader>
          <Label>Note explicative (obligatoire)</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} required />
          <DialogFooter>
            <Button variant="ghost" onClick={close}>
              Annuler
            </Button>
            <Button onClick={doUnban} disabled={busy}>
              Débannir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE */}
      <Dialog open={action === "delete"} onOpenChange={(v) => !v && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">
              🗑️ Supprimer {target?.display_name}
            </DialogTitle>
          </DialogHeader>
          {confirmStep === 0 && (
            <p>
              Voulez-vous vraiment supprimer ce compte et toutes ses données (annonces, messages,
              favoris, avis) ?
            </p>
          )}
          {confirmStep === 1 && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
              ⚠️ <strong>Cette action est irréversible.</strong> Toutes les données de l'utilisateur
              seront définitivement perdues.
            </div>
          )}
          {confirmStep === 2 && (
            <div className="space-y-2">
              <Label>
                Tapez <code className="font-mono bg-muted px-1.5 py-0.5 rounded">SUPPRIMER</code>{" "}
                pour confirmer :
              </Label>
              <Input
                value={confirmTyped}
                onChange={(e) => setConfirmTyped(e.target.value)}
                placeholder="SUPPRIMER"
              />
              <Label>Note (facultative)</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={close}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={doDelete} disabled={busy}>
              {confirmStep < 2 ? "Continuer" : "Supprimer définitivement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MESSAGE */}
      <Dialog open={action === "message"} onOpenChange={(v) => !v && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>📧 Message à {target?.display_name}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Votre message en tant que MyKutub Admin…"
            rows={5}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={close}>
              Annuler
            </Button>
            <Button onClick={doMessage} disabled={busy}>
              <Send size={14} className="mr-2" /> Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DETAIL SHEET */}
      <Sheet open={action === "detail"} onOpenChange={(v) => !v && close()}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{target?.display_name ?? "Utilisateur"}</SheetTitle>
          </SheetHeader>
          {target && (
            <div className="space-y-5 mt-4 text-sm">
              <section>
                <h3 className="font-semibold mb-1">Profil</h3>
                <p>
                  ID : <span className="font-mono text-xs">{target.id}</span>
                </p>
                <p>Inscrit le {new Date(target.created_at).toLocaleString("fr-FR")}</p>
                <p>
                  Dernière connexion :{" "}
                  {target.last_seen ? new Date(target.last_seen).toLocaleString("fr-FR") : "—"}
                </p>
                <p>Avertissements : {target.warning_count}</p>
                <p className="text-muted-foreground text-xs mt-2">
                  Adresse IP : non collectée (respect de la vie privée)
                </p>
              </section>
              <section>
                <h3 className="font-semibold mb-1">Annonces ({detailBooks.length})</h3>
                <ul className="space-y-1">
                  {detailBooks.map((b) => (
                    <li key={b.id}>
                      <Link to="/book/$id" params={{ id: b.id }} className="hover:underline">
                        {b.title}
                      </Link>{" "}
                      <span className="text-xs text-muted-foreground">· {b.status}</span>
                    </li>
                  ))}
                  {detailBooks.length === 0 && (
                    <li className="text-muted-foreground">Aucune annonce</li>
                  )}
                </ul>
              </section>
              <section>
                <h3 className="font-semibold mb-1">Signalements reçus ({detailReports.length})</h3>
                <ul className="space-y-1">
                  {detailReports.map((r) => (
                    <li key={r.id} className="text-xs">
                      {new Date(r.created_at).toLocaleDateString("fr-FR")} — {r.raison} —{" "}
                      <em>{r.statut}</em>
                    </li>
                  ))}
                  {detailReports.length === 0 && <li className="text-muted-foreground">Aucun</li>}
                </ul>
              </section>
              <section>
                <h3 className="font-semibold mb-1">
                  Historique des sanctions admin ({detailHistory.length})
                </h3>
                <ul className="space-y-1">
                  {detailHistory.map((h) => (
                    <li key={h.id} className="text-xs">
                      {new Date(h.created_at).toLocaleString("fr-FR")} — <strong>{h.action}</strong>
                      {h.reason ? ` — ${h.reason}` : ""}
                      {h.duration_days ? ` (${h.duration_days}j)` : ""}
                      {h.note ? ` — ${h.note}` : ""}
                    </li>
                  ))}
                  {detailHistory.length === 0 && (
                    <li className="text-muted-foreground">Aucune sanction</li>
                  )}
                </ul>
              </section>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ReasonPicker({
  reason,
  setReason,
  reasonOther,
  setReasonOther,
}: {
  reason: string;
  setReason: (v: string) => void;
  reasonOther: string;
  setReasonOther: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Raison</Label>
      <Select value={reason} onValueChange={setReason}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {REASONS.map((r) => (
            <SelectItem key={r} value={r}>
              {r}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {reason === "Autre" && (
        <Textarea
          value={reasonOther}
          onChange={(e) => setReasonOther(e.target.value)}
          placeholder="Précisez la raison…"
        />
      )}
    </div>
  );
}
