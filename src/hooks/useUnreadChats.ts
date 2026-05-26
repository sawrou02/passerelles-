import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export function useUnreadChats() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) { setCount(0); return; }
    const load = () => {
      supabase.from("chats").select("unread_by").contains("participants", [user.id])
        .then(({ data }) => {
          const n = (data ?? []).filter((c: any) => c.unread_by?.includes(user.id)).length;
          setCount(n);
        });
    };
    load();
    const channel = supabase.channel(`unread-chats-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chats" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return count;
}
