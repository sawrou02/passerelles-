import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronsUpDown,
  Eye,
  Heart,
  Loader2,
  Plus,
  Truck,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  CATEGORIES,
  CONDITIONS,
  ALL_CITIES,
  BELGIUM_CITIES,
  COUNTRIES,
  CITY_POSTAL_CODES,
  LANGUAGES,
} from "@/lib/mykutub";
import { checkForbidden } from "@/lib/moderation";

const LANG_OPTIONS = Array.from(new Set([...LANGUAGES, "Autre"]));
const MIN_PHOTOS = 3;
const PHOTO_LABELS = ["Couverture", "Photo intérieure", "Photo intérieure"];
// Tolerance for portrait 3:4 ratio (allow ~5% deviation)
const TARGET_RATIO = 3 / 4;
const RATIO_TOLERANCE = 0.05;

export const Route = createFileRoute("/publish")({
  head: () => ({
    meta: [
      { title: "Publier une annonce — Vendre ou donner un livre islamique | MYKUTUB" },
      {
        name: "description",
        content:
          "Publiez votre annonce gratuitement en 2 minutes. Vendez ou donnez vos livres islamiques d'occasion à des milliers de membres de la communauté musulmane.",
      },
      { property: "og:title", content: "Publier une annonce | MYKUTUB" },
      { property: "og:description", content: "Publiez gratuitement en 2 minutes." },
      { property: "og:url", content: "https://mykutub.lovable.app/publish" },
    ],
    links: [{ rel: "canonical", href: "https://mykutub.lovable.app/publish" }],
  }),
  component: PublishPage,
});

type PhotoSlot = { file: File; preview: string };

function PreviewCard({
  imagePreview,
  title,
  price,
  city,
  isDonation,
  canDeliver,
  sellerName,
}: {
  imagePreview: string | null;
  title: string;
  price: string;
  city: string;
  isDonation: boolean;
  canDeliver: boolean;
  sellerName: string;
}) {
  const initial = (sellerName || "?").trim().charAt(0).toUpperCase();
  return (
    <div className="block">
      <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 bg-primary">
          {initial}
        </div>
        <span className="text-[11px] font-medium text-foreground truncate">
          {sellerName || "Vous"}
        </span>
      </div>

      <div className="relative aspect-[3/4] overflow-hidden bg-muted rounded-lg">
        {imagePreview ? (
          <img
            src={imagePreview}
            alt={title || "aperçu"}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <Camera size={32} />
          </div>
        )}
        <button
          type="button"
          disabled
          className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-white/90 text-foreground shadow-sm"
          aria-label="Favori"
        >
          <Heart size={12} />
        </button>
        {isDonation && (
          <span className="absolute top-1.5 left-1.5 bg-secondary text-secondary-foreground text-[8px] font-bold uppercase px-1.5 py-0.5 rounded">
            Don
          </span>
        )}
      </div>
      <div className="pt-1.5 space-y-0.5">
        <h3
          className={cn(
            "font-semibold text-[13px] leading-tight line-clamp-2",
            !title && "text-muted-foreground italic",
          )}
        >
          {title || "Titre du livre"}
        </h3>
        <p className="font-bold text-sm text-foreground">
          {isDonation ? "Don" : price ? `${price} €` : "— €"}
        </p>
        {canDeliver && (
          <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Truck size={10} /> Livraison possible
          </p>
        )}
        <p className="text-[10px] text-muted-foreground truncate">
          {city || "Ville"} · {new Date().toLocaleDateString("fr-FR")}
        </p>
      </div>
    </div>
  );
}

// Validate that an image file has a portrait 3:4 aspect ratio
function validatePortraitRatio(file: File): Promise<{ ok: boolean; ratio: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const ratio = img.width / img.height;
      URL.revokeObjectURL(url);
      resolve({ ok: Math.abs(ratio - TARGET_RATIO) <= RATIO_TOLERANCE, ratio });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ ok: false, ratio: 0 });
    };
    img.src = url;
  });
}

function PublishPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDonation, setIsDonation] = useState(false);
  const [canDeliver, setCanDeliver] = useState(false);
  const [loading, setLoading] = useState(false);

  const [photos, setPhotos] = useState<PhotoSlot[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [country, setCountry] = useState<string>("France");
  const [city, setCity] = useState("");
  const [cityOpen, setCityOpen] = useState(false);
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState("");
  const [price, setPrice] = useState("");

  const cityOptions = useMemo(
    () => (country === "Belgique" ? BELGIUM_CITIES : ALL_CITIES),
    [country],
  );

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (e.target) e.target.value = "";
    if (!files.length) return;

    const accepted: PhotoSlot[] = [];
    for (const file of files) {
      if (photos.length + accepted.length >= 6) {
        toast.error("Maximum 6 photos");
        break;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`"${file.name}" dépasse 5 Mo`);
        continue;
      }
      const { ok, ratio } = await validatePortraitRatio(file);
      if (!ok) {
        toast.error(
          `Format invalide pour "${file.name}" — utilisez une photo portrait au ratio 3:4 (actuel ${ratio ? ratio.toFixed(2) : "?"}).`,
        );
        continue;
      }
      accepted.push({ file, preview: URL.createObjectURL(file) });
    }
    if (accepted.length) setPhotos((prev) => [...prev, ...accepted]);
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      const copy = [...prev];
      const [removed] = copy.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.preview);
      return copy;
    });
  }

  function handleCitySelect(value: string) {
    setCity(value);
    setCityOpen(false);
    const pc = CITY_POSTAL_CODES[value];
    if (pc) setPostalCode(pc);
  }

  // Checklist derived from required fields
  const checklist = {
    photos: photos.length >= MIN_PHOTOS,
    condition: !!condition,
    city: !!city,
    postal: /^[0-9]{4,5}$/.test(postalCode.trim()),
    priceOrDonation: isDonation || (price !== "" && Number(price) >= 0),
    phone: /^[+0-9\s().-]{8,}$/.test(phone.trim()),
  };
  const checklistOk = Object.values(checklist).every(Boolean);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) {
      toast.error(t("common.loginRequired"));
      navigate({ to: "/login" });
      return;
    }
    if (photos.length < MIN_PHOTOS) {
      toast.error(`Minimum ${MIN_PHOTOS} photos requises : 1 Couverture + 2 Photos intérieures.`);
      return;
    }
    if (!checklistOk) {
      toast.error("Merci de compléter tous les champs requis de la checklist.");
      return;
    }
    const forbidden = checkForbidden(title, description);
    if (forbidden) {
      toast.error(`Annonce bloquée : contenu non conforme ("${forbidden}")`);
      return;
    }
    setLoading(true);

    // Upload all photos; first becomes the cover persisted to books.image_url
    let coverUrl = "";
    try {
      for (let i = 0; i < photos.length; i++) {
        const ph = photos[i];
        const role = i === 0 ? "cover" : `interior-${i}`;
        const fd = new FormData();
        fd.append("file", ph.file);
        fd.append("kind", "book");
        fd.append("role", role);
        const { data: out, error: invErr } = await supabase.functions.invoke(
          "validate-book-image",
          { body: fd },
        );
        const payload = out as { ok?: boolean; publicUrl?: string; error?: string } | null;
        if (invErr || payload?.error || !payload?.publicUrl) {
          throw new Error(payload?.error || invErr?.message || "Upload refusé");
        }
        if (i === 0) coverUrl = payload.publicUrl;
      }
    } catch (err: unknown) {
      setLoading(false);
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'envoi des photos");
      return;
    }

    const data = {
      title: title.trim() || "Sans titre",
      category,
      condition,
      city: `${city}${postalCode ? ` (${postalCode})` : ""}${country === "Belgique" ? ", Belgique" : ""}`,
      language: language || "Français",
      description,
      price: isDonation ? 0 : Number(price),
      is_donation: isDonation,
      can_deliver: canDeliver,
      seller_id: user.id,
      seller_name: user.user_metadata?.display_name || user.email?.split("@")[0] || "Utilisateur",
      image_url: coverUrl,
    };
    const { error } = await supabase.from("books").insert(data);
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      // Best-effort: persist phone on profile for future contacts
      if (phone.trim()) {
        await supabase.from("profiles").update({ phone: phone.trim() }).eq("id", user.id);
      }
      toast.success(t("publish.success"));
      navigate({ to: "/" });
    }
  }

  const categoriesNoTout = CATEGORIES.filter((c) => c !== "Tout");
  const sellerName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Vous";
  const coverPreview = photos[0]?.preview ?? null;
  const previewProps = {
    imagePreview: coverPreview,
    title,
    price,
    city,
    isDonation,
    canDeliver,
    sellerName,
  };

  return (
    <div className="bg-background min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-card border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => history.back()} className="p-2">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-headline text-xl font-bold">{t("publish.title")}</h1>
      </header>

      <div className="max-w-6xl mx-auto lg:grid lg:grid-cols-[1fr_320px] lg:gap-8 lg:px-6">
        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          {/* ---------------- Photos (min 3, 3:4 portrait) ---------------- */}
          <div>
            <Label className="text-xs font-bold uppercase tracking-widest mb-2 block">
              Photos *{" "}
              <span className="text-muted-foreground normal-case font-medium">
                — minimum {MIN_PHOTOS}, format portrait 3:4
              </span>
            </Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFilesSelected}
              className="hidden"
            />
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((slot) => {
                const photo = photos[slot];
                const label = PHOTO_LABELS[slot];
                const missing = !photo;
                return (
                  <div key={slot} className="space-y-1.5">
                    <div
                      className={cn(
                        "relative aspect-[3/4] rounded-2xl overflow-hidden border-2",
                        photo ? "border-primary/30" : "border-dashed border-primary/30 bg-muted/30",
                        missing && "ring-1 ring-destructive/30",
                      )}
                    >
                      {photo ? (
                        <>
                          <img
                            src={photo.preview}
                            alt={label}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(slot)}
                            className="absolute top-1.5 right-1.5 p-1.5 bg-destructive text-destructive-foreground rounded-full"
                            aria-label="Retirer"
                          >
                            <X size={12} />
                          </button>
                          {slot === 0 && (
                            <span className="absolute bottom-1.5 left-1.5 bg-primary text-primary-foreground text-[9px] font-bold uppercase px-1.5 py-0.5 rounded">
                              Couverture
                            </span>
                          )}
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-primary/60 hover:bg-primary/5"
                        >
                          <Plus size={20} />
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-center px-1">
                            {label}
                          </span>
                        </button>
                      )}
                    </div>
                    <p
                      className={cn(
                        "text-[10px] text-center font-medium",
                        missing ? "text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {slot === 0 ? "Couverture" : "Intérieur"}
                    </p>
                  </div>
                );
              })}
            </div>
            {photos.length > 3 && (
              <div className="mt-3 grid grid-cols-6 gap-2">
                {photos.slice(3).map((ph, i) => (
                  <div
                    key={i + 3}
                    className="relative aspect-[3/4] rounded-lg overflow-hidden border"
                  >
                    <img
                      src={ph.preview}
                      alt={`extra-${i}`}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(i + 3)}
                      className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {photos.length < MIN_PHOTOS && (
              <p className="text-xs text-destructive mt-2 font-medium">
                ⚠ Ajoutez au moins {MIN_PHOTOS} photos (1 Couverture + 2 Photos intérieures).
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="mt-3"
            >
              <Plus size={14} className="mr-1" /> Ajouter une photo
            </Button>
          </div>

          {/* ---------------- Titre (optionnel) ---------------- */}
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs font-bold uppercase tracking-widest">
              {t("publish.bookTitle")}{" "}
              <span className="text-muted-foreground font-normal normal-case">(optionnel)</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11"
              placeholder="Ex : Riyad As-Salihin"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-bold uppercase tracking-widest">
              {t("publish.description")}
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest">
                {t("publish.category")} *
              </Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={t("publish.choose")} />
                </SelectTrigger>
                <SelectContent>
                  {categoriesNoTout.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest">État *</Label>
              <Select value={condition} onValueChange={setCondition} required>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={t("publish.choose")} />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ---------------- Pays / Ville (autocomplete) / Code postal ---------------- */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest">Pays *</Label>
              <Select
                value={country}
                onValueChange={(v) => {
                  setCountry(v);
                  setCity("");
                  setPostalCode("");
                }}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest">
                {t("publish.language")} *
              </Label>
              <Select value={language} onValueChange={setLanguage} required>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={t("publish.choose")} />
                </SelectTrigger>
                <SelectContent>
                  {LANG_OPTIONS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_140px] gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest">Ville *</Label>
              <Popover open={cityOpen} onOpenChange={setCityOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={cityOpen}
                    className="h-11 w-full justify-between font-normal"
                  >
                    <span className={cn(!city && "text-muted-foreground")}>
                      {city || "Rechercher une ville…"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="p-0 w-[--radix-popover-trigger-width] max-w-[420px]"
                  align="start"
                >
                  <Command>
                    <CommandInput placeholder="Tapez le nom de la ville…" />
                    <CommandList>
                      <CommandEmpty>Aucune ville trouvée.</CommandEmpty>
                      <CommandGroup>
                        {cityOptions.slice(0, 200).map((c) => (
                          <CommandItem key={c} value={c} onSelect={() => handleCitySelect(c)}>
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                city === c ? "opacity-100" : "opacity-0",
                              )}
                            />
                            {c}
                            {CITY_POSTAL_CODES[c] && (
                              <span className="ml-auto text-xs text-muted-foreground">
                                {CITY_POSTAL_CODES[c]}
                              </span>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="postal" className="text-xs font-bold uppercase tracking-widest">
                Code postal *
              </Label>
              <Input
                id="postal"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
                maxLength={5}
                placeholder={country === "Belgique" ? "1000" : "75001"}
                className="h-11"
              />
            </div>
          </div>

          {/* ---------------- Téléphone ---------------- */}
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-widest">
              Téléphone *
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={country === "Belgique" ? "+32 4 ..." : "06 12 34 56 78"}
              className="h-11"
            />
            <p className="text-[11px] text-muted-foreground">
              Visible uniquement par les acheteurs intéressés.
            </p>
          </div>

          <div className="flex items-center gap-3 p-4 bg-secondary/10 rounded-2xl">
            <Checkbox
              id="donation"
              checked={isDonation}
              onCheckedChange={(v) => setIsDonation(!!v)}
            />
            <Label htmlFor="donation" className="font-bold text-sm cursor-pointer">
              {t("publish.donation")}
            </Label>
          </div>

          <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-2xl">
            <Checkbox
              id="delivery"
              checked={canDeliver}
              onCheckedChange={(v) => setCanDeliver(!!v)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <Label htmlFor="delivery" className="font-bold text-sm cursor-pointer">
                {t("publish.canDeliver")}
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">{t("publish.canDeliverHint")}</p>
            </div>
          </div>

          {!isDonation && (
            <div className="space-y-1.5">
              <Label htmlFor="price" className="text-xs font-bold uppercase tracking-widest">
                {t("publish.price")} *
              </Label>
              <Input
                id="price"
                type="number"
                min={0}
                step={0.5}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className="h-11"
              />
            </div>
          )}

          {/* Mobile preview trigger */}
          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 rounded-2xl gap-2 font-bold"
                >
                  <Eye size={16} /> {t("publish.seePreview")}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-3xl">
                <SheetHeader className="text-left mb-4">
                  <SheetTitle>{t("publish.previewTitle")}</SheetTitle>
                </SheetHeader>
                <div className="max-w-[220px] mx-auto pb-6">
                  <PreviewCard {...previewProps} />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* ---------------- Checklist dynamique ---------------- */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              Checklist de validation
            </p>
            <ChecklistItem
              ok={checklist.photos}
              label={`Au moins ${MIN_PHOTOS} photos (couverture + 2 intérieures)`}
            />
            <ChecklistItem ok={checklist.condition} label="État du livre sélectionné" />
            <ChecklistItem ok={checklist.city} label="Ville renseignée" />
            <ChecklistItem ok={checklist.postal} label="Code postal valide" />
            <ChecklistItem ok={checklist.priceOrDonation} label="Prix renseigné ou don activé" />
            <ChecklistItem ok={checklist.phone} label="Numéro de téléphone valide" />
          </div>

          <Button
            type="submit"
            disabled={loading || !checklistOk}
            className="w-full h-14 rounded-2xl text-base font-bold"
          >
            {loading ? <Loader2 className="animate-spin" /> : t("publish.submit")}
          </Button>
        </form>

        {/* Desktop preview panel */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 pt-4">
            <div className="bg-card border rounded-3xl p-5">
              <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <Eye size={14} /> {t("publish.livePreview")}
              </div>
              <div className="max-w-[240px] mx-auto">
                <PreviewCard {...previewProps} />
              </div>
              <p className="text-[11px] text-muted-foreground text-center mt-4">
                {t("publish.previewHint")}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ChecklistItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <span
        className={cn(
          "mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold",
          ok ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground border",
        )}
      >
        {ok ? "✓" : "•"}
      </span>
      <span className={cn(ok ? "text-foreground" : "text-muted-foreground")}>{label}</span>
    </div>
  );
}
