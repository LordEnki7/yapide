import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useListBusinesses, getListBusinessesQueryKey, useGetMyPoints, getGetMyPointsQueryKey } from "@workspace/api-client-react";
import { getStoredUser } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import LangToggle from "@/components/LangToggle";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Star, Clock, ChevronLeft, MapPin, ChevronDown, Heart, Truck, Zap } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

interface Banner {
  id: number; title: string; subtitle: string | null; imageUrl: string | null;
  bgColor: string; ctaText: string | null; ctaLink: string | null;
}

interface PointsEvent {
  id: number; name: string; multiplier: number;
}

const CITIES = [
  { value: "Santo Domingo", label: "Santo Domingo" },
  { value: "Santiago", label: "Santiago" },
  { value: "La Romana", label: "La Romana" },
  { value: "San Pedro de Macorís", label: "San Pedro" },
  { value: "San Francisco de Macorís", label: "San Francisco" },
  { value: "Puerto Plata", label: "Puerto Plata" },
  { value: "Sosúa", label: "Sosúa" },
  { value: "Cabarete", label: "Cabarete" },
];

const CATEGORIES = [
  {
    key: "food",
    label: "Restaurantes",
    labelEn: "Restaurants",
    photo: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=700&q=80",
  },
  {
    key: "supermarket",
    label: "Supermercado",
    labelEn: "Supermarket",
    photo: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=700&q=80",
  },
  {
    key: "pharmacy",
    label: "Farmacia",
    labelEn: "Pharmacy",
    photo: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=700&q=80",
  },
  {
    key: "liquor",
    label: "Licorería",
    labelEn: "Liquor Store",
    photo: "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=700&q=80",
  },
  {
    key: "laundry",
    label: "Lavandería",
    labelEn: "Laundry",
    photo: "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=700&q=80",
  },
];

const CITY_STORAGE_KEY = "qlq_selected_city";

export default function CustomerHome() {
  const user = getStoredUser();
  const { t, lang } = useLang();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState<string>(() => localStorage.getItem(CITY_STORAGE_KEY) ?? "Santiago");
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [favLoading, setFavLoading] = useState<Set<number>>(new Set());
  const [banners, setBanners] = useState<Banner[]>([]);
  const [activeBannerIdx, setActiveBannerIdx] = useState(0);
  const [freeDelivery, setFreeDelivery] = useState(false);
  const [pointsEvents, setPointsEvents] = useState<PointsEvent[]>([]);

  useEffect(() => {
    fetch("/api/banners/active").then(r => r.ok ? r.json() : []).then(setBanners).catch(() => {});
    fetch("/api/delivery-windows/active").then(r => r.ok ? r.json() : {}).then(d => setFreeDelivery(d?.active ?? false)).catch(() => {});
    fetch("/api/points-events/active").then(r => r.ok ? r.json() : []).then(setPointsEvents).catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/favorites", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then((favs: { id: number }[]) => setFavoriteIds(new Set(favs.map(f => f.id))))
      .catch(() => {});
  }, []);

  const toggleFavorite = async (e: React.MouseEvent, bizId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (favLoading.has(bizId)) return;
    setFavLoading(prev => new Set(prev).add(bizId));
    const isFav = favoriteIds.has(bizId);
    try {
      const res = await fetch(`/api/favorites/${bizId}`, {
        method: isFav ? "DELETE" : "POST",
        credentials: "include",
      });
      if (res.ok) {
        setFavoriteIds(prev => {
          const next = new Set(prev);
          isFav ? next.delete(bizId) : next.add(bizId);
          return next;
        });
      }
    } finally {
      setFavLoading(prev => { const next = new Set(prev); next.delete(bizId); return next; });
    }
  };

  const changeCity = (newCity: string) => {
    setCity(newCity);
    localStorage.setItem(CITY_STORAGE_KEY, newCity);
    setCityPickerOpen(false);
  };

  const { data: pointsData } = useGetMyPoints({
    query: { queryKey: getGetMyPointsQueryKey() }
  });

  const { data: businesses, isLoading } = useListBusinesses(
    { category: (selectedCategory ?? "all") as any, search: search || undefined },
    {
      query: {
        enabled: !!selectedCategory || !!search,
        queryKey: getListBusinessesQueryKey({ category: (selectedCategory ?? "all") as any, search: search || undefined }),
        select: (data: any[]) => {
          const filtered = data.filter((b: any) => !b.city || b.city === city || city === "all");
          // Featured first, then open, then closed
          return [...filtered].sort((a, b) => {
            const aFeat = a.isFeatured ? 2 : 0;
            const bFeat = b.isFeatured ? 2 : 0;
            const aOpen = a.isOpen !== false ? 1 : 0;
            const bOpen = b.isOpen !== false ? 1 : 0;
            return (bFeat + bOpen) - (aFeat + aOpen);
          });
        },
      }
    }
  );

  const currentCat = CATEGORIES.find(c => c.key === selectedCategory);
  const currentCityLabel = CITIES.find(c => c.value === city)?.label ?? city;

  return (
    <div className="min-h-screen bg-background text-white">
      {/* Header */}
      <div className="bg-background border-b border-yellow-400/20 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {selectedCategory && (
              <button
                onClick={() => { setSelectedCategory(null); setSearch(""); }}
                className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/12 transition"
              >
                <ChevronLeft size={16} />
              </button>
            )}
            <img src="/logo.png" alt="YaPide" className="h-9 w-auto object-contain" />
            {!selectedCategory && (
              <p className="text-sm font-black text-yellow-400 leading-tight">
                {t.greeting(user?.name?.split(" ")[0] || (lang === "es" ? "bicho" : "friend"))}
              </p>
            )}
            {selectedCategory && (
              <p className="text-base font-black text-white">
                {lang === "es" ? currentCat?.label : currentCat?.labelEn}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <LangToggle />
            <Link href="/customer/search">
              <div className="w-9 h-9 rounded-full bg-white/8 border border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/12 transition">
                <Search size={16} className="text-white/70" />
              </div>
            </Link>
            <Link href="/customer/orders">
              <div className="w-9 h-9 rounded-full bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center cursor-pointer hover:bg-yellow-400/20 transition">
                <Clock size={16} className="text-yellow-400" />
              </div>
            </Link>
          </div>
        </div>

        {/* City selector + Search row */}
        <div className="flex gap-2">
          <button
            onClick={() => setCityPickerOpen(true)}
            className="flex items-center gap-1.5 bg-white/8 border border-white/10 rounded-xl px-3 h-10 text-xs font-black text-yellow-400 whitespace-nowrap hover:bg-white/12 transition flex-shrink-0"
          >
            <MapPin size={12} />
            {currentCityLabel}
            <ChevronDown size={12} className="text-[#FFD700]/60" />
          </button>
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FFD700]/70" />
            <Input
              placeholder={selectedCategory ? t.search : t.searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (e.target.value && !selectedCategory) setSelectedCategory("all");
              }}
              className="pl-9 bg-white/8 border-white/10 text-white placeholder:text-white/50 focus:border-yellow-400 h-10 text-sm"
            />
          </div>
        </div>
      </div>

      {/* City picker bottom sheet */}
      {cityPickerOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-30 backdrop-blur-sm" onClick={() => setCityPickerOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-yellow-400/30 rounded-t-3xl p-5 pb-8">
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
            <p className="text-xs font-black text-[#FFD700]/80 uppercase tracking-widest mb-4 text-center">
              {lang === "es" ? "¿Dónde estás?" : "Where are you?"}
            </p>
            <div className="space-y-2">
              {CITIES.map(c => (
                <button
                  key={c.value}
                  onClick={() => changeCity(c.value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-black text-sm transition-all ${
                    city === c.value
                      ? "bg-yellow-400 text-black shadow-[0_0_16px_rgba(255,215,0,0.3)]"
                      : "bg-white/5 text-white hover:bg-white/10 border border-white/10"
                  }`}
                >
                  <MapPin size={16} />
                  {c.value}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="pb-8">
        {/* Points bar */}
        {!selectedCategory && !search && (pointsData?.points ?? 0) >= 0 && (
          <div className="px-4 pt-3">
            <Link href="/customer/points">
              <div className="flex items-center gap-3 bg-yellow-400/10 border border-yellow-400/30 rounded-2xl px-4 py-3 hover:bg-yellow-400/20 transition cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-yellow-400/20 flex items-center justify-center flex-shrink-0">
                  <Star size={16} className="text-yellow-400" fill="currentColor" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-yellow-400">{pointsData?.points ?? 0} {t.pointsTitle}</p>
                  <div className="h-1.5 bg-white/10 rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full transition-all"
                      style={{ width: `${Math.min(((pointsData?.progress ?? 0) / (pointsData?.nextRewardAt ?? 500)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs text-white/60 flex-shrink-0">
                  {pointsData ? `${pointsData.progress}/${pointsData.nextRewardAt}` : "0/500"}
                </p>
              </div>
            </Link>
          </div>
        )}

        {/* ─── PROMO INDICATORS — free delivery + points multiplier ─── */}
        {!selectedCategory && !search && (freeDelivery || pointsEvents.length > 0) && (
          <div className="px-4 pt-2 flex flex-col gap-2">
            {freeDelivery && (
              <div className="flex items-center gap-3 bg-green-500/15 border border-green-500/30 rounded-2xl px-4 py-2.5 animate-pulse-slow">
                <Truck size={18} className="text-green-400 flex-shrink-0" />
                <p className="text-sm font-bold text-green-300">
                  {lang === "es" ? "🎉 ¡Delivery gratis ahora mismo!" : "🎉 Free delivery right now!"}
                </p>
              </div>
            )}
            {pointsEvents.map(ev => (
              <div key={ev.id} className="flex items-center gap-3 bg-yellow-400/15 border border-yellow-400/30 rounded-2xl px-4 py-2.5">
                <Zap size={18} className="text-yellow-400 flex-shrink-0" />
                <p className="text-sm font-bold text-yellow-300">
                  ⭐ {ev.multiplier}x puntos — {ev.name}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ─── PROMO BANNERS ─── */}
        {!selectedCategory && !search && banners.length > 0 && (
          <div className="px-4 pt-3">
            <div className="relative overflow-hidden rounded-2xl cursor-pointer" style={{ backgroundColor: banners[activeBannerIdx]?.bgColor ?? "#0057B7" }}>
              {banners[activeBannerIdx]?.imageUrl && (
                <img src={banners[activeBannerIdx].imageUrl!} alt="" className="absolute right-0 top-0 h-full w-1/3 object-cover opacity-30 pointer-events-none" />
              )}
              <div className="relative z-10 px-5 py-5">
                <p className="font-black text-white text-xl drop-shadow leading-tight">{banners[activeBannerIdx]?.title}</p>
                {banners[activeBannerIdx]?.subtitle && <p className="text-white/80 text-sm mt-1">{banners[activeBannerIdx].subtitle}</p>}
                {banners[activeBannerIdx]?.ctaText && banners[activeBannerIdx]?.ctaLink && (
                  <a href={banners[activeBannerIdx].ctaLink!} className="mt-3 inline-block bg-yellow-400 text-black font-black text-sm px-4 py-2 rounded-xl hover:bg-yellow-300 transition">
                    {banners[activeBannerIdx].ctaText}
                  </a>
                )}
              </div>
              {/* Dots */}
              {banners.length > 1 && (
                <div className="absolute bottom-2 right-3 flex gap-1">
                  {banners.map((_, i) => (
                    <button key={i} onClick={() => setActiveBannerIdx(i)}
                      className={`w-2 h-2 rounded-full transition ${i === activeBannerIdx ? "bg-yellow-400" : "bg-white/30"}`} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── CATEGORY TILES ─── */}
        {!selectedCategory && !search && (
          <div className="pt-3 space-y-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className="w-full relative h-48 overflow-hidden active:opacity-90 transition-opacity"
              >
                {/* Photo background */}
                <img
                  src={cat.photo}
                  alt={lang === "es" ? cat.label : cat.labelEn}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {/* Dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
                {/* Text bottom-left */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <p className="text-3xl font-black text-white drop-shadow-lg leading-tight">
                    {lang === "es" ? cat.label : cat.labelEn}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ─── BUSINESS LIST ─── */}
        {(selectedCategory || search) && (
          <div className="px-4 pt-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 bg-white/8 rounded-2xl" />
                ))}
              </div>
            ) : businesses?.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">😤</p>
                <p className="text-white/70">{t.emptyBusinesses}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {businesses?.map((biz) => {
                  const isClosed = biz.isOpen === false;
                  return (
                    <Link key={biz.id} href={`/customer/business/${biz.id}`}>
                      <div
                        data-testid={`business-card-${biz.id}`}
                        className={`relative flex gap-4 rounded-2xl p-3 transition-all cursor-pointer active:scale-[0.99] overflow-hidden border ${
                          isClosed
                            ? "bg-black/40 border-white/6 opacity-70"
                            : "bg-white/5 border-white/10 hover:border-yellow-400/30 hover:bg-white/8"
                        }`}
                      >
                        {/* Dark tint overlay for closed */}
                        {isClosed && (
                          <div className="absolute inset-0 bg-black/30 rounded-2xl pointer-events-none z-10" />
                        )}

                        {/* Logo */}
                        <div className="w-20 h-20 rounded-xl overflow-hidden bg-yellow-400/10 flex-shrink-0 flex items-center justify-center">
                          {biz.imageUrl ? (
                            <img
                              src={biz.imageUrl}
                              alt={biz.name}
                              className={`w-full h-full object-cover ${isClosed ? "grayscale" : ""}`}
                            />
                          ) : (
                            <span className={`text-3xl ${isClosed ? "grayscale opacity-50" : ""}`}>🍽️</span>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 py-0.5 relative z-20">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className={`font-black text-base leading-tight line-clamp-1 ${isClosed ? "text-white/50" : "text-white"}`}>{biz.name}</h3>
                                {biz.isFeatured && !isClosed && (
                                  <span className="flex-shrink-0 flex items-center gap-0.5 text-[10px] bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 px-1.5 py-0.5 rounded-full font-bold">
                                    <Star size={8} fill="currentColor" /> Destacado
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="flex items-center gap-1 bg-yellow-400/15 border border-yellow-400/30 px-2 py-0.5 rounded-lg">
                                <Star size={10} className="text-yellow-400" fill="currentColor" />
                                <span className="text-xs font-black text-yellow-400">{biz.rating?.toFixed(1)}</span>
                              </div>
                              <button
                                onClick={e => toggleFavorite(e, biz.id)}
                                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-400/10 transition"
                              >
                                <Heart
                                  size={16}
                                  className={favoriteIds.has(biz.id) ? "text-red-400 fill-red-400" : "text-white/30"}
                                />
                              </button>
                            </div>
                          </div>
                          {biz.description && (
                            <p className={`text-xs mt-1 line-clamp-1 ${isClosed ? "text-white/30" : "text-white/60"}`}>{biz.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            <div className={`flex items-center gap-1 ${isClosed ? "text-white/30" : "text-white/60"}`}>
                              <Clock size={11} />
                              <span className="text-xs">{biz.deliveryTime ?? 30}–{(biz.deliveryTime ?? 30) + 15} min</span>
                            </div>
                            {isClosed ? (
                              <span className="text-[10px] font-black text-white/50 bg-white/8 border border-white/10 px-2 py-0.5 rounded-full">🔒 CERRADO</span>
                            ) : (
                              <span className="text-[10px] font-black text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">ABIERTO</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
