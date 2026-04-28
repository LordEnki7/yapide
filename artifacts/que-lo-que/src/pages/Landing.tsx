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

const STRIPE = "linear-gradient(90deg, transparent 0%, rgba(5,30,110,0.48) 9%, rgba(5,30,110,0.48) 91%, transparent 100%)";

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
      {/* Full-screen background image */}
      <img
        src={logo}
        alt="YaPide"
        style={{
          position: "absolute",
          top: "110px",
          left: 0,
          right: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "top",
          display: "block",
          transform: "scale(1.05)",
          transformOrigin: "top center",
        }}
      />

      {/* Tagline overlay — speed-stripe bands */}
      <div style={{ position: "absolute", top: "9%", left: 0, right: 0, display: "flex", flexDirection: "column", gap: "3px", pointerEvents: "none" }}>
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
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(145deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 35%, rgba(255,255,255,0) 58%)", pointerEvents: "none" }} />

      {/* Top bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 20, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 8px" }}>
        <div className="text-[10px] font-black text-yellow-400/60 uppercase tracking-[0.2em]">yapide.app</div>
        <LangToggle />
      </div>

      {/* Bottom section — pinned to bottom */}
      <div
        style={{
          position: "absolute",
          bottom: "80px",
          left: 0,
          right: 0,
          zIndex: 20,
          background: "linear-gradient(to bottom, transparent 0%, rgba(2,20,70,0.82) 28%, rgba(2,15,50,0.96) 100%)",
          padding: "32px 20px 28px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
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

        {/* Secondary links row */}
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => navigate("/register?role=driver")} className="text-xs text-white/50 hover:text-white/80 transition-colors">
            {lang === "es" ? "🏍️ Soy motorista" : "🏍️ I'm a driver"}
          </button>
          <span className="text-white/20 text-xs">·</span>
          <button onClick={() => navigate("/register?role=business")} className="text-xs text-white/50 hover:text-white/80 transition-colors">
            {lang === "es" ? "🏪 Tengo un negocio" : "🏪 I have a business"}
          </button>
          <span className="text-white/20 text-xs">·</span>
          <button
            onClick={() => setShowDemo(v => !v)}
            className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition"
          >
            {showDemo ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
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
