import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Marks the current user online while the tab is active and updates last_seen
 * periodically. On tab close / signout / hidden visibility, marks offline.
 */
export function usePresence() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const setOnline = async () => {
      if (cancelled) return;
      await supabase
        .from("profiles")
        .update({ is_online: true, last_seen: new Date().toISOString() })
        .eq("id", user.id);
    };

    const setOffline = () => {
      // best-effort; not awaited so it fires during unload
      supabase
        .from("profiles")
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq("id", user.id)
        .then(() => {});
    };

    setOnline();
    const interval = window.setInterval(setOnline, 30_000);

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") setOffline();
      else setOnline();
    };
    const handleUnload = () => setOffline();

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
      setOffline();
    };
  }, [user]);
}
