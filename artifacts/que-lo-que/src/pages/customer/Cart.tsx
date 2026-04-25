import { useState, useEffect, lazy, Suspense } from "react";
import { Link, useLocation } from "wouter";
import { useCart } from "@/lib/cart";
import { useCreateOrder, getListOrdersQueryKey } from "@workspace/api-client-react";
import { formatDOP, getStoredUser } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Trash2, MapPin, Banknote, Plus, ChevronDown, ChevronUp,
  Check, Navigation, Loader2, FileText, Tag, X, CreditCard,
  ChevronRight, Minus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { requestGPS } from "@/lib/gps";

const StripePaymentSheet = lazy(() => import("@/components/StripePaymentSheet"));

const MARKUP = 0.15;
const MIN_DELIVERY_FEE = 100;
const MAX_DELIVERY_FEE = 190;

// Haversine distance between two lat/lng points (km)
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Fee tiers: 0-2 km → RD$100, 2-5 km → RD$130, 5-8 km → RD$160, 8+ km → RD$190
function calcDeliveryFee(km: number): number {
  if (km <= 2) return 100;
  if (km <= 5) return 130;
  if (km <= 8) return 160;
  return MAX_DELIVERY_FEE;
}

type CashCurrency = "DOP" | "USD" | "EUR";

const EXCHANGE_RATES: Record<CashCurrency, number> = {
  DOP: 1,
  USD: 1 / 60,   // 1 USD ≈ 60 DOP
  EUR: 1 / 65,   // 1 EUR ≈ 65 DOP
};

const CURRENCY_BILLS: Record<CashCurrency, number[]> = {
  DOP: [100, 200, 500, 1000, 2000, 5000],
  USD: [1, 5, 10, 20, 50, 100],
  EUR: [5, 10, 20, 50, 100, 200],
};

const CURRENCY_META: Record<CashCurrency, { flag: string; label: string; symbol: string; decimals: number }> = {
  DOP: { flag: "🇩🇴", label: "Pesos", symbol: "RD$", decimals: 0 },
  USD: { flag: "🇺🇸", label: "Dólares", symbol: "$", decimals: 2 },
  EUR: { flag: "🇪🇺", label: "Euros", symbol: "€", decimals: 2 },
};

function formatCurrencyAmount(amount: number, currency: CashCurrency) {
  const { symbol, decimals } = CURRENCY_META[currency];
  return `${symbol}${amount.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

function getCashOptions(totalDOP: number, currency: CashCurrency) {
  const rate = EXCHANGE_RATES[currency];
  const totalInCurrency = totalDOP * rate;
  const bills = CURRENCY_BILLS[currency];
  const decimals = CURRENCY_META[currency].decimals;

  // Round up to currency precision
  const factor = Math.pow(10, decimals);
  const exactAmount = Math.ceil(totalInCurrency * factor) / factor;

  const options: { amount: number; change: number; isExact: boolean }[] = [
    { amount: exactAmount, change: 0, isExact: true },
  ];

  for (const bill of bills) {
    const needed = Math.ceil(exactAmount / bill) * bill;
    const roundedNeeded = Math.round(needed * factor) / factor;
    if (roundedNeeded > exactAmount && !options.find(o => Math.abs(o.amount - roundedNeeded) < 0.001)) {
      options.push({ amount: roundedNeeded, change: Math.round((roundedNeeded - exactAmount) * factor) / factor, isExact: false });
    }
  }

  // Ensure big useful denominations are included
  const bigBills = currency === "DOP" ? [1000, 2000] : currency === "USD" ? [20, 50, 100] : [20, 50, 100];
  for (const big of bigBills) {
    if (big > exactAmount && !options.find(o => Math.abs(o.amount - big) < 0.001)) {
      options.push({ amount: big, change: Math.round((big - exactAmount) * factor) / factor, isExact: false });
    }
  }

  return options.sort((a, b) => a.amount - b.amount).slice(0, 5);
}

interface SavedAddress {
  id: number;
  label: string;
  address: string;
  isDefault: boolean;
}

type Step = 1 | 2 | 3 | 4;

const STEPS = [
  { n: 1, label: "Carrito" },
  { n: 2, label: "Notas" },
  { n: 3, label: "Dirección" },
  { n: 4, label: "Pago" },
];

export default function CustomerCart() {
  const { items, removeItem, updateQuantity, clearCart, totalAmount, businessId, businessCategory } = useCart();
  const isLaundry = businessCategory === "laundry";
  const [step, setStep] = useState<Step>(1);
  const [notes, setNotes] = useState("");
  const [address, setAddress] = useState("");
  const [addressLabel, setAddressLabel] = useState("Casa");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [tip, setTip] = useState(0);
  const [customTip, setCustomTip] = useState("");
  const [showCustomTip, setShowCustomTip] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [pickupAddress, setPickupAddress] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLang();
  const user = getStoredUser();

  const [deliveryFee, setDeliveryFee] = useState(MIN_DELIVERY_FEE);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);

  const [showTipModal, setShowTipModal] = useState(false);
  const [showStripeSheet, setShowStripeSheet] = useState(false);
  const [showCutleryModal, setShowCutleryModal] = useState(false);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [cashCurrency, setCashCurrency] = useState<CashCurrency>("DOP");
  const [cashPrepared, setCashPrepared] = useState<number | null>(null); // null = exact / no change

  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountAmount: number; discountType: string; discountValue: number } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");

  const markedUpTotal = parseFloat((totalAmount * (1 + MARKUP)).toFixed(2));
  const rawCustomTip = showCustomTip && customTip ? parseFloat(customTip) || 0 : 0;
  const activeTip = showCustomTip ? Math.min(rawCustomTip, 150) : tip;
  const promoDiscount = appliedPromo?.discountAmount ?? 0;
  const grandTotal = Math.max(markedUpTotal + deliveryFee + activeTip - promoDiscount, 0);

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
      toast({ title: "✅ Dirección guardada" });
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
        const etaMins = (order as any).estimatedMinutes ?? 40;
        toast({ title: "✅ ¡Pedido enviado!", description: `Tiempo estimado: ~${etaMins} min` });
        navigate(`/customer/orders/${order.id}`);
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
        body: JSON.stringify({ code: promoInput.trim(), orderTotal: markedUpTotal + deliveryFee }),
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

  const placeOrder = (withCutlery: boolean | null) => {
    if (!address.trim()) {
      toast({ title: t.missingAddress, description: t.addressRequired, variant: "destructive" });
      return;
    }
    if (isLaundry && !pickupAddress.trim()) {
      toast({ title: "Dirección de recogida requerida", description: "Indica dónde recoger tu ropa", variant: "destructive" });
      return;
    }
    if (!businessId) return;
    const cutleryLine = withCutlery === true ? "🍴 Cubiertos: Sí" : withCutlery === false ? "🍴 Cubiertos: No" : "";
    const cashLine = paymentMethod === "cash" && cashPrepared !== null
      ? cashPrepared === getCashOptions(grandTotal, cashCurrency)[0]?.amount
        ? `💵 Paga con: monto exacto en ${CURRENCY_META[cashCurrency].label} (${formatCurrencyAmount(cashPrepared, cashCurrency)})`
        : `💵 Paga con: ${formatCurrencyAmount(cashPrepared, cashCurrency)} ${CURRENCY_META[cashCurrency].label} — cambio: ${formatCurrencyAmount(cashPrepared - getCashOptions(grandTotal, cashCurrency)[0]?.amount, cashCurrency)}`
      : "";
    const fullNotes = [notes, cutleryLine, cashLine].filter(Boolean).join("\n") || undefined;
    (createOrder.mutate as any)({
      businessId,
      paymentMethod,
      deliveryAddress: address,
      notes: fullNotes,
      tip: activeTip,
      items: items.map(i => ({ productId: i.productId!, quantity: i.quantity })),
      promoCode: appliedPromo?.code,
      promoDiscount,
      orderType: isLaundry ? "laundry" : "delivery",
      pickupAddress: isLaundry ? pickupAddress : undefined,
    });
    setShowCutleryModal(false);
  };

  // Geocode address text → {lat, lng} using Nominatim
  const geocodeAddress = async (addressText: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const q = encodeURIComponent(`${addressText}, Dominican Republic`);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`);
      const data = await res.json();
      if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    } catch { }
    return null;
  };

  // Calculate dynamic delivery fee when user finishes entering address (step 3 → 4)
  const calculateFee = async (deliveryAddr: string) => {
    if (!businessId) return;
    setFeeLoading(true);
    try {
      // Fetch business location
      const bizRes = await fetch(`/api/businesses/${businessId}`, { credentials: "include" });
      const biz = bizRes.ok ? await bizRes.json() : null;
      const bizLat = biz?.lat ? parseFloat(biz.lat) : null;
      const bizLng = biz?.lng ? parseFloat(biz.lng) : null;

      // Geocode delivery address
      const dest = await geocodeAddress(deliveryAddr);

      if (bizLat && bizLng && dest) {
        const km = haversineKm(bizLat, bizLng, dest.lat, dest.lng);
        const fee = calcDeliveryFee(km);
        setDistanceKm(Math.round(km * 10) / 10);
        setDeliveryFee(fee);
      } else {
        // Fallback: keep base fee if geocoding fails
        setDistanceKm(null);
        setDeliveryFee(MIN_DELIVERY_FEE);
      }
    } catch {
      setDeliveryFee(MIN_DELIVERY_FEE);
    } finally {
      setFeeLoading(false);
    }
  };

  const handleOrder = () => {
    if (!address.trim()) {
      toast({ title: t.missingAddress, description: t.addressRequired, variant: "destructive" });
      return;
    }
    // Show tip prompt first (always, before any payment)
    setShowTipModal(true);
  };

  // Called after tip is confirmed
  const proceedToPayment = () => {
    setShowTipModal(false);
    if (paymentMethod === "card") {
      setShowStripeSheet(true);
      return;
    }
    if (paymentMethod === "cash") {
      setShowChangeModal(true);
    } else if (!isLaundry) {
      setShowCutleryModal(true);
    } else {
      placeOrder(null);
    }
  };

  const handleChangeConfirm = () => {
    setShowChangeModal(false);
    if (!isLaundry) {
      setShowCutleryModal(true);
    } else {
      placeOrder(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-6">
        <p className="text-5xl mb-4">🛒</p>
        <h2 className="text-xl font-black mb-2">{t.emptyCart}</h2>
        <p className="text-white/60 mb-8">{t.emptyCartMsg}</p>
        <Link href="/customer">
          <Button className="bg-yellow-400 text-black font-bold hover:bg-yellow-300">{t.exploreBusinesses}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      {/* Header */}
      <div className="bg-background border-b border-yellow-400/20 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        {step === 1 ? (
          <Link href="/customer">
            <button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10 transition">
              <ArrowLeft size={18} />
            </button>
          </Link>
        ) : (
          <button
            onClick={() => setStep((step - 1) as Step)}
            className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10 transition"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="flex-1">
          <h1 className="text-base font-black text-yellow-400">
            {step === 1 && t.yourOrder}
            {step === 2 && "Notas al negocio"}
            {step === 3 && (isLaundry ? "Direcciones de recogida" : t.deliveryAddress)}
            {step === 4 && t.paymentMethod}
          </h1>
        </div>
        {/* Running total badge */}
        <div className="bg-yellow-400/15 border border-yellow-400/30 rounded-xl px-3 py-1">
          <span className="text-yellow-400 font-black text-sm">{formatDOP(grandTotal)}</span>
        </div>
      </div>

      {/* Step progress dots */}
      <div className="flex items-center justify-center gap-2 px-4 py-3 border-b border-white/5">
        {STEPS.map((s, idx) => (
          <div key={s.n} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 transition-all ${step === s.n ? "opacity-100" : step > s.n ? "opacity-60" : "opacity-30"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border transition-all ${
                step > s.n
                  ? "bg-yellow-400 border-yellow-400 text-black"
                  : step === s.n
                  ? "border-yellow-400 text-yellow-400"
                  : "border-white/20 text-white/40"
              }`}>
                {step > s.n ? <Check size={12} /> : s.n}
              </div>
              <span className={`text-xs font-bold hidden sm:block ${step === s.n ? "text-yellow-400" : "text-white/40"}`}>
                {s.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`w-6 h-px transition-all ${step > s.n ? "bg-yellow-400/60" : "bg-white/10"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto pb-32">

        {/* ── STEP 1: Cart Items ── */}
        {step === 1 && (
          <div className="px-4 py-4 space-y-3">
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              {items.map((item, idx) => {
                const customerPrice = parseFloat((item.product.price * (1 + MARKUP)).toFixed(2));
                const lineTotal = parseFloat((customerPrice * item.quantity).toFixed(2));
                return (
                  <div key={item.productId} className={`flex items-center gap-3 p-4 ${idx < items.length - 1 ? "border-b border-white/5" : ""}`}>
                    {item.product.imageUrl && (
                      <img src={item.product.imageUrl} alt={item.product.name} className="w-14 h-14 object-cover rounded-xl flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm leading-tight">{item.product.name}</p>
                      <p className="text-white/60 text-xs mt-0.5">{formatDOP(customerPrice)} c/u</p>
                      <p className="text-yellow-400 font-black text-sm mt-0.5">{formatDOP(lineTotal)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => updateQuantity(item.productId!, item.quantity - 1)}
                        className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-sm font-black w-5 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId!, item.quantity + 1)}
                        className="w-8 h-8 rounded-full bg-yellow-400/20 flex items-center justify-center hover:bg-yellow-400/30 transition"
                      >
                        <Plus size={14} className="text-yellow-400" />
                      </button>
                      <button
                        onClick={() => removeItem(item.productId!)}
                        className="w-8 h-8 rounded-full bg-red-500/15 flex items-center justify-center hover:bg-red-500/30 transition ml-0.5"
                      >
                        <Trash2 size={13} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order summary */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between text-sm text-white/70">
                <span>{items.length} {items.length === 1 ? "artículo" : "artículos"}</span>
                <span>{formatDOP(markedUpTotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-white/70">
                <span className="flex items-center gap-1.5">
                  {t.delivery}
                  {feeLoading && <Loader2 size={11} className="animate-spin text-yellow-400/60" />}
                  {!feeLoading && distanceKm !== null && (
                    <span className="text-[10px] text-yellow-400/60 font-bold">~{distanceKm} km</span>
                  )}
                </span>
                <span className={feeLoading ? "text-white/30" : deliveryFee > MIN_DELIVERY_FEE ? "text-orange-400 font-bold" : ""}>
                  {formatDOP(deliveryFee)}
                </span>
              </div>
              <div className="border-t border-white/10 pt-2 flex justify-between font-black text-lg">
                <span>{t.total}</span>
                <span className="text-yellow-400">{formatDOP(grandTotal)}</span>
              </div>
            </div>

            {/* Add more items link */}
            <Link href={businessId ? `/customer/business/${businessId}` : "/customer"}>
              <button className="w-full flex items-center justify-center gap-2 text-sm text-yellow-400/70 hover:text-yellow-400 transition py-2">
                <Plus size={14} />
                Agregar más artículos
              </button>
            </Link>
          </div>
        )}

        {/* ── STEP 2: Notes ── */}
        {step === 2 && (
          <div className="px-4 py-6 space-y-4">
            <div className="text-center mb-2">
              <p className="text-3xl mb-2">📝</p>
              <h2 className="text-xl font-black">¿Alguna instrucción?</h2>
              <p className="text-sm text-white/60 mt-1">Sin cebolla, extra salsa, etc. — esto va directo al negocio</p>
            </div>
            <Textarea
              placeholder={t.specialInstructions}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400 resize-none text-base"
              rows={5}
              autoFocus
            />
            <p className="text-xs text-white/50 text-center">Opcional — puedes continuar sin notas</p>
          </div>
        )}

        {/* ── STEP 3: Address ── */}
        {step === 3 && (
          <div className="px-4 py-6 space-y-4">
            {isLaundry ? (
              <div className="text-center mb-2">
                <p className="text-3xl mb-2">👕</p>
                <h2 className="text-xl font-black">Recogida y entrega</h2>
                <p className="text-sm text-white/60 mt-1">Indicamos al driver dónde pasar por tu ropa y dónde llevarla</p>
              </div>
            ) : (
              <div className="text-center mb-2">
                <p className="text-3xl mb-2">📍</p>
                <h2 className="text-xl font-black">¿A dónde te lo llevamos?</h2>
              </div>
            )}

            {/* Laundry: pickup address */}
            {isLaundry && (
              <div className="space-y-2">
                <p className="text-xs font-black text-yellow-400 uppercase tracking-widest flex items-center gap-1.5">
                  <span>📤</span> ¿Dónde recogemos la ropa?
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ej: Calle Beller #22, Santiago"
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400 flex-1 text-base"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      setGpsLoading(true);
                      try {
                        const loc = await requestGPS();
                        if (loc.address) setPickupAddress(loc.address);
                      } catch { }
                      finally { setGpsLoading(false); }
                    }}
                    disabled={gpsLoading}
                    className="px-4 rounded-xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/20 transition disabled:opacity-50 flex items-center"
                  >
                    {gpsLoading ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
                  </button>
                </div>
                <div className="my-1 border-t border-white/5" />
                <p className="text-xs font-black text-yellow-400 uppercase tracking-widest flex items-center gap-1.5">
                  <span>📥</span> ¿A dónde entregamos limpia?
                </p>
              </div>
            )}

            {savedAddresses.length > 0 && (
              <div>
                <button
                  onClick={() => setShowAddressDropdown(!showAddressDropdown)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-yellow-400/10 border border-yellow-400/30 text-sm font-bold text-yellow-400"
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
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm transition ${address === a.address ? "border-yellow-400 bg-yellow-400/10" : "border-white/10 bg-white/5 hover:bg-white/8"}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white">{a.label}</p>
                          <p className="text-white/60 text-xs truncate">{a.address}</p>
                        </div>
                        {address === a.address && <Check size={16} className="text-yellow-400 flex-shrink-0" />}
                        {a.isDefault && <span className="text-xs text-yellow-400/60 font-bold">Principal</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder={t.addressPlaceholder}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400 flex-1 text-base"
                  data-testid="input-address"
                  autoFocus={savedAddresses.length === 0}
                />
                <button
                  type="button"
                  onClick={handleGPS}
                  disabled={gpsLoading}
                  title="Usar mi ubicación"
                  className="px-4 rounded-xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/20 transition disabled:opacity-50 flex items-center"
                >
                  {gpsLoading ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
                </button>
              </div>

              {user && !showSaveForm && address.trim() && (
                <button
                  onClick={() => setShowSaveForm(true)}
                  className="flex items-center gap-1.5 text-xs text-yellow-400/70 hover:text-yellow-400 transition mt-1"
                >
                  <Plus size={12} /> Guardar para próximas veces
                </button>
              )}

              {showSaveForm && (
                <div className="p-3 rounded-xl bg-yellow-400/5 border border-yellow-400/20 space-y-2">
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
                  <div className="flex gap-2">
                    <Button onClick={handleSaveNewAddress} size="sm" className="bg-yellow-400 text-black font-bold text-xs h-8">Guardar</Button>
                    <Button onClick={() => setShowSaveForm(false)} variant="ghost" size="sm" className="text-white/60 text-xs h-8">Cancelar</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 4: Payment ── */}
        {step === 4 && (
          <div className="px-4 py-4 space-y-4">

            {/* Payment tiles */}
            <div>
              <p className="font-black text-xs text-[#FFD700]/80 uppercase tracking-widest mb-3">{t.paymentMethod}</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentMethod("cash")}
                  className={`flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-2 transition font-black ${paymentMethod === "cash" ? "border-yellow-400 bg-yellow-400/10 shadow-[0_0_20px_rgba(255,215,0,0.15)]" : "border-white/15 bg-white/5 hover:border-white/30"}`}
                >
                  <Banknote size={30} className={paymentMethod === "cash" ? "text-yellow-400" : "text-gray-400"} />
                  <span className={`text-sm font-black ${paymentMethod === "cash" ? "text-yellow-400" : "text-white/70"}`}>Efectivo</span>
                  {paymentMethod === "cash" && <Check size={14} className="text-yellow-400" />}
                </button>
                <button
                  onClick={() => setPaymentMethod("card")}
                  className={`flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-2 transition font-black relative overflow-hidden ${paymentMethod === "card" ? "border-blue-400 bg-blue-400/15 shadow-[0_0_20px_rgba(96,165,250,0.2)]" : "border-white/15 bg-white/5 hover:border-white/30"}`}
                >
                  <CreditCard size={30} className={paymentMethod === "card" ? "text-blue-400" : "text-gray-400"} />
                  <span className={`text-sm font-black ${paymentMethod === "card" ? "text-blue-400" : "text-white/70"}`}>Tarjeta</span>
                  {paymentMethod === "card" && <Check size={14} className="text-blue-400" />}
                </button>
              </div>
              {paymentMethod === "card" && (
                <div className="mt-2 flex items-start gap-2 bg-blue-400/8 border border-blue-400/20 rounded-xl px-3 py-2.5">
                  <CreditCard size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-white/80">Visa, Mastercard, Amex — pago seguro con Stripe 🔒</p>
                </div>
              )}
            </div>

            {/* Currency selector (compact) — shown when cash selected */}
            {paymentMethod === "cash" && (
              <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-4 space-y-3">
                <p className="text-sm font-black text-white">💵 ¿En qué moneda vas a pagar?</p>
                <div className="grid grid-cols-3 gap-2">
                  {(["DOP", "USD", "EUR"] as CashCurrency[]).map(cur => {
                    const m = CURRENCY_META[cur];
                    return (
                      <button
                        key={cur}
                        onClick={() => { setCashCurrency(cur); setCashPrepared(null); }}
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 transition text-sm font-black ${
                          cashCurrency === cur
                            ? "border-yellow-400 bg-yellow-400/15 text-yellow-400"
                            : "border-white/10 bg-white/5 text-gray-400 hover:border-yellow-400/30"
                        }`}
                      >
                        <span>{m.flag}</span>
                        <span>{cur}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-white/50 text-center">
                  Al confirmar el pedido te mostraremos las opciones de cambio
                </p>
              </div>
            )}

            {/* Tip — quick selector (also shown in the tip modal before payment) */}
            <div className="rounded-2xl p-4 border border-yellow-400/20 bg-yellow-400/5">
              <p className="font-black text-white text-sm mb-1 text-center">🤝 ¿Propina al driver?</p>
              <p className="text-xs text-white/50 text-center mb-3">Opcional · 100% va al repartidor · máx RD$150</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[0, 20, 30, 50, 100].map(p => (
                  <button
                    key={p}
                    onClick={() => { setTip(p); setShowCustomTip(false); setCustomTip(""); }}
                    className={`px-4 py-2 rounded-full text-sm font-black border transition ${!showCustomTip && tip === p ? "bg-yellow-400 text-black border-yellow-400" : "border-white/20 bg-white/5 text-gray-300 hover:border-yellow-400/40"}`}
                  >
                    {p === 0 ? "No, gracias" : formatDOP(p)}
                  </button>
                ))}
                <button
                  onClick={() => { setShowCustomTip(!showCustomTip); setTip(0); }}
                  className={`px-4 py-2 rounded-full text-sm font-black border transition ${showCustomTip ? "bg-yellow-400 text-black border-yellow-400" : "border-white/20 bg-white/5 text-gray-300 hover:border-yellow-400/40"}`}
                >
                  Otra
                </button>
              </div>
              {showCustomTip && (
                <div className="mt-3 space-y-1">
                  <div className="flex items-center gap-2 max-w-xs mx-auto">
                    <span className="text-white/70 text-sm font-bold">RD$</span>
                    <Input
                      type="number"
                      placeholder="0"
                      min={0}
                      max={150}
                      value={customTip}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v || parseFloat(v) <= 150) setCustomTip(v);
                      }}
                      className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400 h-9 text-center font-black"
                    />
                  </div>
                  <p className="text-[10px] text-center text-white/30">Máximo RD$150</p>
                </div>
              )}
            </div>

            {/* Promo code */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Tag size={15} className="text-yellow-400" />
                <h3 className="font-bold text-sm">¿Tienes un código?</h3>
              </div>
              {appliedPromo ? (
                <div className="flex items-center justify-between bg-green-400/10 border border-green-400/30 rounded-xl px-3 py-2">
                  <div>
                    <p className="text-green-400 font-bold text-sm">✅ {appliedPromo.code}</p>
                    <p className="text-xs text-green-400/70">Descuento: {formatDOP(appliedPromo.discountAmount)}</p>
                  </div>
                  <button onClick={() => setAppliedPromo(null)} className="text-white/50 hover:text-white transition">
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

            {/* Final order summary */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-black text-[#FFD700]/80 uppercase tracking-widest mb-2">Resumen del pedido</p>
              <div className="flex justify-between text-sm text-white/70">
                <span>{items.length} {items.length === 1 ? "artículo" : "artículos"}</span>
                <span>{formatDOP(markedUpTotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-white/70">
                <span className="flex items-center gap-1.5">
                  {t.delivery}
                  {feeLoading && <Loader2 size={11} className="animate-spin text-yellow-400/60" />}
                  {!feeLoading && distanceKm !== null && (
                    <span className="text-[10px] text-yellow-400/60 font-bold">~{distanceKm} km</span>
                  )}
                </span>
                <span className={feeLoading ? "text-white/30" : deliveryFee > MIN_DELIVERY_FEE ? "text-orange-400 font-bold" : ""}>
                  {formatDOP(deliveryFee)}
                </span>
              </div>
              {activeTip > 0 && (
                <div className="flex justify-between text-sm text-white/70">
                  <span>Propina</span>
                  <span>{formatDOP(activeTip)}</span>
                </div>
              )}
              {promoDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-400 font-bold">
                  <span>🎟 {appliedPromo?.code}</span>
                  <span>-{formatDOP(promoDiscount)}</span>
                </div>
              )}
              <div className="border-t border-white/10 pt-2 flex justify-between font-black text-xl">
                <span>{t.total}</span>
                <span className="text-yellow-400">{formatDOP(grandTotal)}</span>
              </div>
              {/* Address + notes summary */}
              <div className="border-t border-white/5 pt-2 space-y-1 mt-1">
                {isLaundry && pickupAddress && (
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] flex-shrink-0 mt-0.5">📤</span>
                    <p className="text-xs text-white/50 leading-snug">Recogida: {pickupAddress}</p>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <MapPin size={12} className="text-yellow-400/60 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-white/50 leading-snug">{isLaundry ? `Entrega: ${address}` : address}</p>
                </div>
                {notes && (
                  <div className="flex items-start gap-2">
                    <FileText size={12} className="text-yellow-400/60 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-white/50 leading-snug line-clamp-2">{notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Change modal — matches screenshot style */}
      {showChangeModal && (() => {
        const opts = getCashOptions(grandTotal, cashCurrency);
        const exactOpt = opts[0];
        const totalLabel = formatCurrencyAmount(exactOpt.amount, cashCurrency);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
            <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                <h2 className="text-lg font-black text-gray-900 text-center">
                  Total {totalLabel}
                </h2>
                <p className="text-base font-bold text-white/80 text-center mt-0.5">¿Necesitas cambio?</p>
                {cashCurrency !== "DOP" && (
                  <p className="text-xs text-white/60 text-center mt-1">
                    Tasa aprox: 1 {cashCurrency} = {cashCurrency === "USD" ? "60" : "65"} RD$ · ({formatDOP(grandTotal)})
                  </p>
                )}
              </div>

              {/* Options */}
              <div className="divide-y divide-gray-100">
                {/* No change option */}
                <button
                  onClick={() => { setCashPrepared(exactOpt.amount); }}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-blue-50 transition text-left"
                >
                  <span className={`text-base font-semibold ${cashPrepared === exactOpt.amount || cashPrepared === null ? "text-blue-500" : "text-white/90"}`}>
                    No necesito cambio
                  </span>
                  {(cashPrepared === exactOpt.amount || cashPrepared === null) && (
                    <Check size={18} className="text-blue-500 flex-shrink-0" />
                  )}
                </button>

                {/* Bill options */}
                {opts.slice(1).map(opt => (
                  <button
                    key={opt.amount}
                    onClick={() => setCashPrepared(opt.amount)}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-blue-50 transition text-left"
                  >
                    <div>
                      <p className="text-base font-semibold text-white/90">
                        Para {formatCurrencyAmount(opt.amount, cashCurrency)}
                      </p>
                      <p className="text-sm text-white/40">
                        El driver da de vuelta {formatCurrencyAmount(opt.change, cashCurrency)}
                      </p>
                    </div>
                    {cashPrepared === opt.amount && (
                      <Check size={18} className="text-blue-500 flex-shrink-0 ml-2" />
                    )}
                  </button>
                ))}
              </div>

              {/* Cancel / OK */}
              <div className="flex border-t border-gray-100">
                <button
                  onClick={() => { setShowChangeModal(false); setCashPrepared(null); }}
                  className="flex-1 py-4 text-base font-bold text-blue-500 hover:bg-blue-50 transition border-r border-gray-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleChangeConfirm}
                  className="flex-1 py-4 text-base font-bold text-blue-500 hover:bg-blue-50 transition"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Cutlery modal */}
      {showCutleryModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowCutleryModal(false)}>
          <div
            className="w-full max-w-md bg-[#0f1c2e] border border-yellow-400/20 rounded-t-3xl p-6 pb-10 space-y-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center">
              <p className="text-4xl mb-2">🍴</p>
              <h2 className="text-xl font-black text-white">¿Necesitas cubiertos?</h2>
              <p className="text-sm text-white/60 mt-1">Cuchillo, tenedor y servilleta</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => placeOrder(true)}
                disabled={createOrder.isPending}
                className="flex flex-col items-center justify-center gap-2 py-5 rounded-2xl border-2 border-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20 transition disabled:opacity-50"
              >
                <span className="text-2xl">✅</span>
                <span className="font-black text-yellow-400 text-sm">Sí, por favor</span>
              </button>
              <button
                onClick={() => placeOrder(false)}
                disabled={createOrder.isPending}
                className="flex flex-col items-center justify-center gap-2 py-5 rounded-2xl border-2 border-white/15 bg-white/5 hover:bg-white/10 transition disabled:opacity-50"
              >
                <span className="text-2xl">🌿</span>
                <span className="font-black text-white/70 text-sm">No, gracias</span>
              </button>
            </div>
            {createOrder.isPending && (
              <div className="flex items-center justify-center gap-2 text-yellow-400 text-sm font-bold">
                <Loader2 size={16} className="animate-spin" />
                Enviando pedido...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-yellow-400/20 z-20">
        {step < 4 ? (
          <Button
            className="w-full bg-yellow-400 text-black font-black text-lg h-14 hover:bg-yellow-300 shadow-[0_0_30px_rgba(255,215,0,0.25)] flex items-center justify-between px-6 disabled:opacity-50"
            onClick={async () => {
              if (step === 3 && !address.trim()) {
                toast({ title: t.missingAddress, description: t.addressRequired, variant: "destructive" });
                return;
              }
              if (step === 3 && isLaundry && !pickupAddress.trim()) {
                toast({ title: "Dirección de recogida requerida", description: "Indica dónde recoger tu ropa", variant: "destructive" });
                return;
              }
              if (step === 3) {
                // Calculate distance-based delivery fee in background
                calculateFee(address);
              }
              setStep((step + 1) as Step);
            }}
          >
            <span className="text-yellow-400/0 text-sm">·</span>
            <span>
              {step === 1 && "Continuar"}
              {step === 2 && (notes.trim() ? "Agregar notas →" : "Continuar sin notas")}
              {step === 3 && "Elegir pago →"}
            </span>
            <ChevronRight size={20} />
          </Button>
        ) : (
          <Button
            className="w-full bg-yellow-400 text-black font-black text-lg h-14 hover:bg-yellow-300 shadow-[0_0_30px_rgba(255,215,0,0.3)] disabled:opacity-50"
            onClick={handleOrder}
            disabled={createOrder.isPending}
            data-testid="button-place-order"
          >
            {createOrder.isPending
              ? t.placing
              : paymentMethod === "card"
              ? `💳 Pagar con tarjeta · ${formatDOP(grandTotal)}`
              : `Pedir ahora · ${formatDOP(grandTotal)}`}
          </Button>
        )}
      </div>

      {/* ── Tip Modal (shown before payment) ── */}
      {showTipModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0d1c3d] rounded-t-3xl border-t border-yellow-400/20 p-6 pb-10 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-5">
              <p className="text-4xl mb-2">🤝</p>
              <h2 className="text-xl font-black text-white">¿Propina al driver?</h2>
              <p className="text-sm text-white/50 mt-1">100% va directo al repartidor · máx RD$150</p>
            </div>

            {/* Tip quick picks */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[20, 30, 50, 100].map(p => (
                <button
                  key={p}
                  onClick={() => { setTip(p); setShowCustomTip(false); setCustomTip(""); }}
                  className={`flex flex-col items-center justify-center py-4 rounded-2xl border-2 font-black transition ${!showCustomTip && tip === p ? "border-yellow-400 bg-yellow-400/15 text-yellow-400 shadow-[0_0_16px_rgba(255,215,0,0.2)]" : "border-white/15 bg-white/5 text-white/70 hover:border-yellow-400/40"}`}
                >
                  <span className="text-base">RD${p}</span>
                </button>
              ))}
            </div>

            {/* Custom amount */}
            <div className="mb-4">
              <button
                onClick={() => { setShowCustomTip(!showCustomTip); if (!showCustomTip) setTip(0); }}
                className={`w-full py-3 rounded-2xl border-2 text-sm font-bold transition ${showCustomTip ? "border-yellow-400 bg-yellow-400/10 text-yellow-400" : "border-white/15 bg-white/5 text-white/50 hover:border-white/30"}`}
              >
                {showCustomTip ? "Cantidad personalizada" : "+ Otra cantidad (máx RD$150)"}
              </button>
              {showCustomTip && (
                <div className="mt-3 flex items-center gap-3 px-2">
                  <span className="text-white/60 font-bold text-sm flex-shrink-0">RD$</span>
                  <Input
                    type="number"
                    placeholder="0"
                    min={0}
                    max={150}
                    autoFocus
                    value={customTip}
                    onChange={e => {
                      const v = e.target.value;
                      if (!v || parseFloat(v) <= 150) setCustomTip(v);
                    }}
                    className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400 h-10 text-center font-black text-lg"
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={proceedToPayment}
                className="w-full h-14 rounded-2xl font-black text-lg bg-[#FFD700] text-black flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              >
                {activeTip > 0 ? `Añadir propina ${formatDOP(activeTip)} →` : "Continuar sin propina →"}
              </button>
              <button
                onClick={() => { setTip(0); setShowCustomTip(false); setCustomTip(""); setShowTipModal(false); }}
                className="w-full h-11 rounded-2xl font-bold text-sm text-white/40 hover:text-white transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Stripe Payment Sheet ── */}
      {showStripeSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0d2057] rounded-t-3xl border-t border-blue-400/20 p-6 pb-10 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="font-black text-white text-lg">Pago seguro</p>
                <p className="text-[#FFD700] text-sm font-bold">{formatDOP(grandTotal)}</p>
              </div>
              <button onClick={() => setShowStripeSheet(false)} className="text-white/40 hover:text-white transition">
                <X size={22} />
              </button>
            </div>
            <Suspense fallback={
              <div className="flex justify-center py-10">
                <Loader2 size={28} className="animate-spin text-[#FFD700]" />
              </div>
            }>
              <StripePaymentSheet
                amountDOP={grandTotal}
                onSuccess={() => {
                  setShowStripeSheet(false);
                  if (!isLaundry) setShowCutleryModal(true);
                  else placeOrder(null);
                }}
                onCancel={() => setShowStripeSheet(false)}
              />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}
