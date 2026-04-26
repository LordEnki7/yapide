import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useGetPlatformStats, getGetPlatformStatsQueryKey, useAdminListUsers, getAdminListUsersQueryKey } from "@workspace/api-client-react";
import { formatDOP } from "@/lib/auth";
import { useAdminLang } from "@/lib/lang";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Package, Bike, TrendingUp, Tag, Bot, Bell, Shield, Crown, ShieldCheck, AlertCircle, Settings } from "lucide-react";
import { getEffectivePermissions, type Permission } from "@/lib/adminPermissions";

interface AdminInfo {
  id: number;
  name: string;
  email: string;
  adminRole: string | null;
  adminPermissions: Permission[] | null;
}

const ROLE_BADGE: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  owner:  { label: "Owner",  color: "bg-yellow-400/20 text-yellow-400 border-yellow-400/40", icon: <Crown size={10} /> },
  master: { label: "Master", color: "bg-purple-400/20 text-purple-400 border-purple-400/40", icon: <ShieldCheck size={10} /> },
  staff:  { label: "Staff",  color: "bg-blue-400/20 text-blue-400 border-blue-400/40",   icon: <Shield size={10} /> },
};

export default function AdminDashboard() {
  const { t } = useAdminLang();
  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null);

  const { data: stats, isLoading: statsLoading } = useGetPlatformStats({
    query: { queryKey: getGetPlatformStatsQueryKey() }
  });

  const { data: users, isLoading: usersLoading } = useAdminListUsers(
    {},
    { query: { queryKey: getAdminListUsersQueryKey({}) } }
  );

  useEffect(() => {
    fetch("/api/admin/staff/me", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setAdminInfo(d); })
      .catch(() => {});
  }, []);

  const permissions = getEffectivePermissions(adminInfo?.adminRole, JSON.stringify(adminInfo?.adminPermissions));
  const can = (p: Permission) => permissions.includes(p);

  const statCards = [
    { label: t.totalUsers,    value: stats?.totalUsers ?? 0,    icon: Users,       color: "text-blue-400",   bg: "bg-blue-400/10 border-blue-400/30" },
    { label: t.ordersCount,   value: stats?.ordersToday ?? 0,   icon: Package,     color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/30" },
    { label: t.activeDrivers, value: stats?.activeDrivers ?? 0, icon: Bike,        color: "text-green-400",  bg: "bg-green-400/10 border-green-400/30" },
    { label: t.revenue,       value: formatDOP(stats?.revenueToday ?? 0), icon: TrendingUp, color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/30", isText: true },
  ];

  const navItems = [
    { href: "/admin/users",           label: t.users,          icon: Users,       perm: "users" as Permission },
    { href: "/admin/drivers",         label: t.drivers,        icon: Bike,        perm: "drivers" as Permission },
    { href: "/admin/businesses",      label: t.businesses,     icon: TrendingUp,  perm: "businesses" as Permission },
    { href: "/admin/orders",          label: t.allOrders,      icon: Package,     perm: "orders" as Permission },
    { href: "/admin/promo-codes",     label: "Códigos Promo",  icon: Tag,         perm: "promo_codes" as Permission },
    { href: "/admin/notifications",   label: "Notificaciones", icon: Bell,        perm: "notifications" as Permission },
    { href: "/admin/staff",           label: "Staff",          icon: Shield,      perm: "staff" as Permission },
    { href: "/admin/disputes",        label: "Disputas",       icon: AlertCircle, perm: "orders" as Permission },
    { href: "/admin/settings",        label: "Configuración",  icon: Settings,    perm: "staff" as Permission },
  ].filter(item => can(item.perm));

  const roleCfg = ROLE_BADGE[adminInfo?.adminRole ?? "staff"] ?? ROLE_BADGE.staff;

  return (
    <div className="min-h-screen bg-background text-white pb-24">
      <div className="bg-background border-b border-yellow-400/20 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest">YAPIDE</p>
            <h1 className="text-2xl font-black text-yellow-400">{t.adminTitle}</h1>
          </div>
          {adminInfo && (
            <div className="flex flex-col items-end gap-1">
              <Badge className={`border flex items-center gap-1 ${roleCfg.color}`}>
                {roleCfg.icon} {roleCfg.label}
              </Badge>
              <p className="text-[10px] text-gray-500 truncate max-w-[140px]">{adminInfo.name}</p>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* Command Center CTA — only if permitted */}
        {can("command_center") && (
          <Link href="/admin/command-center">
            <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-2xl p-4 flex items-center justify-between hover:bg-yellow-400/15 transition cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-400/20 flex items-center justify-center">
                  <Bot size={20} className="text-yellow-400" />
                </div>
                <div>
                  <p className="font-black text-yellow-400">Command Center</p>
                  <p className="text-xs text-gray-400">6 agentes de IA · Monitoreo en vivo</p>
                </div>
              </div>
              <span className="text-yellow-400 font-black text-lg">→</span>
            </div>
          </Link>
        )}

        {/* Stats — only if dashboard permission */}
        {can("dashboard") && (
          statsLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 bg-white/8 rounded-2xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {statCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className={`rounded-2xl p-4 border ${card.bg}`}>
                    <Icon size={18} className={`${card.color} mb-2`} />
                    <p className={`text-2xl font-black ${card.color}`}>
                      {card.isText ? card.value : (card.value as number).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{card.label}</p>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Navigation grid — permission-filtered */}
        {navItems.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">{t.management}</h2>
            <div className="grid grid-cols-2 gap-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}>
                    <div className="bg-white/8 border border-white/10 rounded-2xl p-4 text-center hover:border-yellow-400/30 hover:bg-yellow-400/5 transition cursor-pointer">
                      <Icon size={22} className="text-yellow-400 mx-auto mb-2" />
                      <p className="font-bold text-sm">{item.label}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent users — only if users permission */}
        {can("users") && (
          <div>
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">{t.recentUsers}</h2>
            {usersLoading ? (
              <div className="space-y-2">
                {[1, 2].map(i => <Skeleton key={i} className="h-12 bg-white/8 rounded-xl" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {users?.slice(0, 5).map((user) => (
                  <div key={user.id} className="bg-white/8 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">{user.name}</p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="text-xs bg-white/8 text-gray-400 border-white/10">{user.role}</Badge>
                      {user.isBanned && <Badge className="text-xs bg-red-500/20 text-red-400 border-red-500/40">{t.banned}</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* No permissions state */}
        {navItems.length === 0 && !can("dashboard") && !can("command_center") && (
          <div className="text-center py-20">
            <p className="text-5xl mb-3">🔒</p>
            <p className="text-white font-bold mb-1">Acceso restringido</p>
            <p className="text-gray-400 text-sm">No tienes permisos asignados todavía. Contacta al dueño de la cuenta.</p>
          </div>
        )}
      </div>
    </div>
  );
}
