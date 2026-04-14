import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useCart } from "@/lib/cart";
import { useCreateOrder, getListOrdersQueryKey } from "@workspace/api-client-react";
import { formatDOP, getStoredUser } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Trash2, MapPin, Banknote, Plus, Star, ChevronDown, ChevronUp, Check, Navigation, Loader2, FileText, Tag, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { requestGPS } from "@/lib/gps";

const MARKUP = 0.15;
const DELIVERY_FEE = 150;
const TIP_PRESETS = [0, 50, 100, 200];

interface SavedAddress {
  id: number;
  label: string;
  address: string;
  isDefault: boolean;
}

export default function CustomerCart() {
  const { items, removeItem, updateQuantity, clearCart, totalAmount, businessId } = useCart();
  const [address, setAddress] = useState("");
  const [addressLabel, setAddressLabel] = useState("Casa");
  const [notes, setNotes] = useState("");
  const paymentMethod: "cash" | "card" = "cash";
  const [tip, setTip] = useState(0);
  const [customTip, setCustomTip] = useState("");
  const [showCustomTip, setShowCustomTip] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [saveAddress, setSaveAddress] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLang();

  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountAmount: number; discountType: string; discountValue: number } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");

  const markedUpTotal = parseFloat((totalAmount * (1 + MARKUP)).toFixed(2));
  const activeTip = showCustomTip && customTip ? parseFloat(customTip) || 0 : tip;
  const promoDiscount = appliedPromo?.discountAmount ?? 0;
  const grandTotal = markedUpTotal + DELIVERY_FEE + activeTip - promoDiscount;

  const user = getStoredUser();

  useEffect(() => {
    if (!user) return;
    fetch("/api/customer/addresses", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then((data: SavedAddress[]) => {
        setSavedAddresses(data);
        const def = data.find(a => a.isDefault);
        if (def) setAddress(def.address);
      })
      .catch(() => {});
  }, []);

  const handleSelectAddress = (addr: SavedAddress) => {
    setAddress(addr.address);
    setShowAddressDropdown(false);
  };

  const handleSaveNewAddress = async () => {
    if (!address.trim() || !addressLabel.trim()) return;
    const res = await fetch("/api/customer/addresses", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: addressLabel, address, isDefault: savedAddresses.length === 0 }),
    });
    if (res.ok) {
      const saved = await res.json();
      setSavedAddresses(prev => [...prev, saved]);
      setShowSaveForm(false);
      toast({ title: "✅ Dirección guardada", description: `"${addressLabel}" guardada para próximas veces` });
    }
  };

  const handleGPS = async () => {
    setGpsLoading(true);
    try {
      const loc = await requestGPS();
      if (loc.address) setAddress(loc.address);
      toast({ title: "📍 Ubicación detectada", description: loc.address });
    } catch (err: unknown) {
      toast({ title: "No se pudo obtener ubicación", description: err instanceof Error ? err.message : "Intenta de nuevo", variant: "destructive" });
    } finally {
      setGpsLoading(false);
    }
  };

  const createOrder = useCreateOrder({
    mutation: {
      onSuccess: (order) => {
        clearCart();
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        navigate(`/customer/orders/${order.id}`);
        toast({ title: t.orderSent, description: t.orderOnWay });
      },
      onError: () => {
        toast({ title: t.error, description: t.orderError, variant: "destructive" });
      },
    },
  });

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoError("");
    try {
      const res = await fetch("/api/promo-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoInput.trim(), orderTotal: markedUpTotal + DELIVERY_FEE }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPromoError(data.error ?? "Código inválido");
      } else {
        setAppliedPromo(data);
        setPromoInput("");
        toast({ title: "✅ Código aplicado", description: `Descuento de ${formatDOP(data.discountAmount)}` });
      }
    } catch {
      setPromoError("Error al validar el código");
    } finally {
      setPromoLoading(false);
    }
  };

  const handleOrder = () => {
    if (!address.trim()) {
      toast({ title: t.missingAddress, description: t.addressRequired, variant: "destructive" });
      return;
    }
    if (!businessId) return;

    (createOrder.mutate as any)({
      businessId,
      paymentMethod,
      deliveryAddress: address,
      notes: notes || undefined,
      tip: activeTip,
      items: items.map(i => ({ productId: i.productId!, quantity: i.quantity })),
      promoCode: appliedPromo?.code,
      promoDiscount,
    });
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-6">
        <p className="text-5xl mb-4">🛒</p>
        <h2 className="text-xl font-black mb-2">{t.emptyCart}</h2>
        <p className="text-gray-400 mb-8">{t.emptyCartMsg}</p>
        <Link href="/customer">
          <Button className="bg-yellow-400 text-black font-bold hover:bg-yellow-300">{t.exploreBusinesses}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white pb-32">
      <div className="bg-background border-b border-yellow-400/20 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/customer">
          <button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10 transition">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <h1 className="text-xl font-black text-yellow-400">{t.yourOrder}</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Items */}
        <div className="bg-white/8 border border-white/10 rounded-2xl overflow-hidden">
          {items.map((item, idx) => {
            const customerPrice = parseFloat((item.product.price * (1 + MARKUP)).toFixed(2));
            return (
              <div key={item.productId} className={`flex items-center gap-3 p-4 ${idx < items.length - 1 ? "border-b border-white/5" : ""}`}>
                {item.product.imageUrl && (
                  <img src={item.product.imageUrl} alt={item.product.name} className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{item.product.name}</p>
                  <p className="text-yellow-400 font-bold text-sm">{formatDOP(customerPrice)} × {item.quantity}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQuantity(item.productId!, item.quantity - 1)} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-sm hover:bg-white/20">-</button>
                  <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.productId!, item.quantity + 1)} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-sm hover:bg-white/20">+</button>
                  <button onClick={() => removeItem(item.productId!)} className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center hover:bg-red-500/40 transition ml-1">
                    <Trash2 size={12} className="text-red-400" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Delivery Address */}
        <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={16} className="text-yellow-400" />
            <h3 className="font-bold">{t.deliveryAddress}</h3>
          </div>

          {savedAddresses.length > 0 && (
            <div className="mb-3">
              <button
                onClick={() => setShowAddressDropdown(!showAddressDropdown)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-yellow-400/10 border border-yellow-400/30 text-sm font-bold text-yellow-400"
              >
                <span>📍 Mis direcciones guardadas</span>
                {showAddressDropdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showAddressDropdown && (
                <div className="mt-2 space-y-2">
                  {savedAddresses.map(a => (
                    <button
                      key={a.id}
                      onClick={() => handleSelectAddress(a)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border text-left text-sm transition ${address === a.address ? "border-yellow-400 bg-yellow-400/10" : "border-white/10 bg-white/8 hover:bg-white/10"}`}
                    >
                      {address === a.address && <Check size={14} className="text-yellow-400 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white">{a.label}</p>
                        <p className="text-gray-400 text-xs truncate">{a.address}</p>
                      </div>
                      {a.isDefault && <span className="text-xs text-yellow-400/60 font-bold">Principal</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Input
              placeholder={t.addressPlaceholder}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400 flex-1"
              data-testid="input-address"
            />
            <button
              type="button"
              onClick={handleGPS}
              disabled={gpsLoading}
              title="Usar mi ubicación"
              className="px-3 rounded-xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/20 transition disabled:opacity-50 flex items-center"
            >
              {gpsLoading ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
            </button>
          </div>

          {user && !showSaveForm && (
            <button
              onClick={() => setShowSaveForm(true)}
              className="mt-2 flex items-center gap-1 text-xs text-yellow-400/70 hover:text-yellow-400 transition"
            >
              <Plus size={12} /> Guardar esta dirección para próximas veces
            </button>
          )}

          {showSaveForm && (
            <div className="mt-3 p-3 rounded-xl bg-yellow-400/5 border border-yellow-400/20 space-y-2">
              <p className="text-xs font-bold text-yellow-400">Etiquetar dirección</p>
              <div className="flex gap-2">
                {["Casa", "Trabajo", "Otro"].map(l => (
                  <button
                    key={l}
                    onClick={() => setAddressLabel(l)}
                    className={`px-3 py-1 rounded-full text-xs font-bold border transition ${addressLabel === l ? "border-yellow-400 bg-yellow-400/20 text-yellow-400" : "border-white/10 bg-white/8 text-gray-400"}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              {addressLabel === "Otro" && (
                <Input
                  placeholder="Nombre de la dirección"
                  value={addressLabel === "Otro" ? "" : addressLabel}
                  onChange={(e) => setAddressLabel(e.target.value)}
                  className="bg-white/8 border-white/10 text-white text-xs h-8"
                />
              )}
              <div className="flex gap-2">
                <Button onClick={handleSaveNewAddress} size="sm" className="bg-yellow-400 text-black font-bold text-xs h-7">
                  Guardar
                </Button>
                <Button onClick={() => setShowSaveForm(false)} variant="ghost" size="sm" className="text-gray-400 text-xs h-7">
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          <div className="mt-4 space-y-1">
            <div className="flex items-center gap-2">
              <FileText size={13} className="text-yellow-400/70" />
              <span className="text-xs font-bold text-yellow-400/70 uppercase tracking-wider">Notas para el negocio</span>
            </div>
            <Textarea
              placeholder={t.specialInstructions}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400 resize-none"
              rows={2}
            />
          </div>
        </div>

        {/* Tip */}
        <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Star size={16} className="text-yellow-400" />
            <h3 className="font-bold">Propina al repartidor</h3>
            <span className="text-xs text-yellow-400/60 ml-auto font-bold">100% al driver</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {TIP_PRESETS.map(p => (
              <button
                key={p}
                onClick={() => { setTip(p); setShowCustomTip(false); setCustomTip(""); }}
                className={`py-2 rounded-xl text-sm font-bold border transition ${!showCustomTip && tip === p ? "border-yellow-400 bg-yellow-400/20 text-yellow-400" : "border-white/10 bg-white/8 text-gray-300 hover:bg-white/10"}`}
              >
                {p === 0 ? "Sin propina" : formatDOP(p)}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setShowCustomTip(!showCustomTip); setTip(0); }}
            className={`mt-2 w-full py-2 rounded-xl text-sm font-bold border transition ${showCustomTip ? "border-yellow-400 bg-yellow-400/20 text-yellow-400" : "border-white/10 bg-white/8 text-gray-300 hover:bg-white/10"}`}
          >
            Otra cantidad
          </button>
          {showCustomTip && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-gray-400 text-sm font-bold">RD$</span>
              <Input
                type="number"
                placeholder="0"
                value={customTip}
                onChange={(e) => setCustomTip(e.target.value)}
                className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400 h-9"
              />
            </div>
          )}
        </div>

        {/* Promo Code */}
        <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Tag size={16} className="text-yellow-400" />
            <h3 className="font-bold">¿Tienes un código?</h3>
          </div>
          {appliedPromo ? (
            <div className="flex items-center justify-between bg-green-400/10 border border-green-400/30 rounded-xl px-3 py-2">
              <div>
                <p className="text-green-400 font-bold text-sm">✅ {appliedPromo.code}</p>
                <p className="text-xs text-green-400/70">Descuento: {formatDOP(appliedPromo.discountAmount)}</p>
              </div>
              <button onClick={() => setAppliedPromo(null)} className="text-gray-400 hover:text-white transition">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="CODIGO"
                  value={promoInput}
                  onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleApplyPromo()}
                  className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400 uppercase font-bold tracking-widest"
                />
                <Button
                  onClick={handleApplyPromo}
                  disabled={promoLoading || !promoInput.trim()}
                  className="bg-yellow-400 text-black font-bold hover:bg-yellow-300 flex-shrink-0"
                >
                  {promoLoading ? <Loader2 size={14} className="animate-spin" /> : "Aplicar"}
                </Button>
              </div>
              {promoError && <p className="text-xs text-red-400 font-bold">{promoError}</p>}
            </div>
          )}
        </div>

        {/* Payment */}
        <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <Banknote size={20} className="text-yellow-400 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm">{t.paymentMethod}</p>
              <p className="text-gray-400 text-xs mt-0.5">Pago en efectivo al repartidor · No se almacena información de tarjetas</p>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white/8 border border-white/10 rounded-2xl p-4 space-y-2">
          <div className="flex justify-between text-sm text-gray-300">
            <span>{t.subtotal}</span>
            <span>{formatDOP(markedUpTotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-300">
            <span>{t.delivery}</span>
            <span>{formatDOP(DELIVERY_FEE)}</span>
          </div>
          {activeTip > 0 && (
            <div className="flex justify-between text-sm text-yellow-400/80">
              <span>Propina al driver</span>
              <span>{formatDOP(activeTip)}</span>
            </div>
          )}
          {promoDiscount > 0 && (
            <div className="flex justify-between text-sm text-green-400 font-bold">
              <span>🎟 {appliedPromo?.code}</span>
              <span>-{formatDOP(promoDiscount)}</span>
            </div>
          )}
          <div className="border-t border-white/10 pt-2 flex justify-between font-black text-lg">
            <span>{t.total}</span>
            <span className="text-yellow-400">{formatDOP(Math.max(grandTotal, 0))}</span>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-yellow-400/20 z-20">
        <Button
          className="w-full bg-yellow-400 text-black font-black text-lg h-14 hover:bg-yellow-300 shadow-[0_0_30px_rgba(255,215,0,0.3)] disabled:opacity-50"
          onClick={handleOrder}
          disabled={createOrder.isPending}
          data-testid="button-place-order"
        >
          {createOrder.isPending ? t.placing : t.orderNow(formatDOP(grandTotal))}
        </Button>
      </div>
    </div>
  );
}
