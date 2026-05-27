import { Link } from "@tanstack/react-router";
import { Heart, Star, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Book } from "@/lib/mykutub";

const COLORS = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-indigo-500",
  "bg-fuchsia-500",
  "bg-rose-500",
];
function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

export function BookCard({
  book,
  onUnfavorite,
}: {
  book: Book;
  onUnfavorite?: (id: string) => void;
}) {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState<{ avg: number; count: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("reviews")
      .select("rating")
      .eq("seller_id", book.seller_id)
      .then(({ data }) => {
        if (cancelled || !data || data.length === 0) return;
        const avg = data.reduce((s, r) => s + (r.rating ?? 0), 0) / data.length;
        setRating({ avg, count: data.length });
      });
    return () => {
      cancelled = true;
    };
  }, [book.seller_id]);

  useEffect(() => {
    if (!user) {
      setIsLiked(false);
      return;
    }
    let cancelled = false;
    supabase
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("book_id", book.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setIsLiked(!!data);
      });
    return () => {
      cancelled = true;
    };
  }, [user, book.id]);

  const toggleFav = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error("Connectez-vous pour ajouter aux favoris.");
      return;
    }
    if (busy) return;
    setBusy(true);
    if (isLiked) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("book_id", book.id);
      if (!error) {
        setIsLiked(false);
        onUnfavorite?.(book.id);
      } else toast.error("Erreur");
    } else {
      const { error } = await supabase
        .from("favorites")
        .insert({ user_id: user.id, book_id: book.id });
      if (!error) setIsLiked(true);
      else toast.error("Erreur");
    }
    setBusy(false);
  };

  const initial = (book.seller_name || "?").trim().charAt(0).toUpperCase();

  return (
    <Link to="/book/$id" params={{ id: book.id }} className="block group">
      <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
        <div
          className={cn(
            "w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0",
            colorFor(book.seller_id),
          )}
        >
          {initial}
        </div>
        <span className="text-[11px] font-medium text-foreground truncate">{book.seller_name}</span>
        {rating && (
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground flex-shrink-0">
            <Star size={10} className="fill-amber-500 text-amber-500" />
            <span className="font-semibold text-foreground">{rating.avg.toFixed(1)}</span>
            <span>({rating.count})</span>
          </span>
        )}
      </div>

      <div className="relative aspect-square overflow-hidden bg-muted rounded-lg">
        <img
          src={book.image_url}
          alt={`${book.title} — livre islamique d'occasion${book.city ? ` à ${book.city}` : ""}`}
          width={400}
          height={400}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <button
          onClick={toggleFav}
          disabled={busy}
          className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-white/90 text-foreground hover:text-destructive shadow-sm disabled:opacity-50"
          aria-label="Favori"
        >
          <Heart
            size={12}
            fill={isLiked ? "currentColor" : "transparent"}
            className={cn(isLiked && "text-destructive")}
          />
        </button>
        {book.is_donation && (
          <span className="absolute top-1.5 left-1.5 bg-secondary text-secondary-foreground text-[8px] font-bold uppercase px-1.5 py-0.5 rounded">
            Don
          </span>
        )}
        {book.status === "reserved" && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-amber-500 text-white text-[10px] font-bold uppercase px-2 py-1 rounded shadow">
              Réservé
            </span>
          </div>
        )}
        {book.status === "given" && (
          <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
            <span className="bg-red-600 text-white text-[10px] font-bold uppercase px-2 py-1 rounded shadow">
              Déjà donné
            </span>
          </div>
        )}
      </div>
      <div className="pt-1.5 space-y-0.5">
        <h3 className="font-semibold text-[13px] leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {book.title}
        </h3>
        <p className="font-bold text-sm text-foreground">
          {book.is_donation ? "Don" : `${book.price} €`}
        </p>
        {book.can_deliver && (
          <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Truck size={10} /> Livraison possible
          </p>
        )}
        <p className="text-[10px] text-muted-foreground truncate">
          {book.city} · {new Date(book.created_at).toLocaleDateString("fr-FR")}
        </p>
      </div>
    </Link>
  );
}
