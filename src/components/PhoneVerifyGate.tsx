import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Phone, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export function PhoneVerifyGate() {
  const { user } = useAuth();
  const [needs, setNeeds] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) { setNeeds(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("phone, phone_verified")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const verified = (data as any)?.phone_verified === true;
      setNeeds(!verified);
      const pendingPhone = (user.user_metadata as any)?.phone || (data as any)?.phone || "";
      if (pendingPhone) setPhone(pendingPhone);
    })();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (cooldown <= 0) {
      if (intervalRef.current) { window.clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }
    intervalRef.current = window.setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current); };
  }, [cooldown]);

  if (!user || !needs) return null;

  const sendCode = async () => {
    if (!/^[+0-9 ().-]{6,20}$/.test(phone.trim())) {
      toast.error("Numéro de téléphone invalide.");
      return;
    }
    setSending(true);
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    try {
      const { data, error } = await supabase.functions.invoke("send-phone-verification", { body: { phone: phone.trim() } });
      if (error || (data as any)?.error) {
        toast.error((data as any)?.error || error?.message || "Erreur d'envoi du code.");
      } else {
        toast.success("Code envoyé par email.");
        setStep("code");
        setCooldown(60);
      }
    } catch (e) {
      toast.error("Erreur réseau. Réessayez.");
    } finally {
      setSending(false);
      void token;
    }
  };

  const verifyCode = async () => {
    if (!/^\d{6}$/.test(code)) {
      toast.error("Le code doit contenir 6 chiffres.");
      return;
    }
    setVerifying(true);
    const { data, error } = await supabase.rpc("verify_phone_code" as any, { _code: code });
    setVerifying(false);
    if (error) {
      toast.error(error.message || "Erreur de vérification.");
      return;
    }
    if (data === true) {
      toast.success("Numéro vérifié ✅");
      setNeeds(false);
    } else {
      toast.error("Code incorrect. Réessayez.");
    }
  };

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        className="max-w-md p-0 gap-0 [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 pt-6">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            {step === "phone" ? <Phone className="text-primary" size={22} /> : <ShieldCheck className="text-primary" size={22} />}
          </div>
          <DialogTitle className="text-center font-headline text-xl">
            {step === "phone" ? "Vérifiez votre numéro" : "Entrez le code reçu"}
          </DialogTitle>
          <DialogDescription className="text-center text-sm">
            {step === "phone"
              ? "Pour activer votre compte, confirmez votre numéro de téléphone. Un code à 6 chiffres vous sera envoyé."
              : "Nous avons envoyé un code à 6 chiffres par email. Saisissez-le ci-dessous."}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          {step === "phone" ? (
            <div className="space-y-1.5">
              <Label htmlFor="vp-phone">Numéro de téléphone</Label>
              <Input
                id="vp-phone"
                type="tel"
                inputMode="tel"
                placeholder="+33 6 12 34 56 78"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="vp-code">Code de vérification</Label>
                <Input
                  id="vp-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="h-12 rounded-xl text-center text-2xl tracking-[0.5em] font-bold"
                />
              </div>
              <div className="text-center">
                <button
                  type="button"
                  disabled={cooldown > 0 || sending}
                  onClick={sendCode}
                  className="text-xs text-primary font-semibold hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed"
                >
                  {cooldown > 0 ? `Renvoyer le code (${cooldown}s)` : "Renvoyer le code"}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="px-6 pb-6">
          {step === "phone" ? (
            <Button onClick={sendCode} disabled={sending} className="w-full h-12 rounded-xl font-bold">
              {sending ? <Loader2 className="animate-spin" /> : "Envoyer le code"}
            </Button>
          ) : (
            <div className="space-y-2">
              <Button onClick={verifyCode} disabled={verifying || code.length !== 6} className="w-full h-12 rounded-xl font-bold">
                {verifying ? <Loader2 className="animate-spin" /> : "Vérifier mon numéro"}
              </Button>
              <button
                type="button"
                onClick={() => setStep("phone")}
                className="w-full text-xs text-muted-foreground hover:text-foreground"
              >
                Modifier le numéro
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
