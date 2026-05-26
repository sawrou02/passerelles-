import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, UserCheck, RotateCcw, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sendEmail } from "@/lib/email";
import { OnlineDot } from "@/components/OnlineDot";
import type { Book, BookRequest } from "@/lib/mykutub";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

type Props = {
  book: Book;
  onBookChange: (b: Book) => void;
};

export function BookReservation({ book, onBookChange }: Props) {
  const { user } = useAuth();
  const isOwner = user?.id === book.seller_id;
  const [requests, setRequests] = useState<BookRequest[]>([]);
  const [myRequest, setMyRequest] = useState<BookRequest | null>(null);
  const [busy, setBusy] = useState(false);

  const status = book.status ?? "available";

  // Load requests (owner sees all; others see only their own thanks to RLS)
  useEffect(() => {
    if (!user) return;
    const load = () => {
      supabase
        .from("book_requests")
        .select("*")
        .eq("book_id", book.id)
        .order("created_at", { ascending: true })
        .then(({ data }) => {
          const list = (data as BookRequest[]) ?? [];
          setRequests(list);
          setMyRequest(list.find((r) => r.requester_id === user.id) ?? null);
        });
    };
    load();
    const channel = supabase
      .channel(`book-req-${book.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "book_requests", filter: `book_id=eq.${book.id}` },
        load,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "books", filter: `id=eq.${book.id}` },
        (payload) => onBookChange(payload.new as Book),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [book.id, user, onBookChange]);

  const askForBook = async () => {
    if (!user) return toast.error("Connexion requise.");
    if (status !== "available") return;
    setBusy(true);
    const requesterName = user.user_metadata?.display_name || user.email?.split("@")[0] || "Utilisateur";
    const { error } = await supabase.from("book_requests").insert({
      book_id: book.id,
      requester_id: user.id,
      requester_name: requesterName,
      status: "pending",
    });
    if (error) {
      toast.error(error.code === "23505" ? "Vous avez déjà demandé ce livre." : "Erreur");
    } else {
      await supabase.from("notifications").insert({
        user_id: book.seller_id,
        message: `${requesterName} a demandé votre livre « ${book.title} »`,
        type: "request",
        link: `/book/${book.id}`,
      });
      sendEmail("send-reservation-email", {
        userId: book.seller_id, kind: "request",
        recipientName: book.seller_name, otherName: requesterName,
        bookTitle: book.title, bookId: book.id,
      });
      toast.success("Demande envoyée !");
    }
    setBusy(false);
  };

  const cancelMyRequest = async () => {
    if (!myRequest) return;
    setBusy(true);
    await supabase.from("book_requests").delete().eq("id", myRequest.id);
    setBusy(false);
  };

  const reserveFor = async (req: BookRequest) => {
    setBusy(true);
    const { error } = await supabase
      .from("books")
      .update({
        status: "reserved",
        reserved_by: req.requester_id,
        reserved_at: new Date().toISOString(),
      })
      .eq("id", book.id);
    if (error) {
      toast.error("Erreur lors de la réservation.");
      setBusy(false);
      return;
    }
    await supabase.from("book_requests").update({ status: "accepted" }).eq("id", req.id);
    // Notify
    const notifs = [
      {
        user_id: req.requester_id,
        message: `Votre réservation pour « ${book.title} » est confirmée !`,
        type: "reservation_confirmed",
        link: `/book/${book.id}`,
      },
      ...requests
        .filter((r) => r.id !== req.id)
        .map((r) => ({
          user_id: r.requester_id,
          message: `Le livre « ${book.title} » a été réservé par quelqu'un d'autre.`,
          type: "reservation_other",
          link: `/book/${book.id}`,
        })),
    ];
    if (notifs.length) await supabase.from("notifications").insert(notifs);
    sendEmail("send-reservation-email", {
      userId: req.requester_id, kind: "confirmed",
      recipientName: req.requester_name, otherName: book.seller_name,
      bookTitle: book.title, bookId: book.id,
    });
    toast.success("Livre réservé.");
    setBusy(false);
  };

  const cancelReservation = async () => {
    setBusy(true);
    const previous = book.reserved_by;
    const { error } = await supabase
      .from("books")
      .update({ status: "available", reserved_by: null, reserved_at: null })
      .eq("id", book.id);
    if (!error && previous) {
      await supabase.from("notifications").insert({
        user_id: previous,
        message: `La réservation pour « ${book.title} » a été annulée.`,
        type: "reservation_cancelled",
        link: `/book/${book.id}`,
      });
      sendEmail("send-reservation-email", {
        userId: previous, kind: "cancelled",
        bookTitle: book.title, bookId: book.id,
      });
    }
    if (!error) await supabase.from("book_requests").update({ status: "pending" }).eq("book_id", book.id);
    setBusy(false);
  };

  const markGiven = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("books")
      .update({ status: "given" })
      .eq("id", book.id);
    if (!error && book.reserved_by) {
      await supabase.from("notifications").insert({
        user_id: book.reserved_by,
        message: `« ${book.title} » a été marqué comme remis. Jazak Allahu khayran !`,
        type: "given",
        link: `/book/${book.id}`,
      });
    }
    setBusy(false);
  };

  const reopen = async () => {
    setBusy(true);
    await supabase
      .from("books")
      .update({ status: "available", reserved_by: null, reserved_at: null })
      .eq("id", book.id);
    setBusy(false);
  };

  return (
    <div className="bg-card lg:rounded-xl border px-4 lg:px-6 py-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold text-lg">Statut</h2>
        <StatusBadge status={status} />
      </div>

      {/* Non-owner viewer — request action moved to detail page CTAs */}
      {!isOwner && status !== "available" && (
        <p className="text-xs text-muted-foreground text-center">
          {status === "reserved"
            ? "Ce livre est déjà réservé par un autre utilisateur."
            : "Ce livre a déjà été remis à son nouveau propriétaire."}
        </p>
      )}


      {/* Owner controls */}
      {isOwner && (
        <div className="space-y-3">
          {status === "available" && (
            <div>
              <p className="text-sm font-semibold mb-2">
                Demandes ({requests.length})
              </p>
              {requests.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Personne n'a encore demandé ce livre.
                </p>
              ) : (
                <ul className="space-y-2">
                  {requests.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg border bg-muted/20"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                            {r.requester_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5">
                            <OnlineDot userId={r.requester_id} size={10} />
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{r.requester_name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: fr })}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => reserveFor(r)}
                        disabled={busy}
                        className="rounded-full h-8"
                      >
                        <UserCheck size={14} className="mr-1" /> Réserver
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {status === "reserved" && (
            <div className="space-y-2">
              <p className="text-sm">
                Réservé pour :{" "}
                <span className="font-semibold">
                  {requests.find((r) => r.requester_id === book.reserved_by)?.requester_name ?? "Utilisateur"}
                </span>
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={markGiven} disabled={busy} className="flex-1 rounded-full">
                  <Check size={14} className="mr-1" /> Marquer comme donné
                </Button>
                <Button onClick={cancelReservation} disabled={busy} variant="outline" className="flex-1 rounded-full">
                  <X size={14} className="mr-1" /> Annuler la réservation
                </Button>
              </div>
            </div>
          )}

          {status === "given" && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Ce livre a été marqué comme donné. Jazak Allahu khayran !
              </p>
              <Button onClick={reopen} disabled={busy} variant="outline" className="rounded-full">
                <RotateCcw size={14} className="mr-1" /> Remettre en disponible
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "reserved")
    return (
      <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 text-xs font-bold uppercase px-2.5 py-1 rounded-full">
        <span className="w-2 h-2 rounded-full bg-amber-500" /> Réservé
      </span>
    );
  if (status === "given")
    return (
      <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 text-xs font-bold uppercase px-2.5 py-1 rounded-full">
        <span className="w-2 h-2 rounded-full bg-red-500" /> Donné
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-xs font-bold uppercase px-2.5 py-1 rounded-full">
      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Disponible
    </span>
  );
}
