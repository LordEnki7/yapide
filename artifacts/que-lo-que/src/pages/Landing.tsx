import { useState } from "react";
import { useLocation } from "wouter";
import { setStoredUser, setActiveRole } from "@/lib/auth";
import LangToggle from "@/components/LangToggle";
import { useLang } from "@/lib/lang";
import { Loader2, LogIn, UserPlus, ChevronDown, ChevronUp } from "lucide-react";

const logo = "/logo.png";
const API = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

const ROLES = [
  {
    key: "customer" as const,
    emoji: "🛵",
    label: "Soy Cliente",
    labelEn: "I'm a Customer",
    sub: "Pide comida, mandados y más",
    subEn: "Order food, errands & more",
    activeBg: "bg-yellow-400/25",
    glow: "shadow-[0_0_40px_rgba(255,215,0,0.4)]",
    dot: "bg-yellow-400",
    activeBorderColor: "rgba(255,215,0,0.6)",
  },
  {
    key: "driver" as const,
    emoji: "🏍️",
    label: "Soy Motorista",
    labelEn: "I'm a Driver",
    sub: "Gana dinero haciendo deliveries",
    subEn: "Earn money making deliveries",
    activeBg: "bg-blue-400/25",
    glow: "shadow-[0_0_40px_rgba(96,165,250,0.4)]",
    dot: "bg-blue-400",
    activeBorderColor: "rgba(96,165,250,0.6)",
  },
  {
    key: "business" as const,
    emoji: "🏪",
    label: "Soy Negocio",
    labelEn: "I'm a Business",
    sub: "Vende y recibe pedidos online",
    subEn: "Sell and receive orders online",
    activeBg: "bg-green-400/25",
    glow: "shadow-[0_0_40px_rgba(74,222,128,0.4)]",
    dot: "bg-green-400",
    activeBorderColor: "rgba(74,222,128,0.6)",
  },
];

export default function Landing() {
  const { lang, t } = useLang();
  const [, navigate] = useLocation();
  const [selected, setSelected] = useState<string | null>(null);
  const [showDemo, setShowDemo] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRoleSelect = (role: "customer" | "driver" | "business") => {
    setSelected(role);
  };

  const handleCreateAccount = () => {
    const role = selected ?? "customer";
    navigate(`/register?role=${role}`);
  };

  const handleDemoLogin = async (role: "customer" | "driver" | "business") => {
    setDemoLoading(role);
    setError(null);
    try {
      await fetch(`${API}/api/demo/seed`, { method: "POST", credentials: "include" });
      const res = await fetch(`${API}/api/demo/login?role=${role}`, {
        method: "POST",
        credentials: "include",
      });
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
    <div className="min-h-screen bg-background text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5">
        <div className="text-[10px] font-black text-yellow-400/60 uppercase tracking-[0.2em]">yapide.app</div>
        <LangToggle />
      </div>

      {/* Hero */}
      <div className="flex flex-col items-center pt-6 pb-5 px-6">
        <img
          src={logo}
          alt="YaPide"
          className="w-56 object-contain drop-shadow-[0_0_40px_rgba(255,215,0,0.4)] mb-3"
        />
        <h1 className="text-3xl font-black text-white text-center leading-tight tracking-tight">
          {t.heroLine1}
          <br />
          <span className="text-yellow-400">{t.heroLine2}</span>
        </h1>
        <p className="text-[#FFD700]/80 font-medium text-sm mt-2 text-center">
          {lang === "es" ? "¿Cómo vas a usar YaPide?" : "How will you use YaPide?"}
        </p>
      </div>

      {/* Role picker */}
      <div className="px-5 space-y-2.5 pb-4">
        {ROLES.map(role => {
          const isActive = selected === role.key;
          return (
            <button
              key={role.key}
              onClick={() => handleRoleSelect(role.key)}
              className={`w-full rounded-2xl p-4 text-left transition-all duration-150 relative glass
                ${isActive ? `${role.glow} scale-[0.985] border-[${role.border}]` : "hover:scale-[0.995] active:scale-[0.98] hover:brightness-110"}`}
              style={isActive ? { borderColor: role.activeBorderColor } : {}}
            >
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 transition-all
                  ${isActive ? role.activeBg : "bg-white/8"}`}>
                  {role.emoji}
                </div>
                <div className="flex-1">
                  <p className="font-black text-lg text-white leading-tight">
                    {lang === "es" ? role.label : role.labelEn}
                  </p>
                  <p className="text-[#FFD700]/80 text-xs mt-0.5">
                    {lang === "es" ? role.sub : role.subEn}
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                  ${isActive ? `${role.dot} border-transparent` : "border-white/20 bg-transparent"}`}>
                  {isActive && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Primary CTAs */}
      <div className="px-5 space-y-3 pb-3">
        <button
          onClick={handleCreateAccount}
          className="btn-gold w-full text-black font-black text-lg h-14 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <UserPlus size={20} />
          {lang === "es" ? "Crear cuenta gratis" : "Create free account"}
        </button>

        <button
          onClick={() => navigate("/login")}
          className="w-full glass text-white font-black text-base h-12 rounded-2xl hover:brightness-125 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <LogIn size={18} />
          {lang === "es" ? "Ya tengo cuenta — Entrar" : "I have an account — Log in"}
        </button>
      </div>

      {/* Cities */}
      <div className="px-5 pb-3">
        <div className="flex flex-wrap gap-1.5 justify-center">
          {["Santo Domingo", "Santiago", "La Romana", "San Pedro", "Puerto Plata", "Sosúa", "Cabarete"].map(city => (
            <span key={city} className="text-[10px] font-bold px-2 py-1 rounded-full bg-white/5 border border-yellow-400/20 text-[#FFD700]/70">
              📍 {city}
            </span>
          ))}
        </div>
      </div>

      {error && (
        <p className="mx-5 text-center text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          ⚠️ {error}
        </p>
      )}

      {/* Demo toggle — for testing only */}
      <div className="px-5 pb-6 mt-auto">
        <button
          onClick={() => setShowDemo(v => !v)}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-[#FFD700]/60 hover:text-[#FFD700] transition py-2"
        >
          {showDemo ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {lang === "es" ? "Entrar sin cuenta (demo)" : "Enter without account (demo)"}
        </button>

        {showDemo && (
          <div className="mt-2 bg-white/5 border border-white/10 rounded-2xl p-3 space-y-2">
            <p className="text-[10px] text-[#FFD700]/70 text-center uppercase tracking-widest mb-1">
              {lang === "es" ? "Cuentas de prueba" : "Test accounts"}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map(role => (
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
                    {role.key === "customer" ? (lang === "es" ? "Cliente" : "Customer")
                     : role.key === "driver" ? (lang === "es" ? "Motorista" : "Driver")
                     : (lang === "es" ? "Negocio" : "Business")}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[9px] text-white/25 text-center">{t.demoDisclaimer}</p>
          </div>
        )}
      </div>
    </div>
  );
}
