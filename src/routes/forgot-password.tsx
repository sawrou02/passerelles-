import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = (fd.get("email") as string).trim();
    if (!email) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error("Erreur lors de l'envoi.");
    } else {
      setSent(email);
    }
  };

  if (sent) {
    return (
      <div className="bg-card min-h-screen p-6 flex flex-col items-center justify-center">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <MailCheck className="text-primary" size={32} />
          </div>
          <h1 className="font-headline text-2xl font-black uppercase tracking-tighter">
            Email envoyé
          </h1>
          <p className="text-sm text-muted-foreground">
            Si un compte existe pour <strong className="text-foreground">{sent}</strong>, vous
            recevrez un lien pour réinitialiser votre mot de passe.
          </p>
          <Link
            to="/login"
            className="inline-block w-full h-12 leading-[3rem] text-xs font-black bg-foreground text-background uppercase tracking-widest"
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card min-h-screen p-6 flex flex-col items-center">
      <header className="w-full mb-12 flex flex-col items-center">
        <div className="w-full flex items-start">
          <button onClick={() => history.back()} className="p-2 -ml-2">
            <ChevronLeft size={24} />
          </button>
        </div>
        <h1 className="font-headline text-2xl font-black text-center mt-4 tracking-tighter uppercase">
          MOT DE PASSE OUBLIÉ
        </h1>
        <p className="text-xs text-muted-foreground text-center mt-2 max-w-xs">
          Entrez votre email, nous vous enverrons un lien pour réinitialiser votre mot de passe.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="w-full space-y-6 max-w-sm">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest">
            E-mail *
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            className="h-12 bg-card border-muted rounded-none focus-visible:ring-foreground"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 text-xs font-black rounded-none bg-foreground text-background uppercase tracking-widest hover:bg-foreground/90"
        >
          {loading ? <Loader2 className="animate-spin" /> : "ENVOYER LE LIEN"}
        </Button>

        <div className="text-center">
          <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground">
            Retour à la connexion
          </Link>
        </div>
      </form>
    </div>
  );
}
