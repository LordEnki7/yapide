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
import { ArrowLeft, Star, ShoppingCart, Plus, Minus, X, ShoppingBag } from "lucide-react";

const MARKUP = 0.15;

function customerPrice(base: number) {
  return parseFloat((base * (1 + MARKUP)).toFixed(2));
}

export default function BusinessStore() {
  const { id } = useParams<{ id: string }>();
  const businessId = parseInt(id, 10);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [sheetQty, setSheetQty] = useState(1);
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

  const openProduct = (product: any) => {
    setSelectedProduct(product);
    setSheetQty(1);
  };

  const closeSheet = () => setSelectedProduct(null);

  const handleAddFromSheet = () => {
    if (!selectedProduct) return;
    addItem(selectedProduct, sheetQty);
    closeSheet();
  };

  const handleAddQuick = (product: any) => {
    const qty = quantities[product.id] || 1;
    addItem(product, qty);
    setQuantities(prev => ({ ...prev, [product.id]: 1 }));
  };

  const groupedProducts = products?.reduce((acc: Record<string, any[]>, p) => {
    const cat = p.category || "Productos";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {}) ?? {};

  if (bizLoading) return (
    <div className="min-h-screen bg-background p-4">
      <Skeleton className="h-48 bg-white/8 rounded-2xl mb-4" />
      <Skeleton className="h-8 bg-white/8 rounded mb-2" />
      <Skeleton className="h-6 bg-white/8 rounded w-1/2" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-white pb-28">

      {/* Hero */}
      <div className="relative h-52">
        {business?.imageUrl ? (
          <img src={business.imageUrl} alt={business.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-yellow-400/10 flex items-center justify-center text-6xl">🍽️</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
        <Link href="/customer">
          <button className="absolute top-4 left-4 w-10 h-10 bg-background/60 rounded-full flex items-center justify-center hover:bg-background/80 transition">
            <ArrowLeft size={18} className="text-white" />
          </button>
        </Link>
        <div className="absolute top-4 right-4">
          <LangToggle />
        </div>
      </div>

      <div className="px-4 -mt-6 relative">
        {/* Business Info */}
        <div className="bg-white/8 border border-white/10 rounded-2xl p-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black text-white">{business?.name}</h1>
              <p className="text-gray-400 text-sm mt-1">{business?.description}</p>
            </div>
            <div className="flex items-center gap-1 text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-lg flex-shrink-0">
              <Star size={14} fill="currentColor" />
              <span className="font-bold text-sm">{business?.rating?.toFixed(1)}</span>
            </div>
          </div>
          <p className="text-gray-500 text-xs mt-2">📍 {business?.address}</p>
        </div>

        {/* Products */}
        {prodsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 bg-white/8 rounded-xl" />)}
          </div>
        ) : Object.keys(groupedProducts).length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">🤷</p>
            <p className="text-gray-400">{t.noProducts}</p>
          </div>
        ) : (
          Object.entries(groupedProducts).map(([category, prods]) => (
            <div key={category} className="mb-6">
              <h2 className="text-yellow-400 font-bold text-sm uppercase tracking-widest mb-3 border-b border-yellow-400/20 pb-2">
                {category}
              </h2>
              <div className="space-y-3">
                {prods.filter(p => p.isAvailable).map((product) => (
                  <div
                    key={product.id}
                    data-testid={`product-${product.id}`}
                    onClick={() => openProduct(product)}
                    className="bg-white/8 border border-white/10 rounded-xl overflow-hidden hover:border-yellow-400/40 transition cursor-pointer active:scale-[0.99]"
                  >
                    <div className="flex gap-3 p-3">
                      {product.imageUrl && (
                        <div className="relative flex-shrink-0">
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-24 h-24 object-cover rounded-xl"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                        <div>
                          <h3 className="font-black text-white text-base">{product.name}</h3>
                          {product.description && (
                            <p className="text-gray-400 text-xs mt-1 line-clamp-2 leading-relaxed">
                              {product.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-yellow-400 font-black text-lg">
                            {formatDOP(customerPrice(product.price))}
                          </span>
                          <button
                            onClick={e => { e.stopPropagation(); handleAddQuick(product); }}
                            className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center hover:bg-yellow-300 transition shadow-[0_0_12px_rgba(255,215,0,0.4)]"
                          >
                            <Plus size={16} className="text-black" />
                          </button>
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

      {/* Cart Bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-yellow-400/20 z-20">
          <Link href="/customer/cart">
            <Button className="w-full bg-yellow-400 text-black font-black text-lg h-14 hover:bg-yellow-300 shadow-[0_0_30px_rgba(255,215,0,0.3)]">
              <ShoppingCart size={20} className="mr-2" />
              {t.viewCart} · {cartCount} {cartCount === 1 ? "item" : "items"} · {formatDOP(parseFloat((totalAmount * (1 + MARKUP)).toFixed(2)))}
            </Button>
          </Link>
        </div>
      )}

      {/* Meal Detail Bottom Sheet */}
      {selectedProduct && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-background/70 z-30 backdrop-blur-sm"
            onClick={closeSheet}
          />

          {/* Sheet */}
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-yellow-400/30 rounded-t-3xl overflow-hidden max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300">

            {/* Product Image */}
            {selectedProduct.imageUrl ? (
              <div className="relative h-64 flex-shrink-0">
                <img
                  src={selectedProduct.imageUrl}
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-transparent to-transparent" />
                <button
                  onClick={closeSheet}
                  className="absolute top-4 right-4 w-9 h-9 bg-background/70 rounded-full flex items-center justify-center hover:bg-background transition"
                >
                  <X size={16} className="text-white" />
                </button>
              </div>
            ) : (
              <div className="relative h-32 flex-shrink-0 bg-yellow-400/5 flex items-center justify-center">
                <span className="text-6xl">🍽️</span>
                <button
                  onClick={closeSheet}
                  className="absolute top-4 right-4 w-9 h-9 bg-background/70 rounded-full flex items-center justify-center"
                >
                  <X size={16} className="text-white" />
                </button>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 pt-4 pb-2">
              {selectedProduct.category && (
                <Badge className="bg-yellow-400/15 text-yellow-400 border-yellow-400/30 text-xs mb-2">
                  {selectedProduct.category}
                </Badge>
              )}
              <h2 className="text-2xl font-black text-white leading-tight">{selectedProduct.name}</h2>
              {selectedProduct.description && (
                <p className="text-gray-400 text-sm mt-3 leading-relaxed">{selectedProduct.description}</p>
              )}
              <div className="mt-4 flex items-center justify-between">
                <span className="text-yellow-400 font-black text-3xl">
                  {formatDOP(customerPrice(selectedProduct.price))}
                </span>
                <p className="text-xs text-gray-600">IVA incluido</p>
              </div>
            </div>

            {/* Add to Cart Controls */}
            <div className="px-5 py-4 border-t border-white/5 flex-shrink-0">
              <div className="flex items-center gap-4 mb-4">
                <button
                  onClick={() => setSheetQty(q => Math.max(1, q - 1))}
                  className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition text-white font-black text-lg"
                >
                  −
                </button>
                <span className="flex-1 text-center text-2xl font-black text-white">{sheetQty}</span>
                <button
                  onClick={() => setSheetQty(q => q + 1)}
                  className="w-11 h-11 rounded-full bg-yellow-400 flex items-center justify-center hover:bg-yellow-300 transition shadow-[0_0_16px_rgba(255,215,0,0.4)]"
                >
                  <Plus size={20} className="text-black" />
                </button>
              </div>
              <Button
                className="w-full bg-yellow-400 text-black font-black text-base h-14 hover:bg-yellow-300 shadow-[0_0_24px_rgba(255,215,0,0.3)] gap-2"
                onClick={handleAddFromSheet}
              >
                <ShoppingBag size={18} />
                {t.addToCart} · {formatDOP(customerPrice(selectedProduct.price) * sheetQty)}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
