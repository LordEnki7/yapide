import { setActiveRole, getActiveRole, type AppRole } from "@/lib/auth";

const ROLES: { id: AppRole; emoji: string; label: string; sublabel: string; href: string }[] = [
  { id: "customer", emoji: "🛒", label: "Cliente", sublabel: "Pide comida y más", href: "/customer" },
  { id: "driver", emoji: "🛵", label: "Driver", sublabel: "Reparte y gana dinero", href: "/driver" },
  { id: "business", emoji: "🏪", label: "Negocio", sublabel: "Administra tu tienda", href: "/business" },
];

interface RoleSwitcherProps {
  currentRole: AppRole;
}

export default function RoleSwitcher({ currentRole }: RoleSwitcherProps) {
  const handleSwitch = (role: AppRole, href: string) => {
    if (role === currentRole) return;
    setActiveRole(role);
    window.location.href = href;
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-white/5">
        <p className="text-xs font-black text-[#FFD700] uppercase tracking-widest">Cambiar modo</p>
        <p className="text-xs text-white/70 mt-0.5">Una cuenta, todos los modos</p>
      </div>
      <div className="divide-y divide-white/5">
        {ROLES.map((role) => {
          const isActive = role.id === currentRole;
          return (
            <button
              key={role.id}
              onClick={() => handleSwitch(role.id, role.href)}
              className={`w-full flex items-center gap-4 px-4 py-4 transition text-left ${
                isActive
                  ? "bg-yellow-400/8"
                  : "hover:bg-white/5"
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 transition ${
                isActive
                  ? "bg-yellow-400/20 border border-yellow-400/40"
                  : "bg-white/8 border border-white/10"
              }`}>
                {role.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-black text-base leading-tight ${isActive ? "text-yellow-400" : "text-white"}`}>
                  {role.label}
                </p>
                <p className="text-xs text-white/60 mt-0.5">{role.sublabel}</p>
              </div>
              {isActive ? (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_6px_rgba(255,215,0,0.8)]" />
                  <span className="text-xs font-black text-yellow-400">Activo</span>
                </div>
              ) : (
                <span className="text-[#FFD700] text-sm flex-shrink-0">→</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
