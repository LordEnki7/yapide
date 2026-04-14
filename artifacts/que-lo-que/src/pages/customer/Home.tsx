import { useState } from "react";
import { Link } from "wouter";
import { useListBusinesses, getListBusinessesQueryKey, useGetMyPoints, getGetMyPointsQueryKey } from "@workspace/api-client-react";
import { getStoredUser } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import LangToggle from "@/components/LangToggle";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Star, Clock } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

export default function CustomerHome() {
  const user = getStoredUser();
  const { t, lang } = useLang();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");

  const CATEGORIES = [
    { key: "all", label: t.allCategory, icon: "🏠" },
    { key: "food", label: t.foodCategory, icon: "🍔" },
    { key: "supermarket", label: t.supermarketCategory, icon: "🛒" },
    { key: "liquor", label: t.liquorCategory, icon: "🍾" },
    { key: "pharmacy", label: t.pharmacyCategory, icon: "💊" },
  ];

  const CATEGORY_LABELS: Record<string, string> = {
    food: t.foodCategory,
    supermarket: t.supermarketCategory,
    pharmacy: t.pharmacyCategory,
    liquor: t.liquorCategory,
  };

  const { data: pointsData } = useGetMyPoints({
    query: { queryKey: getGetMyPointsQueryKey() }
  });

  const { data: businesses, isLoading } = useListBusinesses(
    { category: selectedCategory as any, search: search || undefined },
    { query: { queryKey: getListBusinessesQueryKey({ category: selectedCategory as any, search: search || undefined }) } }
  );

  return (
    <div className="min-h-screen bg-background text-white">
      <div className="bg-background border-b border-yellow-400/20 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Que Lo Que" className="h-10 w-auto object-contain" />
            <h1 className="text-base font-black text-yellow-400 leading-tight">
              {t.greeting(user?.name?.split(" ")[0] || (lang === "es" ? "bicho" : "friend"))}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <LangToggle />
            <Link href="/customer/orders">
              <div className="w-10 h-10 rounded-full bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center cursor-pointer hover:bg-yellow-400/20 transition">
                <Clock size={18} className="text-yellow-400" />
              </div>
            </Link>
          </div>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400"
          />
        </div>
      </div>

      <div className="px-4 pb-8">
        {(pointsData?.points ?? 0) >= 0 && (
          <Link href="/customer/points">
            <div className="mt-1 mb-1 flex items-center gap-3 bg-yellow-400/10 border border-yellow-400/30 rounded-2xl px-4 py-3 hover:bg-yellow-400/20 transition cursor-pointer">
              <div className="w-9 h-9 rounded-full bg-yellow-400/20 flex items-center justify-center flex-shrink-0">
                <Star size={18} className="text-yellow-400" fill="currentColor" />
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
              <p className="text-xs text-gray-400 flex-shrink-0">
                {pointsData ? `${pointsData.progress}/${pointsData.nextRewardAt}` : "0/500"}
              </p>
            </div>
          </Link>
        )}

        <div className="flex gap-2 overflow-x-auto py-4 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`flex-shrink-0 flex flex-col items-center gap-1 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                selectedCategory === cat.key
                  ? "bg-yellow-400 text-black shadow-[0_0_20px_rgba(255,215,0,0.4)]"
                  : "bg-white/8 text-gray-300 border border-white/10 hover:border-yellow-400/40"
              }`}
            >
              <span className="text-xl">{cat.icon}</span>
              <span className="text-xs">{cat.label}</span>
            </button>
          ))}
        </div>

        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">
          {selectedCategory === "all" ? t.allBusinesses : CATEGORIES.find(c => c.key === selectedCategory)?.label}
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 bg-white/8 rounded-2xl" />
            ))}
          </div>
        ) : businesses?.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">😤</p>
            <p className="text-gray-400">{t.emptyBusinesses}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {businesses?.map((biz) => (
              <Link key={biz.id} href={`/customer/business/${biz.id}`}>
                <div
                  data-testid={`business-card-${biz.id}`}
                  className="bg-white/8 border border-white/10 rounded-2xl overflow-hidden hover:border-yellow-400/40 hover:shadow-[0_0_20px_rgba(255,215,0,0.1)] transition-all cursor-pointer group h-full"
                >
                  <div className="relative h-28 overflow-hidden bg-yellow-400/5">
                    {biz.imageUrl ? (
                      <img src={biz.imageUrl} alt={biz.name} className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${biz.isOpen === false ? "grayscale opacity-60" : ""}`} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <Badge className="absolute top-2 left-2 bg-yellow-400 text-black font-bold text-[10px] px-1.5 py-0.5">
                      {CATEGORY_LABELS[biz.category] ?? biz.category}
                    </Badge>
                    {biz.isOpen === false && (
                      <div className="absolute top-2 right-2 bg-black/80 text-gray-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-white/20">
                        CERRADO
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-black text-sm text-white line-clamp-1">{biz.name}</h3>
                    {biz.description && <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{biz.description}</p>}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1 text-yellow-400">
                        <Star size={11} fill="currentColor" />
                        <span className="text-xs font-bold">{biz.rating?.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <Clock size={10} />
                        <span className="text-[10px]">{t.deliveryTime}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
