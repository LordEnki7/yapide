import { useState } from "react";
import { setStoredUser, setActiveRole } from "@/lib/auth";
import LangToggle from "@/components/LangToggle";
import { useLang } from "@/lib/lang";
import { Loader2 } from "lucide-react";

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
    bg: "from-yellow-400/25 to-yellow-400/5",
    border: "border-yellow-400/50",
    activeBg: "bg-yellow-400",
    textActive: "text-black",
    glow: "shadow-[0_0_40px_rgba(255,215,0,0.35)]",
  },
  {
    key: "driver" as const,
    emoji: "🏍️",
    label: "Soy Motorista",
    labelEn: "I'm a Driver",
    sub: "Gana dinero haciendo deliveries",
    subEn: "Earn money making deliveries",
    bg: "from-blue-400/20 to-blue-400/5",
    border: "border-blue-400/40",
    activeBg: "bg-blue-500",
    textActive: "text-white",
    glow: "shadow-[0_0_40px_rgba(59,130,246,0.3)]",
  },
  {
    key: "business" as const,
    emoji: "🏪",
    label: "Soy Negocio",
    labelEn: "I'm a Business",
    sub: "Vende y recibe pedidos online",
    subEn: "Sell and receive orders online",
    bg: "from-green-400/20 to-green-400/5",
    border: "border-green-400/40",
    activeBg: "bg-green-500",
    textActive: "text-white",
    glow: "shadow-[0_0_40px_rgba(34,197,94,0.3)]",
  },
];

export default function Landing() {
  const { lang, t } = useLang();
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleEnter = async (role: "customer" | "driver" | "business") => {
    setSelected(role);
    setLoading(role);
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
      setLoading(null);
      setSelected(null);
    }
  };


  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      {/* Header strip */}
      <div className="flex items-center justify-between px-5 pt-5">
        <div className="text-[10px] font-black text-yellow-400/60 uppercase tracking-[0.2em]">yapide.app</div>
        <LangToggle />
      </div>

      {/* Hero logo section */}
      <div className="flex flex-col items-center pt-8 pb-6 px-6">
        <img
          src={logo}
          alt="YaPide"
          className="w-44 object-contain drop-shadow-[0_0_40px_rgba(255,215,0,0.4)] mb-4"
        />
        <h1 className="text-3xl font-black text-white text-center leading-tight tracking-tight">
          {t.heroLine1}
          <br />
          <span className="text-yellow-400">{t.heroLine2}</span>
        </h1>
        <p className="text-[#FFD700] font-medium text-sm mt-2 text-center">{t.howToEnter}</p>
      </div>

      {/* Role picker cards */}
      <div className="flex-1 px-5 space-y-3 pb-4">
        {ROLES.map(role => {
          const isLoading = loading === role.key;
          const isActive = selected === role.key;
          return (
            <button
              key={role.key}
              onClick={() => !loading && handleEnter(role.key)}
              disabled={!!loading}
              className={`w-full rounded-2xl border-2 p-5 text-left transition-all duration-200 relative overflow-hidden
                bg-gradient-to-br ${role.bg} ${role.border}
                ${isActive ? `${role.glow} scale-[0.98]` : "hover:scale-[0.99] active:scale-[0.97]"}
                disabled:opacity-60`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0 transition-all
                  ${isActive ? `${role.activeBg} ${role.glow}` : "bg-white/8"}`}>
                  {isLoading ? <Loader2 size={22} className={`animate-spin ${role.textActive}`} /> : role.emoji}
                </div>
                <div className="flex-1">
                  <p className="font-black text-xl text-white leading-tight">
                    {lang === "es" ? role.label : role.labelEn}
                  </p>
                  <p className="text-[#FFD700] text-sm mt-0.5 font-medium">
                    {lang === "es" ? role.sub : role.subEn}
                  </p>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all
                  ${isActive ? `${role.activeBg}` : "bg-white/10"}`}>
                  <span className="text-sm font-black">→</span>
                </div>
              </div>
            </button>
          );
        })}

        {/* Cities badge row */}
        <div className="pt-2">
          <p className="text-center text-[10px] text-[#FFD700]/70 uppercase tracking-widest mb-2">
            {lang === "es" ? "Disponible en" : "Available in"}
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {["Santo Domingo", "Santiago", "La Romana", "San Pedro", "Puerto Plata", "Sosúa", "Cabarete"].map(city => (
              <span key={city} className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/5 border border-yellow-400/20 text-[#FFD700]/80">
                📍 {city}
              </span>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-center text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            ⚠️ {error}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 pb-6 text-center">
        <p className="text-xs text-white/50">{t.demoDisclaimer}</p>
      </div>
    </div>
  );
}
