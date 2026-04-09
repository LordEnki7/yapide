import { useState } from "react";
import { Link } from "wouter";
import { useListBusinesses, getListBusinessesQueryKey } from "@workspace/api-client-react";
import { getStoredUser } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import LangToggle from "@/components/LangToggle";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Star, MapPin, Clock } from "lucide-react";

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

  const { data: businesses, isLoading } = useListBusinesses(
    { category: selectedCategory as any, search: search || undefined },
    { query: { queryKey: getListBusinessesQueryKey({ category: selectedCategory as any, search: search || undefined }) } }
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="bg-black border-b border-yellow-400/20 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest">{t.appName}</p>
            <h1 className="text-lg font-black text-yellow-400">
              {t.greeting(user?.name?.split(" ")[0] || (lang === "es" ? "bicho" : "friend"))}
            </h1>
          </div>
          <div className="flex items-center gap-2">
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
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400"
          />
        </div>
      </div>

      <div className="px-4 pb-8">
        <div className="flex gap-2 overflow-x-auto py-4 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`flex-shrink-0 flex flex-col items-center gap-1 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                selectedCategory === cat.key
                  ? "bg-yellow-400 text-black shadow-[0_0_20px_rgba(255,215,0,0.4)]"
                  : "bg-white/5 text-gray-300 border border-white/10 hover:border-yellow-400/40"
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
              <Skeleton key={i} className="h-48 bg-white/5 rounded-2xl" />
            ))}
          </div>
        ) : businesses?.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">😤</p>
            <p className="text-gray-400">{t.emptyBusinesses}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {businesses?.map((biz) => (
              <Link key={biz.id} href={`/customer/business/${biz.id}`}>
                <div
                  data-testid={`business-card-${biz.id}`}
                  className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-yellow-400/40 hover:shadow-[0_0_20px_rgba(255,215,0,0.1)] transition-all cursor-pointer group"
                >
                  {biz.imageUrl && (
                    <div className="relative h-40 overflow-hidden">
                      <img src={biz.imageUrl} alt={biz.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <Badge className="absolute top-3 left-3 bg-yellow-400 text-black font-bold text-xs">
                        {CATEGORY_LABELS[biz.category] ?? biz.category}
                      </Badge>
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-black text-lg text-white">{biz.name}</h3>
                    {biz.description && <p className="text-gray-400 text-sm mt-1 line-clamp-1">{biz.description}</p>}
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1 text-yellow-400">
                        <Star size={14} fill="currentColor" />
                        <span className="text-sm font-bold">{biz.rating?.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-400">
                        <MapPin size={12} />
                        <span className="text-xs line-clamp-1">{biz.address}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-400 ml-auto">
                        <Clock size={12} />
                        <span className="text-xs">{t.deliveryTime}</span>
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
