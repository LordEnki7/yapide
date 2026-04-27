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
    <div className="min-h-screen bg-background text-white flex flex-col max-w-[430px] mx-auto">

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-5 pb-1">
        <div className="text-[10px] font-black text-yellow-400/50 uppercase tracking-[0.2em]">yapide.app</div>
        <LangToggle />
      </div>

      {/* Hero */}
      <div className="flex flex-col items-center px-6 pt-4 pb-2">
        <div className="flex flex-col items-center" style={{ gap: 0 }}>
          <p className="m-0 font-black text-center" style={{ fontSize: "clamp(56px, 15vw, 72px)", letterSpacing: "-2px", lineHeight: 1 }}>
            <span style={{ color: "#6be832" }}>Ya</span>
            <span className="text-white">Pide</span>
          </p>
          <img src={logo} alt="" style={{ width: "clamp(200px, 60vw, 280px)", display: "block", marginTop: "8px", filter: "drop-shadow(0 4px 24px rgba(0,0,0,0.5))" }} />
        </div>

      </div>

      {/* Primary CTAs */}
      <div className="px-5 space-y-3 mt-auto">
        <button
          onClick={() => navigate("/register")}
          className="btn-gold w-full text-black font-black text-xl h-16 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 shadow-[0_0_40px_rgba(255,215,0,0.35)]"
        >
          <UserPlus size={22} />
          {lang === "es" ? "Pedir ahora — es gratis" : "Order now — it's free"}
        </button>

        <button
          onClick={() => navigate("/login")}
          className="w-full glass text-white font-bold text-base h-12 rounded-2xl hover:brightness-125 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <LogIn size={17} />
          {lang === "es" ? "Ya tengo cuenta — Entrar" : "I have an account — Log in"}
        </button>
      </div>

      {error && (
        <p className="mx-5 mt-3 text-center text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          ⚠️ {error}
        </p>
      )}

      {/* Driver / Business subtle links */}
      <div className="px-5 pt-5 pb-2 flex items-center justify-center gap-5">
        <button
          onClick={() => navigate("/register?role=driver")}
          className="text-xs text-white/35 hover:text-white/70 transition-colors"
        >
          {lang === "es" ? "🏍️ Soy motorista" : "🏍️ I'm a driver"}
        </button>
        <span className="text-white/20 text-xs">·</span>
        <button
          onClick={() => navigate("/register?role=business")}
          className="text-xs text-white/35 hover:text-white/70 transition-colors"
        >
          {lang === "es" ? "🏪 Tengo un negocio" : "🏪 I have a business"}
        </button>
      </div>

      {/* Demo toggle */}
      <div className="px-5 pb-8">
        <button
          onClick={() => setShowDemo(v => !v)}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-white/25 hover:text-white/50 transition py-1.5"
        >
          {showDemo ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          {lang === "es" ? "Entrar sin cuenta (demo)" : "Enter without account (demo)"}
        </button>

        {showDemo && (
          <div className="mt-2 bg-white/5 border border-white/10 rounded-2xl p-3 space-y-2">
            <p className="text-[10px] text-yellow-400/50 text-center uppercase tracking-widest mb-1">
              {lang === "es" ? "Cuentas de prueba" : "Test accounts"}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ROLES.map(role => (
                <button
                  key={role.key}
                  onClick={() => handleDemoLogin(role.key)}
                  disabled={!!demoLoading}
                  className="flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition active:scale-95 disabled:opacity-50"
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
