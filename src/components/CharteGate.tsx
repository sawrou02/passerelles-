import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CharteModal } from "@/components/CharteModal";
import { toast } from "sonner";

export function CharteGate() {
  const { user } = useAuth();
  const [needsAccept, setNeedsAccept] = useState(false);

  useEffect(() => {
    if (!user) {
      setNeedsAccept(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const [{ data: settings }, { data: profile }] = await Promise.all([
        supabase.from("charte_settings").select("current_version").eq("id", 1).maybeSingle(),
        supabase
          .from("profiles")
          .select("charte_accepted, charte_version")
          .eq("id", user.id)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      const current = settings?.current_version ?? "v1.0";
      const accepted = profile?.charte_accepted === true && profile?.charte_version === current;
      setNeedsAccept(!accepted);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const handleAccept = async () => {
    const { error } = await supabase.rpc("accept_charte");
    if (error) {
      toast.error("Erreur lors de l'acceptation. Réessayez.");
      return;
    }
    toast.success("Merci d'avoir accepté la charte 🤲");
    setNeedsAccept(false);
  };

  if (!user || !needsAccept) return null;
  return (
    <CharteModal
      open
      mandatory
      onOpenChange={() => {}}
      onAccept={handleAccept}
    />
  );
}
