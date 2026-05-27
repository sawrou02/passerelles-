import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Settings,
  LogOut,
  Package,
  Heart,
  UserCircle,
  Trash2,
  Camera,
  Loader2,
  Mail,
  Phone,
  MapPin,
  Save,
  Pencil,
  Users,
  UserMinus,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookCard } from "@/components/BookCard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Book } from "@/lib/mykutub";
import { VerifiedPhoneBadge } from "@/components/VerifiedPhoneBadge";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  phone_visible: boolean;
  city: string | null;
  phone_verified?: boolean | null;
};

function ProfilePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading: authLoading, signOut } = useAuth();
  const [myBooks, setMyBooks] = useState<Book[]>([]);
  const [favorites, setFavorites] = useState<Book[]>([]);
  const [following, setFollowing] = useState<
    Array<{ id: string; display_name: string | null; avatar_url: string | null }>
  >([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("books")
      .select("*")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setMyBooks((data as Book[]) ?? []));

    Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, avatar_url, phone_visible, city, phone_verified")
        .eq("id", user.id)
        .maybeSingle(),
      // RPC name not present in generated supabase types yet; cast required.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase.rpc("get_my_phone" as any),
    ]).then(([{ data }, { data: ownPhone }]) =>
      setProfile(
        data
          ? ({
              ...(data as Omit<Profile, "phone">),
              phone: (ownPhone as string | null) ?? null,
            } satisfies Profile)
          : {
              id: user.id,
              display_name: null,
              avatar_url: null,
              phone: null,
              phone_visible: false,
              city: null,
            },
      ),
    );

    supabase
      .from("favorites")
      .select("book_id")
      .eq("user_id", user.id)
      .then(async ({ data }) => {
        const rows = (data ?? []) as Array<{ book_id: string }>;
        const ids = rows.map((r) => r.book_id);
        if (!ids.length) {
          setFavorites([]);
          return;
        }
        const { data: bks } = await supabase.from("books").select("*").in("id", ids);
        setFavorites((bks as Book[]) ?? []);
      });

    supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id)
      .then(async ({ data }) => {
        const rows = (data ?? []) as Array<{ following_id: string }>;
        const ids = rows.map((r) => r.following_id);
        if (!ids.length) {
          setFollowing([]);
          return;
        }
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", ids);
        setFollowing(
          (profs as Array<{
            id: string;
            display_name: string | null;
            avatar_url: string | null;
          }>) ?? [],
        );
      });
  }, [user]);

  const handleUnfollow = async (sellerId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", sellerId);
    if (error) {
      toast.error("Erreur");
      return;
    }
    setFollowing((prev) => prev.filter((f) => f.id !== sellerId));
    toast.success("Désabonné");
  };

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("profile.confirmDelete"))) return;
    const { error } = await supabase.from("books").delete().eq("id", id);
    if (error) toast.error(t("profile.deleteError"));
    else {
      setMyBooks((b) => b.filter((x) => x.id !== id));
      toast.success(t("profile.deleted"));
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("profile.avatarTooBig"));
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      toast.error(error.message);
      setUploading(false);
      return;
    }
    const { data: signed, error: signErr } = await supabase.storage
      .from("avatars")
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signErr || !signed) {
      toast.error(signErr?.message ?? "URL error");
      setUploading(false);
      return;
    }
    const url = signed.signedUrl;
    await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
    setProfile((p) => (p ? { ...p, avatar_url: url } : p));
    toast.success(t("profile.avatarUpdated"));
    setUploading(false);
  };

  const handleSaveProfile = async () => {
    if (!user || !profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: profile.display_name,
        phone: profile.phone,
        phone_visible: profile.phone_visible,
        city: profile.city,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      // 23505 = unique_violation Postgres (cf. migration uq_profiles_phone)
      if (error.code === "23505" && error.message.includes("uq_profiles_phone")) {
        toast.error("Ce numéro de téléphone est déjà utilisé par un autre compte.");
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success(t("profile.profileSaved"));
    }
  };

  if (authLoading) return <div className="p-10 text-center">{t("common.loading")}</div>;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center space-y-6">
        <UserCircle size={80} className="text-muted-foreground" />
        <h1 className="text-2xl font-bold">{t("profile.loginCta")}</h1>
        <Button
          onClick={() => navigate({ to: "/login" })}
          className="w-full max-w-sm h-14 text-lg font-bold rounded-xl"
        >
          {t("profile.login")}
        </Button>
      </div>
    );
  }

  const displayName =
    profile?.display_name ||
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "Utilisateur";

  return (
    <div className="bg-background min-h-screen pb-24">
      <header className="bg-card border-b px-6 py-8">
        <div className="max-w-4xl mx-auto flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-card shadow-md overflow-hidden">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserCircle className="text-primary" size={48} />
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-primary text-primary-foreground shadow-md hover:scale-105 transition"
              >
                {uploading ? <Loader2 className="animate-spin" size={14} /> : <Camera size={14} />}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-headline font-bold text-2xl tracking-tight">{displayName}</h1>
                {profile?.phone_verified && <VerifiedPhoneBadge />}
              </div>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Button asChild variant="ghost" size="icon" className="rounded-full">
            <Link to="/settings">
              <Settings size={20} />
            </Link>
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4">
        <Tabs defaultValue="info">
          <TabsList className="w-full bg-transparent border-b rounded-none h-12 mb-6">
            <TabsTrigger
              value="info"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary font-bold"
            >
              {t("profile.tabInfo")}
            </TabsTrigger>
            <TabsTrigger
              value="ads"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary font-bold"
            >
              {t("profile.tabAds")}
            </TabsTrigger>
            <TabsTrigger
              value="likes"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary font-bold"
            >
              {t("profile.tabFavs")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <div className="bg-card rounded-2xl border p-6 space-y-5">
              <h2 className="font-headline font-bold text-lg">{t("profile.info")}</h2>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest">
                  {t("profile.name")}
                </Label>
                <Input
                  value={profile?.display_name ?? ""}
                  onChange={(e) =>
                    setProfile((p) => (p ? { ...p, display_name: e.target.value } : p))
                  }
                  className="h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <Mail size={12} /> {t("profile.email")}
                </Label>
                <Input value={user.email ?? ""} disabled className="h-11 bg-muted" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <Phone size={12} /> {t("profile.phone")}
                </Label>
                <Input
                  value={profile?.phone ?? ""}
                  placeholder="06 12 34 56 78"
                  onChange={(e) => setProfile((p) => (p ? { ...p, phone: e.target.value } : p))}
                  className="h-11"
                />
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 mt-2">
                  <Label className="text-sm">{t("profile.phoneVisible")}</Label>
                  <Switch
                    checked={profile?.phone_visible ?? false}
                    onCheckedChange={(v) => setProfile((p) => (p ? { ...p, phone_visible: v } : p))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <MapPin size={12} /> {t("profile.city")}
                </Label>
                <Input
                  value={profile?.city ?? ""}
                  placeholder="Paris"
                  onChange={(e) => setProfile((p) => (p ? { ...p, city: e.target.value } : p))}
                  className="h-11"
                />
              </div>

              <Button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full h-12 rounded-xl font-bold gap-2"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                {t("profile.save")}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="ads">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {myBooks.map((book) => (
                <div key={book.id} className="relative group">
                  <BookCard book={book} />
                  <div className="absolute top-2 left-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      to="/modifier/$id"
                      params={{ id: book.id }}
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 bg-primary text-primary-foreground rounded-full shadow-lg"
                    >
                      <Pencil size={16} />
                    </Link>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleDelete(book.id);
                      }}
                      className="p-2 bg-destructive text-destructive-foreground rounded-full shadow-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              <Link
                to="/publish"
                className="aspect-[3/4] border-2 border-dashed border-primary/20 rounded-2xl flex flex-col items-center justify-center text-primary/60 hover:bg-primary/5 transition-colors gap-2"
              >
                <Package size={32} />
                <span className="font-bold text-xs uppercase tracking-wider text-center px-2">
                  {t("profile.newAd")}
                </span>
              </Link>
            </div>
          </TabsContent>

          <TabsContent value="likes">
            {favorites.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Heart size={40} className="text-muted-foreground mb-4" />
                <p className="font-bold text-lg">{t("profile.noFavorites")}</p>
                <p className="text-sm text-muted-foreground mt-1">{t("profile.noFavoritesHint")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {favorites.map((b) => (
                  <BookCard
                    key={b.id}
                    book={b}
                    onUnfavorite={(id) => setFavorites((prev) => prev.filter((x) => x.id !== id))}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <section className="mt-8">
          <div className="bg-card rounded-2xl border p-5">
            <h2 className="font-headline font-bold text-lg flex items-center gap-2 mb-4">
              <Users size={18} className="text-primary" /> Mes abonnements
              <span className="text-xs font-normal text-muted-foreground">
                ({following.length})
              </span>
            </h2>
            {following.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Vous ne suivez aucun vendeur pour le moment.
              </p>
            ) : (
              <ul className="divide-y">
                {following.map((f) => {
                  const initials = (f.display_name || "U")
                    .split(" ")
                    .map((s) => s[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  return (
                    <li key={f.id} className="flex items-center gap-3 py-3">
                      <Link
                        to="/user/$id"
                        params={{ id: f.id }}
                        search={{ chatId: undefined }}
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {f.avatar_url ? (
                            <img src={f.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-primary font-bold text-sm">{initials}</span>
                          )}
                        </div>
                        <span className="font-semibold text-sm truncate">
                          {f.display_name || "Utilisateur"}
                        </span>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full text-xs h-8 gap-1"
                        onClick={() => handleUnfollow(f.id)}
                      >
                        <UserMinus size={13} /> Se désabonner
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <div className="mt-8 space-y-3">
          <div className="bg-card rounded-2xl overflow-hidden shadow-sm border divide-y">
            <Link
              to="/settings"
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Settings size={18} />
                </div>
                <span className="font-bold text-sm">{t("profile.settings")}</span>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-between p-4 hover:bg-destructive/10 text-destructive transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <LogOut size={18} />
                </div>
                <span className="font-bold text-sm">{t("profile.logout")}</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
