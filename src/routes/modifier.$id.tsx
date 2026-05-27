import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
import { Camera, ChevronLeft, Loader2, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CATEGORIES, CONDITIONS, ALL_CITIES, LANGUAGES } from "@/lib/mykutub";

export const Route = createFileRoute("/modifier/$id")({
  component: EditPage,
});

const LANG_OPTIONS = Array.from(new Set([...LANGUAGES, "Autre"]));

function EditPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [city, setCity] = useState("");
  const [language, setLanguage] = useState("Français");
  const [price, setPrice] = useState("");
  const [isDonation, setIsDonation] = useState(false);
  const [canDeliver, setCanDeliver] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    supabase
      .from("books")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          toast.error("Annonce introuvable");
          navigate({ to: "/profile" });
          return;
        }
        if (data.seller_id !== user.id) {
          setForbidden(true);
          setLoading(false);
          return;
        }
        setTitle(data.title ?? "");
        setDescription(data.description ?? "");
        setCategory(data.category ?? "");
        setCondition(data.condition ?? "");
        setCity(data.city ?? "");
        setLanguage(data.language ?? "Français");
        setPrice(String(data.price ?? ""));
        setIsDonation(!!data.is_donation);
        setCanDeliver(!!data.can_deliver);
        setImageUrl(data.image_url ?? "");
        setImagePreview(data.image_url ?? null);
        setLoading(false);
      });
  }, [id, user, authLoading, navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image trop volumineuse (max 5 Mo).");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    let finalImageUrl = imageUrl;
    if (imageFile) {
      const fd = new FormData();
      fd.append("file", imageFile);
      fd.append("kind", "book");
      fd.append("role", "cover");
      const { data: out, error: invErr } = await supabase.functions.invoke("validate-book-image", {
        body: fd,
      });
      const payload = out as { ok?: boolean; publicUrl?: string; error?: string } | null;
      if (invErr || payload?.error || !payload?.publicUrl) {
        setSaving(false);
        toast.error(payload?.error || invErr?.message || "Upload refusé");
        return;
      }
      finalImageUrl = payload.publicUrl;
    }

    const { error } = await supabase
      .from("books")
      .update({
        title,
        description,
        category,
        condition,
        city,
        language,
        price: isDonation ? 0 : Number(price),
        is_donation: isDonation,
        can_deliver: canDeliver,
        image_url: finalImageUrl,
      })
      .eq("id", id);

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Annonce mise à jour");
    navigate({ to: "/book/$id", params: { id } });
  }

  if (loading || authLoading) return <div className="p-10 text-center">Chargement…</div>;
  if (forbidden)
    return (
      <div className="p-10 text-center space-y-3">
        <h1 className="text-xl font-bold">Accès refusé</h1>
        <p className="text-muted-foreground">Vous n'êtes pas le propriétaire de cette annonce.</p>
        <Button onClick={() => navigate({ to: "/profile" })}>Retour au profil</Button>
      </div>
    );

  const categoriesNoTout = CATEGORIES.filter((c) => c !== "Tout");

  return (
    <div className="bg-background min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-card border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => history.back()} className="p-2">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-headline text-xl font-bold">Modifier l'annonce</h1>
      </header>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-4 space-y-6">
        <div>
          <Label className="text-xs font-bold uppercase tracking-widest mb-2 block">Photo</Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          {imagePreview ? (
            <div className="relative aspect-[3/4] w-full max-w-xs mx-auto rounded-2xl overflow-hidden bg-muted">
              <img
                src={imagePreview}
                alt="aperçu"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-2 right-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-xs font-bold"
              >
                Changer
              </button>
              {imageFile && (
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(imageUrl);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute top-2 right-2 p-2 bg-destructive text-destructive-foreground rounded-full"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-[3/4] w-full max-w-xs mx-auto border-2 border-dashed border-primary/30 rounded-2xl flex flex-col items-center justify-center gap-3 text-primary/60 hover:bg-primary/5"
            >
              <Camera size={40} />
              <span className="font-bold text-xs uppercase tracking-wider">Ajouter une photo</span>
            </button>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="title" className="text-xs font-bold uppercase tracking-widest">
            Titre *
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="h-11"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description" className="text-xs font-bold uppercase tracking-widest">
            Description
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
            <Label className="text-xs font-bold uppercase tracking-widest">Catégorie *</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Choisir" />
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
                <SelectValue placeholder="Choisir" />
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

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-widest">Ville *</Label>
            <Select value={city} onValueChange={setCity} required>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Choisir" />
              </SelectTrigger>
              <SelectContent>
                {ALL_CITIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-widest">Langue *</Label>
            <Select value={language} onValueChange={setLanguage} required>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Choisir" />
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

        <div className="flex items-center gap-3 p-4 bg-secondary/10 rounded-2xl">
          <Checkbox
            id="donation"
            checked={isDonation}
            onCheckedChange={(v) => setIsDonation(!!v)}
          />
          <Label htmlFor="donation" className="font-bold text-sm cursor-pointer">
            Je donne ce livre gratuitement
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
              Livraison possible
            </Label>
          </div>
        </div>

        {!isDonation && (
          <div className="space-y-1.5">
            <Label htmlFor="price" className="text-xs font-bold uppercase tracking-widest">
              Prix (€) *
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

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: "/profile" })}
            className="flex-1 h-12 rounded-2xl font-bold"
          >
            Annuler
          </Button>
          <Button type="submit" disabled={saving} className="flex-1 h-12 rounded-2xl font-bold">
            {saving ? <Loader2 className="animate-spin" /> : "Enregistrer"}
          </Button>
        </div>
      </form>
    </div>
  );
}
