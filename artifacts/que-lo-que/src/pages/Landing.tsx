import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { setStoredUser, setActiveRole } from "@/lib/auth";
import LangToggle from "@/components/LangToggle";
import { useLang } from "@/lib/lang";
import { Loader2, LogIn, UserPlus, ChevronDown, ChevronUp } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";

const logo = "/logo.png";
const API = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

const DEMO_ROLES = [
  { key: "customer" as const, emoji: "🛵", label: "Cliente", labelEn: "Customer" },
  { key: "driver" as const, emoji: "🏍️", label: "Motorista", labelEn: "Driver" },
  { key: "business" as const, emoji: "🏪", label: "Negocio", labelEn: "Business" },
];

export default function Landing() {
  const { lang, t } = useLang();
  const [, navigate] = useLocation();
  const [showDemo, setShowDemo] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const body = document.body;
    const root = document.getElementById("root");
    const prevBody = body.style.overflow;
    const prevRoot = root?.style.overflow ?? "";
    body.style.overflow = "hidden";
    if (root) root.style.overflow = "hidden";
    return () => {
      body.style.overflow = prevBody;
      if (root) root.style.overflow = prevRoot;
    };
  }, []);

  const handleDemoLogin = async (role: "customer" | "driver" | "business") => {
    setDemoLoading(role);
    setError(null);
    try {
      await apiFetch(`${API}/api/demo/seed`, { method: "POST" });
      const res = await apiFetch(`${API}/api/demo/login?role=${role}`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al entrar");
      }
      const { user } = await res.json();
      setStoredUser(user);
      setActiveRole(role);
      window.location.href = `/${role === "business" ? "business" : role === "driver" ? "driver" : "customer"}`;
    } catch (err: any) {
      setError(err.message ?? "Error de conexión");
      setDemoLoading(null);
    }
  };

  return (
    <div
      className="max-w-[430px] mx-auto"
      style={{ position: "relative", height: "100svh", overflow: "hidden", background: "#076BE5" }}
    >
      {/* Hero image — starts below the top bar so YaPide wordmark is fully visible */}
      <img
        src={logo}
        alt="YaPide"
        style={{
          position: "absolute",
          top: "48px",
          left: 0,
          right: 0,
          width: "100%",
          height: "calc(100% - 48px)",
          objectFit: "contain",
          objectPosition: "top center",
          display: "block",
        }}
      />

      {/* Top bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 20, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 8px" }}>
        <div className="text-[10px] font-black text-yellow-400/60 uppercase tracking-[0.2em]">yapide.app</div>
        <LangToggle />
      </div>

      {/* Bottom section — pinned to bottom */}
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          left: 0,
          right: 0,
          zIndex: 20,
          background: "linear-gradient(to bottom, transparent 0%, rgba(2,18,65,0.88) 22%, rgba(1,12,45,0.97) 100%)",
          padding: "36px 24px 28px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {/* Primary CTA */}
        <button
          onClick={() => navigate("/register")}
          className="btn-gold w-full text-black font-black text-xl h-14 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 shadow-[0_0_40px_rgba(255,215,0,0.35)]"
        >
          <UserPlus size={22} />
          {lang === "es" ? "Pedir ahora — es gratis" : "Order now — it's free"}
        </button>

        {/* Login */}
        <button
          onClick={() => navigate("/login")}
          className="w-full glass text-white font-bold text-base h-11 rounded-2xl hover:brightness-125 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <LogIn size={17} />
          {lang === "es" ? "Ya tengo cuenta — Entrar" : "I have an account — Log in"}
        </button>

        {error && (
          <p className="text-center text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-2">
            ⚠️ {error}
          </p>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 px-1">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-white/30 font-medium tracking-wider uppercase">
            {lang === "es" ? "¿Eres profesional?" : "Are you a pro?"}
          </span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Role cards */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate("/register?role=driver")}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 active:scale-[0.97] transition-all"
          >
            <span className="text-2xl">🏍️</span>
            <div className="text-left">
              <p className="text-white font-bold text-sm leading-tight">
                {lang === "es" ? "Motorista" : "Driver"}
              </p>
              <p className="text-white/45 text-xs leading-tight">
                {lang === "es" ? "Gana entregando" : "Earn delivering"}
              </p>
            </div>
          </button>
          <button
            onClick={() => navigate("/register?role=business")}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 active:scale-[0.97] transition-all"
          >
            <span className="text-2xl">🏪</span>
            <div className="text-left">
              <p className="text-white font-bold text-sm leading-tight">
                {lang === "es" ? "Negocio" : "Business"}
              </p>
              <p className="text-white/45 text-xs leading-tight">
                {lang === "es" ? "Vende más" : "Sell more"}
              </p>
            </div>
          </button>
        </div>

        {/* Demo — subtle */}
        <div className="flex justify-center">
          <button
            onClick={() => setShowDemo(v => !v)}
            className="flex items-center gap-1 text-xs text-white/25 hover:text-white/50 transition py-1"
          >
            {showDemo ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            Demo
          </button>
        </div>

        {showDemo && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-2">
            <p className="text-[10px] text-yellow-400/60 text-center uppercase tracking-widest">
              {lang === "es" ? "Cuentas de prueba" : "Test accounts"}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ROLES.map(role => (
                <button
                  key={role.key}
                  onClick={() => handleDemoLogin(role.key)}
                  disabled={!!demoLoading}
                  className="flex flex-col items-center gap-1 py-2 px-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition active:scale-95 disabled:opacity-50"
                >
                  {demoLoading === role.key
                    ? <Loader2 size={18} className="animate-spin text-white/60" />
                    : <span className="text-lg">{role.emoji}</span>
                  }
                  <span className="text-[10px] text-white/60 font-bold">
                    {lang === "es" ? role.label : role.labelEn}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[9px] text-white/20 text-center">{t.demoDisclaimer}</p>
          </div>
        )}
      </div>
    </div>
  );
}
