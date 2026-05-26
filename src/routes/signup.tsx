import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, ChevronLeft, Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { Checkbox } from "@/components/ui/checkbox";
import { CharteModal } from "@/components/CharteModal";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

const schema = z.object({
  firstName: z.string().trim().min(1, "Prénom requis").max(50),
  lastName: z.string().trim().min(1, "Nom requis").max(50),
  email: z.string().trim().email("Email invalide").max(255),
  phone: z.string().trim().regex(/^[+0-9 ().-]{6,20}$/, "Numéro de téléphone invalide"),
  password: z.string().min(8, "Au moins 8 caractères").max(72),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirm"],
});

function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [charteAccepted, setCharteAccepted] = useState(false);
  const [charteOpen, setCharteOpen] = useState(false);

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      firstName: fd.get("firstName"),
      lastName: fd.get("lastName"),
      email: fd.get("email"),
      phone: fd.get("phone"),
      password: fd.get("password"),
      confirm: fd.get("confirm"),
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { errs[i.path[0] as string] = i.message; });
      setErrors(errs);
      return;
    }
    if (!charteAccepted) {
      toast.error("Vous devez accepter la Charte Communautaire pour vous inscrire.");
      return;
    }
    setLoading(true);
    const { firstName, lastName, email, phone, password } = parsed.data;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login?verified=1`,
        data: { display_name: `${firstName} ${lastName}`.trim(), phone },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      if (data.user?.id) {
        const { sendEmail } = await import("@/lib/email");
        sendEmail("send-welcome-email", { userId: data.user.id });
      }
      setSentTo(email);
    }
  };

  if (sentTo) {
    return (
      <div className="bg-background min-h-screen px-4 py-8 flex flex-col items-center">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center mb-8">
            <Link to="/" className="flex items-center gap-2">
              <BookOpen className="text-primary" size={22} />
              <span className="font-headline text-xl font-bold text-primary tracking-tight">MYKUTUB</span>
            </Link>
          </div>

          <div className="bg-card border rounded-3xl p-8 shadow-sm text-center space-y-5">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <MailCheck className="text-primary" size={32} />
            </div>
            <h1 className="font-headline text-2xl font-bold text-primary">Vérifiez votre email</h1>
            <p className="text-sm text-muted-foreground">
              Un email a été envoyé à <strong className="text-foreground">{sentTo}</strong>.
              Cliquez sur le lien de confirmation pour activer votre compte.
            </p>
            <p className="text-xs text-muted-foreground">
              Pensez à vérifier vos spams.
            </p>
            <Button asChild className="w-full h-12 rounded-xl text-base font-bold">
              <Link to="/login">Aller à la connexion</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
            <h1 className="font-headline text-3xl font-bold text-primary">Créer un compte</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Rejoignez la communauté MYKUTUB et partagez vos livres.
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-sm font-medium">Prénom</Label>
                <Input id="firstName" name="firstName" required className="h-11 rounded-xl" />
                {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-sm font-medium">Nom</Label>
                <Input id="lastName" name="lastName" required className="h-11 rounded-xl" />
                {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Adresse email</Label>
              <Input id="email" name="email" type="email" required placeholder="vous@exemple.com" className="h-11 rounded-xl" />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-sm font-medium">Numéro de téléphone</Label>
              <Input id="phone" name="phone" type="tel" inputMode="tel" required placeholder="+33 6 12 34 56 78" className="h-11 rounded-xl" />
              <p className="text-[11px] text-muted-foreground">Obligatoire — un code de vérification à 6 chiffres vous sera envoyé.</p>
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Mot de passe</Label>
              <Input id="password" name="password" type="password" required minLength={8} className="h-11 rounded-xl" />
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm" className="text-sm font-medium">Confirmer le mot de passe</Label>
              <Input id="confirm" name="confirm" type="password" required minLength={8} className="h-11 rounded-xl" />
              {errors.confirm && <p className="text-xs text-destructive">{errors.confirm}</p>}
            </div>

            <div className="flex items-start gap-2 pt-2">
              <Checkbox
                id="charte"
                checked={charteAccepted}
                onCheckedChange={(v) => setCharteAccepted(v === true)}
                className="mt-0.5"
              />
              <label htmlFor="charte" className="text-sm leading-snug cursor-pointer">
                J'ai lu et j'accepte la{" "}
                <button
                  type="button"
                  onClick={() => setCharteOpen(true)}
                  className="text-primary font-semibold hover:underline"
                >
                  Charte Communautaire de MyKutub →
                </button>
              </label>
            </div>

            <Button
              type="submit"
              disabled={loading || !charteAccepted}
              className="w-full h-12 rounded-xl text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="animate-spin" /> : "Créer mon compte"}
            </Button>

            <p className="text-[11px] text-muted-foreground text-center">
              Un email de vérification vous sera envoyé pour activer votre compte.
            </p>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          <GoogleAuthButton label="S'inscrire avec Google" />

          <p className="text-center text-sm text-muted-foreground mt-6">
            Déjà inscrit ?{" "}
            <Link to="/login" className="text-primary font-bold hover:underline">
              Connectez-vous
            </Link>
          </p>
        </div>
      </div>
      <CharteModal
        open={charteOpen}
        onOpenChange={setCharteOpen}
        onAccept={() => setCharteAccepted(true)}
      />
    </div>
  );
}
