import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

const REASONS = [
  { value: "contenu_inapproprie", label: "Contenu inapproprié" },
  { value: "annonce_frauduleuse", label: "Annonce frauduleuse" },
  { value: "doublon", label: "Annonce en double" },
  { value: "produit_interdit", label: "Produit interdit" },
  { value: "autre", label: "Autre" },
];

export function ReportDialog({
  bookId,
  open,
  onOpenChange,
}: {
  bookId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [raison, setRaison] = useState("contenu_inapproprie");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Connexion requise pour signaler");
      navigate({ to: "/login" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("reports").insert({
      book_id: bookId,
      reporter_id: user.id,
      raison,
      description: description.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      if (error.code === "23505") {
        toast.error("Vous avez déjà signalé cette annonce");
      } else {
        toast.error("Impossible d'envoyer le signalement");
      }
      return;
    }
    toast.success("Signalement envoyé. Merci !");
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Signaler cette annonce</DialogTitle>
          <DialogDescription>
            Aidez-nous à garder MyKutub sûr. Votre signalement reste confidentiel.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Raison</Label>
            <RadioGroup value={raison} onValueChange={setRaison}>
              {REASONS.map((r) => (
                <div key={r.value} className="flex items-center gap-2">
                  <RadioGroupItem value={r.value} id={r.value} />
                  <Label htmlFor={r.value} className="font-normal cursor-pointer">
                    {r.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Détails (optionnel)</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Précisez le problème..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 size={14} className="animate-spin mr-1" />}
            Envoyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
