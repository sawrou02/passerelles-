import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ScrollText } from "lucide-react";

type Row = {
  id: string;
  display_name: string | null;
  charte_accepted: boolean;
  charte_accepted_at: string | null;
  charte_version: string | null;
};

export function AdminCharteTab() {
  const [currentVersion, setCurrentVersion] = useState<string>("v1.0");
  const [newVersion, setNewVersion] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [{ data: s }, { data: ps }] = await Promise.all([
      supabase.from("charte_settings").select("current_version").eq("id", 1).maybeSingle(),
      supabase
        .from("profiles")
        .select("id, display_name, charte_accepted, charte_accepted_at, charte_version")
        .order("charte_accepted_at", { ascending: false, nullsFirst: false })
        .limit(500),
    ]);
    if (s?.current_version) setCurrentVersion(s.current_version);
    setRows((ps ?? []) as Row[]);
  };

  useEffect(() => { load(); }, []);

  const acceptedCount = rows.filter((r) => r.charte_accepted && r.charte_version === currentVersion).length;

  const updateVersion = async () => {
    const v = newVersion.trim();
    if (!v) return;
    if (!confirm(`Publier la version ${v} de la charte ? Tous les membres devront ré-accepter au prochain login.`)) return;
    setBusy(true);
    const { error } = await supabase.rpc("admin_set_charte_version", { _version: v });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Charte mise à jour en ${v}`);
    setNewVersion("");
    await load();
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ScrollText className="text-primary" size={18} />
          <h3 className="font-headline text-lg font-bold">Charte communautaire</h3>
        </div>
        <p className="text-sm">
          Version courante : <Badge className="bg-primary text-primary-foreground">{currentVersion}</Badge>
        </p>
        <p className="text-sm text-muted-foreground">
          {acceptedCount} / {rows.length} membres ont accepté la version courante.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Nouvelle version (ex: v1.1)"
            value={newVersion}
            onChange={(e) => setNewVersion(e.target.value)}
            className="max-w-xs"
          />
          <Button onClick={updateVersion} disabled={busy || !newVersion.trim()}>
            Publier nouvelle version
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Publier une nouvelle version oblige tous les membres à ré-accepter la charte à leur prochaine connexion.
        </p>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="max-h-[60vh] overflow-y-auto divide-y">
          {rows.map((r) => {
            const ok = r.charte_accepted && r.charte_version === currentVersion;
            return (
              <div key={r.id} className="p-3 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.display_name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.charte_accepted_at
                      ? new Date(r.charte_accepted_at).toLocaleDateString("fr-FR")
                      : "Jamais accepté"}
                    {r.charte_version ? ` • ${r.charte_version}` : ""}
                  </p>
                </div>
                {ok ? (
                  <Badge className="bg-primary/15 text-primary border border-primary/30">✅ À jour</Badge>
                ) : r.charte_accepted ? (
                  <Badge variant="outline" className="border-amber-500 text-amber-700">
                    Version obsolète
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-destructive text-destructive">
                    Non acceptée
                  </Badge>
                )}
              </div>
            );
          })}
          {rows.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">Aucun profil.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
