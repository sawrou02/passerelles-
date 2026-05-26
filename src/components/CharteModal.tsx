import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept?: () => void;
  /** If true, shows only a "Fermer" button (no acceptance action). */
  readOnly?: boolean;
  /** If true, modal cannot be dismissed without accepting (used for re-acceptance after version bump). */
  mandatory?: boolean;
};

export function CharteModal({ open, onOpenChange, onAccept, readOnly, mandatory }: Props) {
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (mandatory && !v) return; // block close
        onOpenChange(v);
      }}
    >
      <DialogContent
        className="max-w-2xl max-h-[90vh] flex flex-col rounded-2xl"
        onInteractOutside={(e) => mandatory && e.preventDefault()}
        onEscapeKeyDown={(e) => mandatory && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl text-primary">
            Charte de la Communauté MyKutub
          </DialogTitle>
          <DialogDescription>
            Nous visons une communauté fraternelle autour du partage du savoir islamique.
            Chaque membre s'engage à respecter les règles suivantes.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 -mr-2 max-h-[55vh]">
          <ol className="space-y-4 text-sm leading-relaxed">
            <li>
              <strong>1. Honnêteté</strong> — Décrire les livres avec exactitude
              (état, édition, défauts).
            </li>
            <li>
              <strong>2. Respect</strong> — Utiliser un langage courtois et fraternel
              (pas d'insultes, pas de fitna).
            </li>
            <li>
              <strong>3. Bienveillance</strong> — Faciliter les dons et aider les
              frères et sœurs.
            </li>
            <li>
              <strong>4. Conformité</strong> — Ne proposer que des livres islamiques
              authentiques et respectueux.
            </li>
            <li>
              <strong>5. Responsabilité</strong> — Honorer ses engagements (envoyer
              le livre, payer le prix convenu).
            </li>
            <li>
              <strong>6. Respect des livres</strong> — Traiter les ouvrages religieux
              avec soin et dignité.
            </li>
            <li>
              <strong>7. Confidentialité</strong> — Ne pas divulguer les informations
              personnelles des membres.
            </li>
            <li>
              <strong>8. Interdictions strictes</strong>
              <ul className="list-disc ml-5 mt-1 space-y-1">
                <li>Pas de livres sectaires ou déviants</li>
                <li>Pas de publicité déguisée</li>
                <li>Pas de contenu politique ou fitna</li>
              </ul>
            </li>
            <li>
              <strong>9. Transactions équitables</strong>
              <ul className="list-disc ml-5 mt-1 space-y-1">
                <li>Prix raisonnables et justes</li>
                <li>Répondre aux demandes sous 48h</li>
                <li>Prévenir en cas d'annulation</li>
              </ul>
            </li>
            <li>
              <strong>10. Droits d'auteur</strong> — Interdiction de vendre des copies
              illégales ou photocopiées.
            </li>
            <li>
              <strong>11. Comptes</strong> — Un seul compte par personne, identité
              réelle obligatoire.
            </li>
            <li>
              <strong>12. Signalement</strong> — Tout comportement suspect doit être
              signalé à l'admin.
            </li>
            <li>
              <strong>13. Respect des décisions</strong> — Les décisions de modération
              sont définitives.
            </li>
          </ol>
          <p className="mt-5 text-sm text-muted-foreground italic">
            Toute violation peut entraîner la suppression du compte.
          </p>
          <p className="mt-3 text-center font-headline text-primary">
            JazakAllahu Khayran 🤲
          </p>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-2">
          {!mandatory && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
          )}
          {!readOnly && (
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => {
                onAccept?.();
                onOpenChange(false);
              }}
            >
              J'accepte ✅
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
