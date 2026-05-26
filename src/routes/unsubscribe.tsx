import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/unsubscribe")({
  head: () => ({ meta: [{ title: "Désabonnement — MyKutub" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

function Page() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "need_login" | "error">("idle");
  const [error, setError] = useState("");

  const unsubscribe = async () => {
    setStatus("loading");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setStatus("need_login"); return; }
    const { error } = await supabase
      .from("profiles")
      .update({ unsubscribed_all: true, notify_reservations: false, notify_messages: false, notify_followers: false, notify_admin: false })
      .eq("id", auth.user.id);
    if (error) { setError(error.message); setStatus("error"); }
    else setStatus("done");
  };

  useEffect(() => { unsubscribe(); }, []);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-card border rounded-3xl p-8 text-center space-y-4">
        <h1 className="font-headline text-2xl font-bold text-primary">Désabonnement</h1>
        {status === "loading" && <p className="text-muted-foreground">Traitement en cours…</p>}
        {status === "done" && <p>Vous ne recevrez plus d'emails de MyKutub. Vous pouvez réactiver à tout moment dans vos paramètres.</p>}
        {status === "need_login" && (
          <>
            <p className="text-muted-foreground">Connectez-vous pour confirmer le désabonnement.</p>
            <Button asChild><Link to="/login">Se connecter</Link></Button>
          </>
        )}
        {status === "error" && <p className="text-destructive text-sm">{error}</p>}
        <div className="pt-4">
          <Button asChild variant="outline"><Link to="/">Retour à l'accueil</Link></Button>
        </div>
      </div>
    </div>
  );
}
