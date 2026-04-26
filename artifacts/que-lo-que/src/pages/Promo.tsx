import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Link } from "wouter";
import { useLang } from "@/lib/lang";
import LangToggle from "@/components/LangToggle";

const logo = "/logo.png";

interface PromoData {
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  minOrder: number | null;
  isActive: boolean;
  expiresAt: string | null;
}

export default function PromoPage() {
  const [, params] = useRoute("/promo/:code");
  const code = (params as any)?.code?.toUpperCase() ?? "";
  const [, navigate] = useLocation();
  const { lang } = useLang();
  const [promo, setPromo] = useState<PromoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (!code) return;
    fetch(`/api/promo-codes/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, orderTotal: 9999 }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.valid) setPromo({ code, ...d });
        else setInvalid(true);
      })
      .catch(() => setInvalid(true))
      .finally(() => setLoading(false));
  }, [code]);

  const handleClaim = () => {
    navigate(`/register?promo=${code}`);
  };

  const handleOrder = () => {
    navigate(`/customer?promo=${code}`);
  };

  const discount = promo
    ? promo.discountType === "percent"
      ? `${promo.discountValue}% OFF`
      : `RD$${promo.discountValue} OFF`
    : "";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#040f26] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-yellow-400/40 border-t-yellow-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#040f26] text-white flex flex-col max-w-[430px] mx-auto relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-30%] left-[-20%] w-[70%] h-[70%] bg-[#0057B7]/30 rounded-full blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-yellow-400/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col flex-1">
        {/* Header */}
        <div className="px-5 pt-8 pb-4 flex items-center justify-between">
          <Link href="/"><img src={logo} alt="YaPide" className="h-10 object-contain" /></Link>
          <LangToggle />
        </div>

        {invalid ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 text-center">
            <div className="w-20 h-20 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-4xl">❌</div>
            <div>
              <h1 className="text-2xl font-black text-white">Código no válido</h1>
              <p className="text-white/60 text-sm mt-2">El código <span className="font-mono font-bold text-yellow-400">{code}</span> no existe o ya expiró.</p>
            </div>
            <Link href="/customer">
              <button className="bg-yellow-400 text-black font-black text-lg px-8 py-4 rounded-2xl hover:bg-yellow-300 transition shadow-[0_0_20px_rgba(255,215,0,0.3)]">
                {lang === "es" ? "Ir a la app →" : "Go to app →"}
              </button>
            </Link>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 text-center">
            {/* Big discount badge */}
            <div className="relative">
              <div className="w-40 h-40 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 flex flex-col items-center justify-center shadow-[0_0_60px_rgba(255,215,0,0.4)]">
                <span className="text-black font-black text-4xl leading-none">{discount}</span>
                <span className="text-black/70 text-xs font-bold mt-1">en tu pedido</span>
              </div>
              <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-[#0057B7] border-2 border-white flex items-center justify-center text-xl">🎁</div>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-black text-white leading-tight">
                {lang === "es" ? "¡Tienes un regalo!" : "You have a gift!"}
              </h1>
              <p className="text-white/70 text-sm">
                {lang === "es"
                  ? "Usa este código en tu próximo pedido en YaPide"
                  : "Use this code on your next YaPide order"}
              </p>
            </div>

            {/* Code box */}
            <div className="w-full bg-black/40 border-2 border-yellow-400/50 rounded-2xl px-6 py-5">
              <p className="text-yellow-400/70 text-xs font-bold mb-1 uppercase tracking-widest">
                {lang === "es" ? "Tu código" : "Your code"}
              </p>
              <p className="text-yellow-400 font-black text-4xl tracking-[0.25em] font-mono">{code}</p>
              {promo?.minOrder && (
                <p className="text-white/40 text-xs mt-2">
                  {lang === "es" ? `Mínimo de pedido: RD$${promo.minOrder}` : `Minimum order: RD$${promo.minOrder}`}
                </p>
              )}
              {promo?.expiresAt && (
                <p className="text-white/40 text-xs mt-1">
                  {lang === "es" ? "Expira" : "Expires"}: {new Date(promo.expiresAt).toLocaleDateString(lang === "es" ? "es-DO" : "en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              )}
            </div>

            {/* CTAs */}
            <div className="w-full space-y-3">
              <button
                onClick={handleOrder}
                className="w-full bg-yellow-400 text-black font-black text-xl py-5 rounded-2xl hover:bg-yellow-300 transition shadow-[0_0_30px_rgba(255,215,0,0.4)]"
              >
                {lang === "es" ? "🛵 Pedir ahora" : "🛵 Order now"}
              </button>
              <button
                onClick={handleClaim}
                className="w-full bg-white/10 border border-white/20 text-white font-bold text-base py-4 rounded-2xl hover:bg-white/15 transition"
              >
                {lang === "es" ? "¿Sin cuenta? Regístrate →" : "No account? Sign up →"}
              </button>
            </div>

            {/* Social proof */}
            <p className="text-white/30 text-xs">
              {lang === "es" ? "Miles de dominicanos ya piden con YaPide 🇩🇴" : "Thousands of Dominicans already use YaPide 🇩🇴"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
