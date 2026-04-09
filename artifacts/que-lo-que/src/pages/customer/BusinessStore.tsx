import { useState } from "react";
import { useParams, Link } from "wouter";
import { useGetBusiness, getGetBusinessQueryKey, useListProducts, getListProductsQueryKey } from "@workspace/api-client-react";
import { useCart } from "@/lib/cart";
import { formatDOP } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import LangToggle from "@/components/LangToggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Star, ShoppingCart, Plus, Minus } from "lucide-react";

export default function BusinessStore() {
  const { id } = useParams<{ id: string }>();
  const businessId = parseInt(id, 10);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const { addItem, items, totalAmount } = useCart();
  const { t } = useLang();

  const { data: business, isLoading: bizLoading } = useGetBusiness(
    businessId,
    { query: { enabled: !!businessId, queryKey: getGetBusinessQueryKey(businessId) } }
  );

  const { data: products, isLoading: prodsLoading } = useListProducts(
    businessId,
    { query: { enabled: !!businessId, queryKey: getListProductsQueryKey(businessId) } }
  );

  const cartCount = items.reduce((s, i) => s + i.quantity, 0);

  const handleAdd = (product: any) => {
    const qty = quantities[product.id] || 1;
    addItem(product, qty);
    setQuantities((prev) => ({ ...prev, [product.id]: 1 }));
  };

  const groupedProducts = products?.reduce((acc: Record<string, any[]>, p) => {
    const cat = p.category || "Productos";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {}) ?? {};

  if (bizLoading) return (
    <div className="min-h-screen bg-black p-4">
      <Skeleton className="h-48 bg-white/5 rounded-2xl mb-4" />
      <Skeleton className="h-8 bg-white/5 rounded mb-2" />
      <Skeleton className="h-6 bg-white/5 rounded w-1/2" />
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      <div className="relative h-52">
        {business?.imageUrl ? (
          <img src={business.imageUrl} alt={business.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-yellow-400/10" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
        <Link href="/customer">
          <button className="absolute top-4 left-4 w-10 h-10 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition">
            <ArrowLeft size={18} className="text-white" />
          </button>
        </Link>
        <div className="absolute top-4 right-4">
          <LangToggle />
        </div>
      </div>

      <div className="px-4 -mt-6 relative">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black text-white">{business?.name}</h1>
              <p className="text-gray-400 text-sm mt-1">{business?.description}</p>
            </div>
            <div className="flex items-center gap-1 text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-lg">
              <Star size={14} fill="currentColor" />
              <span className="font-bold text-sm">{business?.rating?.toFixed(1)}</span>
            </div>
          </div>
          <p className="text-gray-500 text-xs mt-2">📍 {business?.address}</p>
        </div>

        {prodsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 bg-white/5 rounded-xl" />)}
          </div>
        ) : Object.keys(groupedProducts).length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">🤷</p>
            <p className="text-gray-400">{t.noProducts}</p>
          </div>
        ) : (
          Object.entries(groupedProducts).map(([category, prods]) => (
            <div key={category} className="mb-6">
              <h2 className="text-yellow-400 font-bold text-sm uppercase tracking-widest mb-3 border-b border-yellow-400/20 pb-2">{category}</h2>
              <div className="space-y-3">
                {prods.filter(p => p.isAvailable).map((product) => (
                  <div key={product.id} data-testid={`product-${product.id}`} className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-3 hover:border-yellow-400/30 transition">
                    {product.imageUrl && (
                      <img src={product.imageUrl} alt={product.name} className="w-20 h-20 object-cover rounded-lg flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white">{product.name}</h3>
                      {product.description && <p className="text-gray-400 text-xs mt-1 line-clamp-2">{product.description}</p>}
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-yellow-400 font-black text-lg">{formatDOP(product.price)}</span>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setQuantities(prev => ({ ...prev, [product.id]: Math.max(1, (prev[product.id] || 1) - 1) }))}
                              className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="text-sm font-bold w-5 text-center">{quantities[product.id] || 1}</span>
                            <button
                              onClick={() => setQuantities(prev => ({ ...prev, [product.id]: (prev[product.id] || 1) + 1 }))}
                              className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleAdd(product)}
                            className="bg-yellow-400 text-black font-bold hover:bg-yellow-300 text-xs h-8"
                          >
                            {t.addToCart}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-black border-t border-yellow-400/20 z-20">
          <Link href="/customer/cart">
            <Button className="w-full bg-yellow-400 text-black font-black text-lg h-14 hover:bg-yellow-300 shadow-[0_0_30px_rgba(255,215,0,0.3)]">
              <ShoppingCart size={20} className="mr-2" />
              {t.viewCart} · {cartCount} {cartCount === 1 ? "item" : "items"} · {formatDOP(totalAmount)}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
