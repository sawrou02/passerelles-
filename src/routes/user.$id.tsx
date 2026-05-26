import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, MessageCircle, Star, Calendar, Users, BadgeCheck, MoreVertical, Ban, UserPlus, UserMinus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BookCard } from "@/components/BookCard";
import { SellerReviews } from "@/components/SellerReviews";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { sendEmail } from "@/lib/email";
import type { Book, Review } from "@/lib/mykutub";
import { VerifiedPhoneBadge } from "@/components/VerifiedPhoneBadge";

export const Route = createFileRoute("/user/$id")({
  validateSearch: (s: Record<string, unknown>) => ({
    chatId: typeof s.chatId === "string" ? s.chatId : undefined,
  }),
  component: UserProfilePage,
});

function UserProfilePage() {
  const { id: userId } = Route.useParams();
  const { chatId } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ display_name: string | null; created_at?: string | null; verified?: boolean | null; phone_verified?: boolean | null } | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followBusy, setFollowBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("profiles").select("display_name, created_at, verified, phone_verified").eq("id", userId).maybeSingle(),
      supabase.from("books").select("*").eq("seller_id", userId).order("created_at", { ascending: false }),
      supabase.from("reviews").select("*").eq("seller_id", userId),
      supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", userId),
      user ? supabase.from("follows").select("id").eq("follower_id", user.id).eq("following_id", userId).maybeSingle() : Promise.resolve({ data: null } as any),
    ]).then(([p, b, r, fc, mf]: any[]) => {
      setProfile((p.data as any) ?? { display_name: null });
      setBooks((b.data as Book[]) ?? []);
      setReviews((r.data as Review[]) ?? []);
      setFollowersCount(fc.count ?? 0);
      setIsFollowing(!!mf.data);
      setLoading(false);
    });
  }, [userId, user]);

  const displayName = profile?.display_name || "Utilisateur";
  const initials = displayName.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();
  const isMe = user?.id === userId;
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    : null;

  if (loading) return <div className="p-10 text-center text-sm">Chargement...</div>;

  const handleBlock = async () => {
    if (!user) return;
    setBlocking(true);
    const { error } = await supabase.from("blocked_users").insert({
      blocker_id: user.id,
      blocked_id: userId,
    });
    setBlocking(false);
    setConfirmBlock(false);
    if (error && !error.message.toLowerCase().includes("duplicate")) {
      toast.error("Impossible de bloquer cet utilisateur");
    } else {
      toast.success(`${displayName} a été bloqué`);
      navigate({ to: "/" });
    }
  };

  const toggleFollow = async () => {
    if (!user) { navigate({ to: "/login" }); return; }
    setFollowBusy(true);
    if (isFollowing) {
      const { error } = await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", userId);
      if (error) toast.error("Erreur lors du désabonnement");
      else {
        setIsFollowing(false);
        setFollowersCount(c => Math.max(0, c - 1));
        toast.success(`Vous ne suivez plus ${displayName}`);
      }
    } else {
      const { error } = await supabase.from("follows").insert({ follower_id: user.id, following_id: userId });
      if (error) toast.error("Impossible de suivre cet utilisateur");
      else {
        setIsFollowing(true);
        setFollowersCount(c => c + 1);
        toast.success(`Vous suivez ${displayName}`);
        const followerName = user.user_metadata?.display_name || user.email?.split("@")[0] || "Quelqu'un";
        sendEmail("send-admin-email", {
          userId, kind: "follower", followerName, followerId: user.id,
        });
      }
    }
    setFollowBusy(false);
  };

  return (
    <div className="bg-muted/20 min-h-screen pb-24">
      <header className="bg-card border-b px-3 py-2.5 flex items-center gap-2 sticky top-0 z-40">
        <button onClick={() => history.back()} className="p-1">
          <ChevronLeft size={22} className="text-primary" />
        </button>
        <h1 className="font-semibold text-sm flex-1">Profil vendeur</h1>
        {!isMe && user && (
          <DropdownMenu>
            <DropdownMenuTrigger className="p-2 rounded-full hover:bg-muted">
              <MoreVertical size={18} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 shadow-lg animate-in fade-in-0 zoom-in-95">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                onSelect={() => setConfirmBlock(true)}
              >
                <Ban size={15} className="mr-2" />
                Bloquer cet utilisateur
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      <AlertDialog open={confirmBlock} onOpenChange={setConfirmBlock}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Ban size={18} className="text-destructive" /> Bloquer {displayName} ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous bloquer {displayName} ? Il ne pourra plus vous envoyer de messages
              ni voir vos annonces.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={blocking}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlock}
              disabled={blocking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Bloquer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Compact profile card – leboncoin style */}
      <section className="bg-card border-b">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg flex-shrink-0">
              {initials || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-base truncate">{displayName}</h2>
                {profile?.phone_verified && <VerifiedPhoneBadge />}
              </div>
              <div className="flex items-center gap-1 mt-0.5 text-xs">
                <Star size={12} className="fill-amber-500 text-amber-500" />
                <span className="font-semibold">{reviews.length ? avg.toFixed(1) : "—"}</span>
                <span className="text-muted-foreground">({reviews.length} avis)</span>
              </div>
            </div>
            {!isMe && user && (
              <Button
                size="sm"
                variant={isFollowing ? "outline" : "default"}
                className="rounded-full text-xs h-8 gap-1"
                disabled={followBusy}
                onClick={toggleFollow}
              >
                {isFollowing ? <><UserMinus size={13} /> Se désabonner</> : <><UserPlus size={13} /> Suivre</>}
              </Button>
            )}
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-xs text-muted-foreground">
            {memberSince && (
              <div className="flex items-center gap-1.5">
                <Calendar size={12} /> Membre depuis {memberSince}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Users size={12} /> {books.length} annonce{books.length > 1 ? "s" : ""}
            </div>
            <div className="flex items-center gap-1.5">
              <UserPlus size={12} /> {followersCount} abonné{followersCount > 1 ? "s" : ""}
            </div>
            {profile?.verified && (
              <div className="flex items-center gap-1.5">
                <BadgeCheck size={12} className="text-emerald-600" /> Profil vérifié
              </div>
            )}
          </div>

          {!isMe && user && (
            <Button
              size="sm"
              className="mt-3 w-full rounded-full h-9 text-xs"
              onClick={() => navigate({ to: "/messages" })}
            >
              <MessageCircle size={14} className="mr-1.5" /> Envoyer un message
            </Button>
          )}
        </div>
      </section>

      {/* Tabs */}
      <div className="max-w-3xl mx-auto px-3 pt-3">
        <Tabs defaultValue="annonces" className="w-full">
          <TabsList className="w-full bg-transparent border-b rounded-none h-auto p-0 justify-start gap-4">
            <TabsTrigger
              value="annonces"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2 text-sm font-semibold"
            >
              Annonces ({books.length})
            </TabsTrigger>
            <TabsTrigger
              value="avis"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2 text-sm font-semibold"
            >
              Avis ({reviews.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="annonces" className="mt-4">
            {books.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Aucune annonce publiée.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {books.map(book => <BookCard key={book.id} book={book} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="avis" className="mt-4">
            <div className="bg-card border rounded-xl p-4">
              <SellerReviews sellerId={userId} chatId={chatId} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
