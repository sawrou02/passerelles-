import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, ChevronLeft, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { verified?: "1" } => {
    const v = s.verified === "1" || s.verified === 1;
    return v ? { verified: "1" } : {};
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/login" });
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (search.verified === "1") {
      toast.success("Email vérifié ! Vous pouvez maintenant vous connecter.");
    }
  }, [search.verified]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("email not confirmed") || msg.includes("not confirmed") || msg.includes("confirm")) {
        toast.error("Veuillez vérifier votre adresse email avant de vous connecter.");
      } else if (msg.includes("invalid")) {
        toast.error("Email ou mot de passe incorrect.");
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success("Bienvenue !");
      navigate({ to: "/" });
    }
  };

  return (
    <div className="bg-background min-h-screen px-4 py-8 flex flex-col items-center">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => history.back()} className="p-2 -ml-2 text-muted-foreground hover:text-foreground">
            <ChevronLeft size={22} />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <BookOpen className="text-primary" size={22} />
            <span className="font-headline text-xl font-bold text-primary tracking-tight">MYKUTUB</span>
          </Link>
          <span className="w-8" />
        </div>

        <div className="bg-card border rounded-3xl p-8 shadow-sm">
          <div className="text-center mb-8">
            <h1 className="font-headline text-3xl font-bold text-primary">Bon retour</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Connectez-vous pour retrouver vos livres et favoris.
            </p>
          </div>

          {search.verified === "1" && (
            <div className="mb-6 p-3 bg-primary/5 border border-primary/20 flex items-center gap-2 rounded-xl">
              <CheckCircle2 className="text-primary shrink-0" size={18} />
              <p className="text-xs font-medium">Compte activé. Connectez-vous !</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Adresse email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="h-12 rounded-xl pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Masquer" : "Afficher"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="text-right">
              <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? <Loader2 className="animate-spin" /> : "Se connecter"}
            </Button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          <GoogleAuthButton />

          <p className="text-center text-sm text-muted-foreground mt-6">
            Pas encore de compte ?{" "}
            <Link to="/signup" className="text-primary font-bold hover:underline">
              Inscrivez-vous
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
