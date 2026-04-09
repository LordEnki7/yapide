import { Link } from "wouter";
import { useGetPlatformStats, getGetPlatformStatsQueryKey, useAdminListUsers, getAdminListUsersQueryKey } from "@workspace/api-client-react";
import { formatDOP } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import LangToggle from "@/components/LangToggle";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Package, Bike, TrendingUp } from "lucide-react";

export default function AdminDashboard() {
  const { t } = useLang();
  const { data: stats, isLoading: statsLoading } = useGetPlatformStats({
    query: { queryKey: getGetPlatformStatsQueryKey() }
  });

  const { data: users, isLoading: usersLoading } = useAdminListUsers(
    {},
    { query: { queryKey: getAdminListUsersQueryKey({}) } }
  );

  const statCards = [
    { label: t.totalUsers, value: stats?.totalUsers ?? 0, icon: Users, color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/30" },
    { label: t.ordersCount, value: stats?.ordersToday ?? 0, icon: Package, color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/30" },
    { label: t.activeDrivers, value: stats?.activeDrivers ?? 0, icon: Bike, color: "text-green-400", bg: "bg-green-400/10 border-green-400/30" },
    { label: t.revenue, value: formatDOP(stats?.revenueToday ?? 0), icon: TrendingUp, color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/30", isText: true },
  ];

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="bg-black border-b border-yellow-400/20 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest">QUE LO QUE</p>
            <h1 className="text-2xl font-black text-yellow-400">{t.adminTitle}</h1>
          </div>
          <LangToggle />
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {statsLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 bg-white/5 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className={`rounded-2xl p-4 border ${card.bg}`}>
                  <Icon size={18} className={`${card.color} mb-2`} />
                  <p className={`text-2xl font-black ${card.color}`}>
                    {card.isText ? card.value : card.value.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{card.label}</p>
                </div>
              );
            })}
          </div>
        )}

        <div>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">{t.management}</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: "/admin/users", label: t.users, icon: Users },
              { href: "/admin/drivers", label: t.drivers, icon: Bike },
              { href: "/admin/businesses", label: t.businesses, icon: TrendingUp },
              { href: "/admin/orders", label: t.allOrders, icon: Package },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center hover:border-yellow-400/30 hover:bg-yellow-400/5 transition cursor-pointer">
                    <Icon size={22} className="text-yellow-400 mx-auto mb-2" />
                    <p className="font-bold text-sm">{item.label}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">{t.recentUsers}</h2>
          {usersLoading ? (
            <div className="space-y-2">
              {[1, 2].map(i => <Skeleton key={i} className="h-12 bg-white/5 rounded-xl" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {users?.slice(0, 5).map((user) => (
                <div key={user.id} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm">{user.name}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="text-xs bg-white/5 text-gray-400 border-white/10">{user.role}</Badge>
                    {user.isBanned && <Badge className="text-xs bg-red-500/20 text-red-400 border-red-500/40">{t.banned}</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
