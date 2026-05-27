import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  SlidersHorizontal,
  MapPin,
  X,
  Check,
  History,
  Trash2,
  LayoutGrid,
  List as ListIcon,
  Truck,
} from "lucide-react";
import { BookCard } from "@/components/BookCard";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { CATEGORIES, CONDITIONS, ALL_CITIES, LANGUAGES, type Book } from "@/lib/mykutub";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/catalog")({
  head: () => ({
    meta: [
      { title: "Catalogue — Livres islamiques d'occasion | MYKUTUB" },
      {
        name: "description",
        content:
          "Parcourez des centaines de livres de science islamique d'occasion : Tafsir, Hadith, Fiqh, Aqida, Sira. Prix accessibles, vendeurs vérifiés, livraison en Europe.",
      },
      { property: "og:title", content: "Catalogue — Livres islamiques d'occasion | MYKUTUB" },
      {
        property: "og:description",
        content: "Tafsir, Hadith, Fiqh, Aqida, Sira et plus. Vendeurs vérifiés, prix accessibles.",
      },
      { property: "og:url", content: "https://mykutub.lovable.app/catalog" },
    ],
    links: [{ rel: "canonical", href: "https://mykutub.lovable.app/catalog" }],
  }),
  component: Catalog,
});

const PAGE_SIZE = 20;
// Taille d'un batch fetch côté serveur. Au-delà de ce nombre de livres
// déjà chargés, le bouton "Charger plus" déclenche un appel Supabase
// supplémentaire au lieu de juste révéler des items déjà en mémoire.
const SERVER_BATCH = 100;

type PriceFilter = "all" | "free" | "paid";
type DistanceFilter = "all" | "city" | "deliver";
type ViewMode = "grid" | "list";

function statusBadge(status?: Book["status"]) {
  if (status === "reserved") return { label: "Réservé", cls: "bg-amber-500 text-white" };
  if (status === "given") return { label: "Donné", cls: "bg-red-600 text-white" };
  return { label: "Disponible", cls: "bg-emerald-500 text-white" };
}

function Catalog() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("Tout");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [distanceFilter, setDistanceFilter] = useState<DistanceFilter>("all");
  const [sortBy, setSortBy] = useState<"recent" | "price-asc" | "price-desc">("recent");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [history, setHistory] = useState<{ id: string; query: string }[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [hasMoreFromServer, setHasMoreFromServer] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let active = true;
    supabase
      .from("books")
      .select("*")
      .order("created_at", { ascending: false })
      .range(0, SERVER_BATCH - 1)
      .then(({ data }) => {
        if (!active) return;
        const rows = (data as Book[]) ?? [];
        setBooks(rows);
        setHasMoreFromServer(rows.length === SERVER_BATCH);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const loadMoreFromServer = useCallback(async () => {
    if (loadingMore || !hasMoreFromServer) return;
    setLoadingMore(true);
    const { data } = await supabase
      .from("books")
      .select("*")
      .order("created_at", { ascending: false })
      .range(books.length, books.length + SERVER_BATCH - 1);
    const rows = (data as Book[]) ?? [];
    setBooks((prev) => [...prev, ...rows]);
    setHasMoreFromServer(rows.length === SERVER_BATCH);
    setLoadingMore(false);
  }, [books.length, hasMoreFromServer, loadingMore]);

  const loadHistory = useCallback(() => {
    if (!user) {
      setHistory([]);
      return;
    }
    supabase
      .from("search_history")
      .select("id, query")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8)
      .then(({ data }) => setHistory((data as { id: string; query: string }[]) ?? []));
  }, [user]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!user || !searchQuery.trim() || searchQuery.trim().length < 2) return;
    const q = searchQuery.trim();
    const t = setTimeout(async () => {
      await supabase.from("search_history").insert({ user_id: user.id, query: q });
      loadHistory();
    }, 1200);
    return () => clearTimeout(t);
  }, [searchQuery, user, loadHistory]);

  const clearHistory = async () => {
    if (!user) return;
    await supabase.from("search_history").delete().eq("user_id", user.id);
    setHistory([]);
  };

  const filteredBooks = useMemo(() => {
    return books
      .filter((b) => {
        const okCat = selectedCategory === "Tout" || b.category === selectedCategory;
        const q = searchQuery.toLowerCase();
        const okSearch =
          b.title.toLowerCase().includes(q) || (b.description?.toLowerCase() || "").includes(q);
        const okCity = !selectedCity || b.city === selectedCity;
        const okCond = selectedConditions.length === 0 || selectedConditions.includes(b.condition);
        const okLang =
          selectedLanguages.length === 0 || selectedLanguages.includes(b.language ?? "Français");
        const okPrice =
          priceFilter === "all" || (priceFilter === "free" ? b.is_donation : !b.is_donation);
        const okDist =
          distanceFilter === "all" ||
          (distanceFilter === "city" ? !!selectedCity && b.city === selectedCity : !!b.can_deliver);
        return okCat && okSearch && okCity && okCond && okLang && okPrice && okDist;
      })
      .sort((a, b) => {
        if (sortBy === "price-asc") return a.price - b.price;
        if (sortBy === "price-desc") return b.price - a.price;
        return 0;
      });
  }, [
    books,
    selectedCategory,
    searchQuery,
    selectedCity,
    selectedConditions,
    selectedLanguages,
    priceFilter,
    distanceFilter,
    sortBy,
  ]);

  // Reset pagination on filter change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [
    selectedCategory,
    searchQuery,
    selectedCity,
    selectedConditions,
    selectedLanguages,
    priceFilter,
    distanceFilter,
    sortBy,
  ]);

  const visibleBooks = filteredBooks.slice(0, visibleCount);

  // Infinite scroll — déclenche fetch serveur si on a tout révélé localement
  useEffect(() => {
    const onScroll = () => {
      const scrollBottom = window.innerHeight + window.scrollY;
      if (scrollBottom < document.body.offsetHeight - 600) return;
      if (visibleCount < filteredBooks.length) {
        setVisibleCount((c) => Math.min(c + PAGE_SIZE, filteredBooks.length));
      } else if (hasMoreFromServer && !loadingMore) {
        void loadMoreFromServer();
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [filteredBooks.length, visibleCount, hasMoreFromServer, loadingMore, loadMoreFromServer]);

  const toggleCondition = (c: string) =>
    setSelectedConditions((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  const toggleLanguage = (l: string) =>
    setSelectedLanguages((p) => (p.includes(l) ? p.filter((x) => x !== l) : [...p, l]));

  const activeFiltersCount =
    selectedConditions.length +
    selectedLanguages.length +
    (priceFilter !== "all" ? 1 : 0) +
    (distanceFilter !== "all" ? 1 : 0) +
    (sortBy !== "recent" ? 1 : 0);

  const resetAll = () => {
    setSelectedConditions([]);
    setSelectedLanguages([]);
    setPriceFilter("all");
    setDistanceFilter("all");
    setSortBy("recent");
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-4 md:px-8 py-6 md:py-10">
      <div className="mb-6 md:mb-10">
        <h1 className="font-headline text-3xl md:text-5xl font-black">{t("catalog.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("catalog.subtitle")}</p>
      </div>

      <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-md py-4 -mx-4 px-4 md:-mx-8 md:px-8 space-y-4 border-b mb-6">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={18}
            />
            <Input
              placeholder={t("catalog.placeholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              className="pl-10 h-12 bg-muted/50 border-none rounded-xl"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                <X size={16} />
              </button>
            )}
            {searchFocused && !searchQuery && history.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-card border rounded-xl shadow-lg z-50 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <History size={12} /> {t("common.recentSearches")}
                  </div>
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      clearHistory();
                    }}
                    className="text-xs text-destructive hover:underline flex items-center gap-1"
                  >
                    <Trash2 size={12} /> {t("common.clearHistory")}
                  </button>
                </div>
                <ul className="max-h-64 overflow-y-auto">
                  {history.map((h) => (
                    <li key={h.id}>
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSearchQuery(h.query);
                          setSearchFocused(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                      >
                        <Search size={14} className="text-muted-foreground" />
                        {h.query}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "rounded-xl h-12 gap-2 px-4",
                  selectedCity && "bg-primary/5 border-primary text-primary",
                )}
              >
                <MapPin size={16} />
                <span className="text-xs font-bold">{selectedCity || t("common.allFrance")}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0" align="end">
              <Command>
                <CommandInput placeholder={t("catalog.cityPlaceholder")} />
                <CommandList>
                  <CommandEmpty>{t("catalog.cityEmpty")}</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => setSelectedCity(null)}
                      className="cursor-pointer font-bold"
                    >
                      <Check
                        className={cn("mr-2 h-4 w-4", !selectedCity ? "opacity-100" : "opacity-0")}
                      />
                      {t("common.allFrance")}
                    </CommandItem>
                    {ALL_CITIES.map((city) => (
                      <CommandItem
                        key={city}
                        onSelect={() => setSelectedCity(city)}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedCity === city ? "opacity-100" : "opacity-0",
                          )}
                        />
                        {city}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className={cn(
                  "h-12 w-12 rounded-xl relative",
                  activeFiltersCount > 0 && "bg-primary text-primary-foreground",
                )}
              >
                <SlidersHorizontal size={20} />
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[320px] flex flex-col">
              <SheetHeader className="text-left border-b pb-4">
                <SheetTitle className="text-2xl font-black text-primary">
                  {t("common.filters")}
                </SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto py-6 space-y-8">
                <div className="space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground">
                    Prix
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: "all", label: "Tout" },
                        { id: "free", label: "Gratuit" },
                        { id: "paid", label: "Payant" },
                      ] as const
                    ).map((o) => (
                      <Button
                        key={o.id}
                        variant={priceFilter === o.id ? "default" : "outline"}
                        onClick={() => setPriceFilter(o.id)}
                        className="h-10 rounded-xl font-bold text-xs"
                      >
                        {o.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground">
                    Distance
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {(
                      [
                        { id: "all", label: "Toutes les villes" },
                        {
                          id: "city",
                          label: selectedCity
                            ? `Uniquement ${selectedCity}`
                            : "Ma ville (sélectionner)",
                        },
                        { id: "deliver", label: "Avec livraison possible" },
                      ] as const
                    ).map((o) => (
                      <Button
                        key={o.id}
                        variant={distanceFilter === o.id ? "default" : "outline"}
                        onClick={() => setDistanceFilter(o.id)}
                        disabled={o.id === "city" && !selectedCity}
                        className="h-10 justify-start rounded-xl font-semibold text-xs"
                      >
                        {o.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground">
                    Langue
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map((l) => (
                      <Badge
                        key={l}
                        variant={selectedLanguages.includes(l) ? "default" : "outline"}
                        onClick={() => toggleLanguage(l)}
                        className="cursor-pointer px-4 py-2 text-xs font-bold"
                      >
                        {l}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground">
                    {t("catalog.condition")}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {CONDITIONS.map((c) => (
                      <Badge
                        key={c}
                        variant={selectedConditions.includes(c) ? "default" : "outline"}
                        onClick={() => toggleCondition(c)}
                        className="cursor-pointer px-4 py-2 text-xs font-bold"
                      >
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground">
                    {t("catalog.sortBy")}
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { id: "recent", label: t("catalog.sortRecent") },
                      { id: "price-asc", label: t("catalog.sortPriceAsc") },
                      { id: "price-desc", label: t("catalog.sortPriceDesc") },
                    ].map((o) => (
                      <Button
                        key={o.id}
                        variant={sortBy === o.id ? "default" : "outline"}
                        onClick={() => setSortBy(o.id as typeof sortBy)}
                        className="justify-start font-bold h-12 rounded-xl"
                      >
                        {o.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <SheetFooter className="border-t pt-6 flex flex-col gap-3 mt-auto">
                <Button onClick={resetAll} variant="ghost" className="w-full font-bold">
                  {t("common.reset")}
                </Button>
                <SheetClose asChild>
                  <Button className="w-full h-14 rounded-2xl font-bold bg-primary text-lg">
                    {t("common.apply")}
                  </Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>

        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex space-x-2">
            {CATEGORIES.map((cat) => (
              <Badge
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                variant={selectedCategory === cat ? "default" : "secondary"}
                className={cn(
                  "px-4 py-2 cursor-pointer text-xs font-bold border",
                  selectedCategory === cat
                    ? "bg-primary border-primary"
                    : "bg-card border-border text-muted-foreground",
                )}
              >
                {cat}
              </Badge>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>
      </div>

      {/* Results bar with view toggle */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {loading ? (
            "Chargement…"
          ) : (
            <>
              <span className="font-bold text-foreground">{filteredBooks.length}</span>{" "}
              {filteredBooks.length > 1 ? "livres trouvés" : "livre trouvé"}
            </>
          )}
        </p>
        <div className="inline-flex rounded-xl border bg-muted/40 p-1">
          <button
            onClick={() => setViewMode("grid")}
            aria-label="Vue grille"
            className={cn(
              "p-2 rounded-lg transition",
              viewMode === "grid"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            aria-label="Vue liste"
            className={cn(
              "p-2 rounded-lg transition",
              viewMode === "list"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <ListIcon size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 pb-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">{t("common.noResults")}</div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 pb-8">
          {visibleBooks.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      ) : (
        <ul className="flex flex-col gap-3 pb-8">
          {visibleBooks.map((book) => (
            <BookListRow key={book.id} book={book} />
          ))}
        </ul>
      )}

      {!loading && (visibleCount < filteredBooks.length || hasMoreFromServer) && (
        <div className="flex justify-center pb-8">
          <Button
            variant="outline"
            disabled={loadingMore}
            onClick={() => {
              if (visibleCount < filteredBooks.length) {
                setVisibleCount((c) => Math.min(c + PAGE_SIZE, filteredBooks.length));
              } else {
                void loadMoreFromServer();
              }
            }}
            className="rounded-xl font-bold"
          >
            {loadingMore
              ? "Chargement…"
              : visibleCount < filteredBooks.length
                ? `Charger plus (${filteredBooks.length - visibleCount} restants)`
                : "Charger plus de livres"}
          </Button>
        </div>
      )}
    </div>
  );
}

function BookListRow({ book }: { book: Book }) {
  const sb = statusBadge(book.status);
  return (
    <li>
      <Link
        to="/book/$id"
        params={{ id: book.id }}
        className="flex gap-4 p-3 rounded-xl border bg-card hover:border-primary/50 hover:shadow-sm transition group"
      >
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
          <img
            src={book.image_url}
            alt={book.title}
            loading="lazy"
            className="w-full h-full object-cover"
          />
          <span
            className={cn(
              "absolute bottom-1 left-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded",
              sb.cls,
            )}
          >
            {sb.label}
          </span>
        </div>
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm sm:text-base leading-tight line-clamp-2 group-hover:text-primary">
              {book.title}
            </h3>
            <p className="font-black text-base sm:text-lg text-primary whitespace-nowrap">
              {book.is_donation ? "Don" : `${book.price} €`}
            </p>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {book.description || "—"}
          </p>
          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground pt-2">
            <span className="flex items-center gap-1">
              <MapPin size={11} />
              {book.city}
            </span>
            <span>· {book.seller_name}</span>
            {book.can_deliver && (
              <span className="flex items-center gap-1 text-emerald-600">
                <Truck size={11} />
                Livraison
              </span>
            )}
            {book.language && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                {book.language}
              </Badge>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}
