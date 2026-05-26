import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Presence = { is_online: boolean; last_seen: string | null };

/** Subscribes to presence changes for a single user. */
export function useUserPresence(userId?: string | null) {
  const [presence, setPresence] = useState<Presence>({ is_online: false, last_seen: null });

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    supabase
      .from("profiles")
      .select("is_online, last_seen")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setPresence({
          is_online: !!(data as any).is_online,
          last_seen: (data as any).last_seen ?? null,
        });
      });

    const channel = supabase
      .channel(`presence-${userId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        (payload) => {
          const n = payload.new as any;
          setPresence({ is_online: !!n.is_online, last_seen: n.last_seen ?? null });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Treat as offline if last_seen older than 90s
  const stale =
    presence.last_seen && Date.now() - new Date(presence.last_seen).getTime() > 90_000;
  return { is_online: presence.is_online && !stale, last_seen: presence.last_seen };
}
