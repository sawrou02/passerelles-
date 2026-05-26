import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, KeyRound, Bell, Shield, Trash2, Loader2, Ban } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

type Prefs = {
  notify_email: boolean;
  notify_sms: boolean;
  notify_push: boolean;
  phone_visible: boolean;
  notify_reservations: boolean;
  notify_messages: boolean;
  notify_followers: boolean;
  notify_admin: boolean;
};

function SettingsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading: authLoading, signOut } = useAuth();
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({ notify_email: true, notify_sms: false, notify_push: true, phone_visible: false, notify_reservations: true, notify_messages: true, notify_followers: true, notify_admin: true });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [blocked, setBlocked] = useState<Array<{ id: string; blocked_id: string; name: string }>>([]);
  const [confirmUnblock, setConfirmUnblock] = useState<{ id: string; name: string } | null>(null);

  const loadBlocked = async (uid: string) => {
    const { data } = await supabase
      .from("blocked_users")
      .select("id, blocked_id")
      .eq("blocker_id", uid)
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as Array<{ id: string; blocked_id: string }>;
    if (rows.length === 0) { setBlocked([]); return; }
    const { data: profs } = await supabase
      .from("profiles").select("id, display_name").in("id", rows.map(r => r.blocked_id));
    const nameMap = new Map<string, string>();
    (profs ?? []).forEach((p: { id: string; display_name: string | null }) => nameMap.set(p.id, p.display_name || "Utilisateur"));
    setBlocked(rows.map(r => ({ id: r.id, blocked_id: r.blocked_id, name: nameMap.get(r.blocked_id) || "Utilisateur" })));
  };

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("notify_email, notify_sms, notify_push, phone_visible, notify_reservations, notify_messages, notify_followers, notify_admin").eq("id", user.id).maybeSingle()
      .then(({ data }) => { if (data) setPrefs(data as Prefs); });
    loadBlocked(user.id);
  }, [user]);

  const unblock = async () => {
    if (!confirmUnblock || !user) return;
    const { error } = await supabase.from("blocked_users").delete().eq("id", confirmUnblock.id);
    if (error) toast.error("Échec du déblocage");
    else { toast.success(`${confirmUnblock.name} a été débloqué`); loadBlocked(user.id); }
    setConfirmUnblock(null);
  };

  if (authLoading) return <div className="p-10 text-center">{t("common.loading")}</div>;
  if (!user) {
    return (
      <div className="p-10 text-center space-y-4">
        <p>{t("settings.loginRequired")}</p>
        <Button onClick={() => navigate({ to: "/login" })}>{t("nav.login")}</Button>
      </div>
    );
  }

  const handlePwdChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 6) { toast.error(t("settings.pwdShort")); return; }
    if (pwd !== pwd2) { toast.error(t("settings.pwdMismatch")); return; }
    setPwdLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setPwdLoading(false);
    if (error) toast.error(error.message);
    else { toast.success(t("settings.pwdUpdated")); setPwd(""); setPwd2(""); }
  };

  const savePrefs = async (next: Prefs) => {
    setPrefs(next);
    setSavingPrefs(true);
    const { error } = await supabase.from("profiles").update(next).eq("id", user.id);
    setSavingPrefs(false);
    if (error) toast.error(error.message);
  };

  const handleDeleteAccount = async () => {
    if (!confirm(t("settings.confirmDelete1"))) return;
    if (!confirm(t("settings.confirmDelete2"))) return;
    setDeleting(true);
    await supabase.from("books").delete().eq("seller_id", user.id);
    await supabase.from("favorites").delete().eq("user_id", user.id);
    await supabase.from("profiles").delete().eq("id", user.id);
    await signOut();
    setDeleting(false);
    toast.success(t("settings.deletedToast"));
    navigate({ to: "/" });
  };

  return (
    <div className="bg-background min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-card border-b px-4 py-3 flex items-center gap-3">
        <Link to="/profile" className="p-2"><ChevronLeft size={24} /></Link>
        <h1 className="font-headline text-xl font-bold">{t("settings.title")}</h1>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <section className="bg-card border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary"><KeyRound size={18} /></div>
            <h2 className="font-headline font-bold text-lg">{t("settings.pwd")}</h2>
          </div>
          <form onSubmit={handlePwdChange} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest">{t("settings.newPwd")}</Label>
              <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} className="h-11" minLength={6} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest">{t("settings.confirmPwd")}</Label>
              <Input type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} className="h-11" minLength={6} required />
            </div>
            <Button type="submit" disabled={pwdLoading} className="w-full h-12 rounded-xl font-bold">
              {pwdLoading ? <Loader2 className="animate-spin" size={16} /> : t("settings.update")}
            </Button>
          </form>
        </section>

        <section className="bg-card border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary"><Bell size={18} /></div>
            <h2 className="font-headline font-bold text-lg">{t("settings.notifs")}</h2>
            {savingPrefs && <Loader2 className="animate-spin text-muted-foreground" size={14} />}
          </div>
          <div className="space-y-3">
            {[
              { key: "notify_email" as const, label: t("settings.notifEmail"), desc: t("settings.notifEmailDesc") },
              { key: "notify_sms" as const, label: t("settings.notifSms"), desc: t("settings.notifSmsDesc") },
              { key: "notify_push" as const, label: t("settings.notifPush"), desc: t("settings.notifPushDesc") },
              { key: "notify_reservations" as const, label: "Emails réservations", desc: "Demandes, confirmations et annulations" },
              { key: "notify_messages" as const, label: "Emails messages", desc: "Nouveau message (max 1 / 30 min)" },
              { key: "notify_followers" as const, label: "Emails abonnés", desc: "Quand quelqu'un vous suit" },
              { key: "notify_admin" as const, label: "Emails admin", desc: "Vérification, annonces officielles" },
            ].map(opt => (
              <div key={opt.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-semibold text-sm">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
                <Switch checked={prefs[opt.key]} onCheckedChange={(v) => savePrefs({ ...prefs, [opt.key]: v })} />
              </div>
            ))}
          </div>
        </section>

        <section className="bg-card border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary"><Shield size={18} /></div>
            <h2 className="font-headline font-bold text-lg">{t("settings.privacy")}</h2>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <p className="font-semibold text-sm">{t("settings.phoneVisible")}</p>
              <p className="text-xs text-muted-foreground">{t("settings.phoneVisibleDesc")}</p>
            </div>
            <Switch checked={prefs.phone_visible} onCheckedChange={(v) => savePrefs({ ...prefs, phone_visible: v })} />
          </div>
        </section>

        <section className="bg-card border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-lg text-destructive"><Ban size={18} /></div>
            <h2 className="font-headline font-bold text-lg">Utilisateurs bloqués</h2>
          </div>
          {blocked.length === 0 ? (
            <p className="text-sm text-muted-foreground">Vous n'avez bloqué aucun utilisateur.</p>
          ) : (
            <ul className="divide-y">
              {blocked.map((b) => (
                <li key={b.id} className="flex items-center justify-between py-3">
                  <span className="text-sm font-medium">{b.name}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => setConfirmUnblock({ id: b.id, name: b.name })}
                  >
                    Débloquer
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <AlertDialog open={!!confirmUnblock} onOpenChange={(o) => !o && setConfirmUnblock(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Débloquer {confirmUnblock?.name} ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cet utilisateur pourra à nouveau vous envoyer des messages et voir vos annonces.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={unblock}>Débloquer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <section className="bg-card border border-destructive/30 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-lg text-destructive"><Trash2 size={18} /></div>
            <h2 className="font-headline font-bold text-lg text-destructive">{t("settings.danger")}</h2>
          </div>
          <p className="text-sm text-muted-foreground">{t("settings.dangerText")}</p>
          <Button onClick={handleDeleteAccount} disabled={deleting} variant="destructive" className="w-full h-12 rounded-xl font-bold">
            {deleting ? <Loader2 className="animate-spin" size={16} /> : t("settings.deleteBtn")}
          </Button>
        </section>
      </div>
    </div>
  );
}
