import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Search, ArrowLeft, Store, ShoppingBag, X } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";
import { formatDOP } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { useToast } from "@/hooks/use-toast";

interface ProductResult {
  id: number;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  category: string | null;
  businessId: number;
  businessName: string;
  businessLogoUrl: string | null;
}

interface BusinessResult {
  id: number;
  name: string;
  category: string | null;
  logoUrl: string | null;
  imageUrl: string | null;
  isOpen: boolean;
  rating: number | null;
  prepTimeMinutes: number | null;
}

interface SearchResults {
  businesses: BusinessResult[];
  products: ProductResult[];
}

export default function CustomerSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { addItem } = useCart();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) { setResults(null); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await apiFetch<SearchResults>(`/api/search?q=${encodeURIComponent(query)}`);
        setResults(data);
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleAddProduct = (p: ProductResult) => {
    addItem({ id: p.id, name: p.name, price: p.price, businessId: p.businessId }, 1, p.category ?? undefined);
    toast({ title: "✅ Agregado al carrito", description: p.name });
  };

  const hasResults = results && (results.businesses.length > 0 || results.products.length > 0);
  const isEmpty = results && !hasResults && query.length >= 2 && !loading;

  return (
    <div className="min-h-screen bg-background text-white">
      {/* Header */}
      <div className="bg-background border-b border-yellow-400/20 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/customer")} className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10 transition">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FFD700]/70" />
            <input
              ref={inputRef}
              className="w-full bg-white/10 border border-white/20 rounded-xl pl-9 pr-8 py-2.5 text-sm placeholder-white/40 focus:outline-none focus:border-[#FFD700]/60 transition"
              placeholder="Buscar negocios y productos..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-white/8 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div className="text-center py-16 text-white/50">
            <Search size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-bold">Sin resultados para "{query}"</p>
            <p className="text-sm mt-1">Intenta con otro nombre</p>
          </div>
        )}

        {/* Initial prompt */}
        {!query && (
          <div className="text-center py-16 text-white/40">
            <Search size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">Escribe para buscar negocios y productos</p>
          </div>
        )}

        {/* Businesses section */}
        {!loading && results && results.businesses.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-[#FFD700]/70 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Store size={13} /> Negocios
            </h2>
            <div className="space-y-2">
              {results.businesses.map(b => (
                <Link key={b.id} href={`/customer/store/${b.id}`}>
                  <div className="bg-white/8 border border-white/10 rounded-xl p-3 flex items-center gap-3 hover:bg-white/12 transition active:scale-[0.98]">
                    {b.logoUrl ? (
                      <img src={b.logoUrl} alt={b.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-[#0057B7]/30 flex items-center justify-center flex-shrink-0">
                        <Store size={20} className="text-[#0057B7]" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-white truncate">{b.name}</p>
                      <p className="text-xs text-white/50 capitalize">{b.category ?? ""}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.isOpen ? "bg-green-400/20 text-green-400" : "bg-gray-500/30 text-gray-400"}`}>
                        {b.isOpen ? "● Abierto" : "● Cerrado"}
                      </span>
                      {b.prepTimeMinutes && (
                        <span className="text-[10px] text-white/40">{b.prepTimeMinutes} min</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Products section */}
        {!loading && results && results.products.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-[#FFD700]/70 uppercase tracking-widest mb-3 flex items-center gap-2">
              <ShoppingBag size={13} /> Productos
            </h2>
            <div className="space-y-2">
              {results.products.map(p => (
                <div key={p.id} className="bg-white/8 border border-white/10 rounded-xl p-3 flex items-center gap-3">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                      <ShoppingBag size={20} className="text-white/30" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-white truncate">{p.name}</p>
                    <Link href={`/customer/store/${p.businessId}`}>
                      <p className="text-xs text-[#FFD700]/70 truncate hover:underline">{p.businessName}</p>
                    </Link>
                    {p.description && (
                      <p className="text-xs text-white/40 truncate mt-0.5">{p.description}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <p className="font-black text-sm text-[#FFD700]">{formatDOP(p.price)}</p>
                    <button
                      onClick={() => handleAddProduct(p)}
                      className="bg-[#FFD700] text-black text-xs font-black px-3 py-1.5 rounded-lg hover:bg-yellow-300 active:scale-95 transition"
                    >
                      + Agregar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
