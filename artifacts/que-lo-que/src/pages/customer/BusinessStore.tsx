import { useState, useMemo, useRef } from "react";
import { useParams, Link } from "wouter";
import { useGetBusiness, getGetBusinessQueryKey, useListProducts, getListProductsQueryKey } from "@workspace/api-client-react";
import { useCart } from "@/lib/cart";
import { formatDOP } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import LangToggle from "@/components/LangToggle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Star, ShoppingCart, Plus, Minus, X, ShoppingBag } from "lucide-react";

const MARKUP = 0.15;

function customerPrice(base: number) {
  return parseFloat((base * (1 + MARKUP)).toFixed(2));
}

export default function BusinessStore() {
  const { id } = useParams<{ id: string }>();
  const businessId = parseInt(id, 10);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [sheetQty, setSheetQty] = useState(1);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { addItem, removeItem, updateQuantity, items, totalAmount } = useCart();
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
  const cartTotal = parseFloat((totalAmount * (1 + MARKUP)).toFixed(2));

  const getCartItem = (productId: number) => items.find(i => i.productId === productId);

  const handleAdd = (product: any) => {
    const existing = getCartItem(product.id);
    if (existing) {
      updateQuantity(product.id, existing.quantity + 1);
    } else {
      addItem(product, 1, business?.category ?? undefined);
    }
  };

  const handleRemove = (productId: number) => {
    const existing = getCartItem(productId);
    if (!existing) return;
    if (existing.quantity <= 1) {
      removeItem(productId);
    } else {
      updateQuantity(productId, existing.quantity - 1);
    }
  };

  const groupedProducts = useMemo(() => {
    if (!products) return {};
    const available = products.filter(p => p.isAvailable);
    return available.reduce((acc: Record<string, any[]>, p) => {
      const cat = p.category || "Menú";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(p);
      return acc;
    }, {});
  }, [products]);

  const categories = Object.keys(groupedProducts);

  const scrollToCategory = (cat: string) => {
    setSelectedCategory(cat);
    const el = categoryRefs.current[cat];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const openSheet = (product: any) => {
    setSelectedProduct(product);
    setSheetQty(getCartItem(product.id)?.quantity || 1);
  };

  const closeSheet = () => setSelectedProduct(null);

  const handleAddFromSheet = () => {
    if (!selectedProduct) return;
    const existing = getCartItem(selectedProduct.id);
    if (existing) {
      updateQuantity(selectedProduct.id, sheetQty);
    } else {
      addItem(selectedProduct, sheetQty, business?.category ?? undefined);
    }
    closeSheet();
  };

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
      <div className="relative h-48">
        {business?.imageUrl ? (
          <img src={business.imageUrl} alt={business.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-yellow-400/20 to-transparent flex items-center justify-center text-6xl">🍽️</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        <Link href="/customer">
          <button className="absolute top-4 left-4 w-9 h-9 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition">
            <ArrowLeft size={16} className="text-white" />
          </button>
        </Link>
        <div className="absolute top-4 right-4">
          <LangToggle />
        </div>
        {/* Business name over hero */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black text-white drop-shadow-lg leading-tight">{business?.name}</h1>
              {business?.description && (
                <p className="text-gray-300 text-xs mt-0.5 line-clamp-1">{business?.description}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <div className="flex items-center gap-1 bg-yellow-400/20 border border-yellow-400/40 px-2 py-1 rounded-lg">
                <Star size={12} fill="currentColor" className="text-yellow-400" />
                <span className="font-black text-sm text-yellow-400">{business?.rating?.toFixed(1)}</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${business?.isOpen !== false ? "bg-green-400/20 text-green-400" : "bg-gray-500/30 text-gray-400"}`}>
                {business?.isOpen !== false ? "● Abierto" : "● Cerrado"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Closed banner */}
      {business?.isOpen === false && (
        <div className="mx-4 mt-3 flex items-center gap-3 bg-gray-800/80 border border-white/20 rounded-2xl p-3">
          <span className="text-xl">🔒</span>
          <div>
            <p className="font-black text-white text-sm">Cerrado ahora</p>
            <p className="text-gray-400 text-xs">Puedes ver el menú pero no hacer pedidos</p>
          </div>
        </div>
      )}

      {/* Category chip scroll */}
      {!prodsLoading && categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-none border-b border-white/5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => scrollToCategory(cat)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-black transition-all ${
                selectedCategory === cat
                  ? "bg-yellow-400 text-black shadow-[0_0_12px_rgba(255,215,0,0.4)]"
                  : "bg-white/8 text-gray-300 border border-white/15 hover:border-yellow-400/40"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Products */}
      <div className="px-4 pt-3">
        {prodsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 bg-white/8 rounded-xl" />)}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">🤷</p>
            <p className="text-gray-400">{t.storeNoProducts}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedProducts).map(([category, prods]) => (
              <div key={category} ref={el => { categoryRefs.current[category] = el; }}>
                <h2 className="text-yellow-400 font-black text-sm uppercase tracking-widest mb-3 border-b border-yellow-400/20 pb-2">
                  {category}
                </h2>
                <div className="space-y-0">
                  {prods.map((product, idx) => {
                    const cartItem = getCartItem(product.id);
                    const inCart = !!cartItem;
                    return (
                      <div key={product.id}>
                        {/* Divider */}
                        {idx > 0 && <div className="border-t border-white/5 mx-1" />}

                        {/* Product row */}
                        <div
                          className="flex gap-3 py-3 px-1 cursor-pointer active:bg-white/3 transition rounded-xl"
                          onClick={() => openSheet(product)}
                        >
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-black text-sm leading-tight ${inCart ? "text-yellow-400" : "text-white"}`}>
                              {product.name}
                            </h3>
                            {product.description && (
                              <p className="text-gray-500 text-xs mt-1 line-clamp-2 leading-relaxed">
                                {product.description}
                              </p>
                            )}
                            <p className={`font-black text-base mt-1.5 ${inCart ? "text-yellow-400" : "text-white"}`}>
                              {formatDOP(customerPrice(product.price))}
                            </p>
                          </div>
                          {product.imageUrl && (
                            <div className="relative flex-shrink-0 w-20 h-20">
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-full h-full object-cover rounded-xl"
                              />
                            </div>
                          )}
                          {/* Quick add / qty controls (right side) */}
                          <div
                            className="flex items-end flex-shrink-0"
                            onClick={e => e.stopPropagation()}
                          >
                            {inCart ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleRemove(product.id)}
                                  disabled={business?.isOpen === false}
                                  className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition disabled:opacity-30"
                                >
                                  <Minus size={12} className="text-white" />
                                </button>
                                <span className="text-sm font-black text-yellow-400 w-5 text-center">
                                  {cartItem.quantity}
                                </span>
                                <button
                                  onClick={() => handleAdd(product)}
                                  disabled={business?.isOpen === false}
                                  className="w-7 h-7 rounded-full bg-yellow-400 flex items-center justify-center hover:bg-yellow-300 transition shadow-[0_0_10px_rgba(255,215,0,0.4)] disabled:opacity-30"
                                >
                                  <Plus size={12} className="text-black" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleAdd(product)}
                                disabled={business?.isOpen === false}
                                className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center hover:bg-yellow-300 transition shadow-[0_0_12px_rgba(255,215,0,0.4)] disabled:opacity-30"
                              >
                                <Plus size={16} className="text-black" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sticky View Order button */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-yellow-400/20 z-20">
          <Link href="/customer/cart">
            <Button className="w-full bg-yellow-400 text-black font-black text-base h-14 hover:bg-yellow-300 shadow-[0_0_30px_rgba(255,215,0,0.3)] flex items-center justify-between px-5">
              <span className="bg-black/20 text-black font-black text-sm w-7 h-7 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
              <span className="flex items-center gap-2">
                <ShoppingCart size={18} />
                {t.viewCart}
              </span>
              <span>{formatDOP(cartTotal)}</span>
            </Button>
          </Link>
        </div>
      )}

      {/* Product Detail Bottom Sheet */}
      {selectedProduct && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-30 backdrop-blur-sm"
            onClick={closeSheet}
          />
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-yellow-400/30 rounded-t-3xl overflow-hidden max-h-[85vh] flex flex-col">
            {selectedProduct.imageUrl ? (
              <div className="relative h-52 flex-shrink-0">
                <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                <button onClick={closeSheet} className="absolute top-4 right-4 w-9 h-9 bg-black/60 rounded-full flex items-center justify-center">
                  <X size={16} className="text-white" />
                </button>
              </div>
            ) : (
              <div className="relative h-24 flex-shrink-0 bg-yellow-400/5 flex items-center justify-center">
                <span className="text-5xl">🍽️</span>
                <button onClick={closeSheet} className="absolute top-4 right-4 w-9 h-9 bg-background/70 rounded-full flex items-center justify-center">
                  <X size={16} className="text-white" />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-5 pt-4 pb-2">
              <h2 className="text-xl font-black text-white leading-tight">{selectedProduct.name}</h2>
              {selectedProduct.description && (
                <p className="text-gray-400 text-sm mt-2 leading-relaxed">{selectedProduct.description}</p>
              )}
              <p className="text-yellow-400 font-black text-2xl mt-3">
                {formatDOP(customerPrice(selectedProduct.price))}
              </p>
            </div>
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
                className="w-full bg-yellow-400 text-black font-black text-base h-14 hover:bg-yellow-300 shadow-[0_0_24px_rgba(255,215,0,0.3)] gap-2 disabled:opacity-40"
                onClick={handleAddFromSheet}
                disabled={business?.isOpen === false}
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
