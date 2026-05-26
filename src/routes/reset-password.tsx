import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase auto-handles the recovery token in the URL hash and creates a session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = fd.get("password") as string;
    const confirm = fd.get("confirm") as string;
    if (password.length < 8) {
      toast.error("Mot de passe trop court (min 8 caractères).");
      return;
    }
    if (password !== confirm) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Mot de passe mis à jour !");
      await supabase.auth.signOut();
      navigate({ to: "/login" });
    }
  };

  return (
    <div className="bg-card min-h-screen p-6 flex flex-col items-center">
      <header className="w-full mb-12 flex flex-col items-center pt-8">
        <h1 className="font-headline text-2xl font-black text-center tracking-tighter uppercase">
          NOUVEAU MOT DE PASSE
        </h1>
      </header>

      {!ready ? (
        <div className="text-sm text-muted-foreground space-y-4 text-center max-w-sm">
          <p>Lien invalide ou expiré.</p>
          <Link to="/forgot-password" className="inline-block underline">Demander un nouveau lien</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="w-full space-y-6 max-w-sm">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest">Nouveau mot de passe *</Label>
            <Input id="password" name="password" type="password" required minLength={8}
              className="h-12 bg-card border-muted rounded-none focus-visible:ring-foreground" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm" className="text-xs font-bold uppercase tracking-widest">Confirmer *</Label>
            <Input id="confirm" name="confirm" type="password" required minLength={8}
              className="h-12 bg-card border-muted rounded-none focus-visible:ring-foreground" />
          </div>

          <Button type="submit" disabled={loading}
            className="w-full h-12 text-xs font-black rounded-none bg-foreground text-background uppercase tracking-widest hover:bg-foreground/90">
            {loading ? <Loader2 className="animate-spin" /> : "METTRE À JOUR"}
          </Button>
        </form>
      )}
    </div>
  );
}
