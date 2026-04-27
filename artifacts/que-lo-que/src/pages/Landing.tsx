import { useState } from "react";
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

const STRIPE = "linear-gradient(90deg, transparent 0%, rgba(5,30,110,0.48) 9%, rgba(5,30,110,0.48) 91%, transparent 100%)";

export default function Landing() {
  const { lang, t } = useLang();
  const [, navigate] = useLocation();
  const [showDemo, setShowDemo] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      className="bg-background text-white flex flex-col max-w-[430px] mx-auto"
      style={{ height: "100dvh", overflow: "hidden" }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-4 pb-1 shrink-0">
        <div className="text-[10px] font-black text-yellow-400/50 uppercase tracking-[0.2em]">yapide.app</div>
        <LangToggle />
      </div>

      {/* Hero — fills all remaining space between top bar and buttons */}
      <div style={{ position: "relative", flex: 1, overflow: "hidden", minHeight: 0 }}>
        <img
          src={logo}
          alt="YaPide"
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }}
        />

        {/* Tagline overlay — speed-stripe bands */}
        <div style={{ position: "absolute", top: "6%", left: 0, right: 0, display: "flex", flexDirection: "column", gap: "3px", pointerEvents: "none" }}>
          <div style={{ background: STRIPE, padding: "7px 0", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.13)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <span style={{ color: "#ffffff", fontWeight: 900, letterSpacing: "0.12em", fontSize: "clamp(1.05rem, 5vw, 1.35rem)", textShadow: "0 2px 6px rgba(0,0,0,0.5)" }}>
              {lang === "es" ? "ENTREGA" : "FAST"}
            </span>
          </div>
          <div style={{ background: STRIPE, padding: "7px 0", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.13)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <span style={{ color: "#FFD700", fontWeight: 900, fontStyle: "italic", letterSpacing: "0.12em", fontSize: "clamp(1.3rem, 6.5vw, 1.7rem)", textShadow: "0 2px 6px rgba(0,0,0,0.5)" }}>
              {lang === "es" ? "RÁPIDA" : "RELIABLE"}
            </span>
          </div>
          <div style={{ background: STRIPE, padding: "7px 0", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.13)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <span style={{ color: "#ffffff", fontWeight: 900, letterSpacing: "0.12em", fontSize: "clamp(1.05rem, 5vw, 1.35rem)", textShadow: "0 2px 6px rgba(0,0,0,0.5)" }}>
              {lang === "es" ? "Y CONFIABLE" : "DELIVERY"}
            </span>
          </div>
        </div>

        {/* Gloss highlight */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(145deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 35%, rgba(255,255,255,0) 58%)", pointerEvents: "none" }} />
        {/* Edge sheen */}
        <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(0,0,0,0.12)", pointerEvents: "none" }} />
      </div>

      {/* Bottom — CTAs + links, fixed height, no scroll */}
      <div className="shrink-0 px-5 pt-3 pb-4 space-y-2">
        <button
          onClick={() => navigate("/register")}
          className="btn-gold w-full text-black font-black text-xl h-14 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 shadow-[0_0_40px_rgba(255,215,0,0.35)]"
        >
          <UserPlus size={22} />
          {lang === "es" ? "Pedir ahora — es gratis" : "Order now — it's free"}
        </button>

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

        {/* Driver / Business + Demo — compact row */}
        <div className="flex items-center justify-center gap-4 pt-1">
          <button onClick={() => navigate("/register?role=driver")} className="text-xs text-white/35 hover:text-white/70 transition-colors">
            {lang === "es" ? "🏍️ Soy motorista" : "🏍️ I'm a driver"}
          </button>
          <span className="text-white/20 text-xs">·</span>
          <button onClick={() => navigate("/register?role=business")} className="text-xs text-white/35 hover:text-white/70 transition-colors">
            {lang === "es" ? "🏪 Tengo un negocio" : "🏪 I have a business"}
          </button>
          <span className="text-white/20 text-xs">·</span>
          <button
            onClick={() => setShowDemo(v => !v)}
            className="flex items-center gap-1 text-xs text-white/25 hover:text-white/50 transition"
          >
            {showDemo ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            Demo
          </button>
        </div>

        {showDemo && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-2">
            <p className="text-[10px] text-yellow-400/50 text-center uppercase tracking-widest">
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
