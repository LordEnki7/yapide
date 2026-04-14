import { Link } from "wouter";
import { useGetMyDriver, getGetMyDriverQueryKey, useUpdateDriverStatus, useGetDriverStats, getGetDriverStatsQueryKey } from "@workspace/api-client-react";
import { getStoredUser, formatDOP } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import LangToggle from "@/components/LangToggle";
import NotificationBell from "@/components/NotificationBell";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Zap, Wallet, Package, TrendingUp, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CASH_LIMIT = 10000;
const CASH_WARNING = 8000;

export default function DriverDashboard() {
  const user = getStoredUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLang();

  const { data: driver, isLoading: driverLoading } = useGetMyDriver({
    query: { queryKey: getGetMyDriverQueryKey() }
  });

  const { data: stats } = useGetDriverStats({
    query: { queryKey: getGetDriverStatsQueryKey() }
  });

  const updateStatus = useUpdateDriverStatus({
    mutation: {
      onSuccess: (d) => {
        queryClient.invalidateQueries({ queryKey: getGetMyDriverQueryKey() });
        toast({ title: d.isOnline ? "¡Online!" : "Offline" });
      },
      onError: () => {
        toast({ title: t.error, description: t.error, variant: "destructive" });
      }
    }
  });

  const toggleOnline = () => {
    if (!driver) return;
    updateStatus.mutate({ isOnline: !driver.isOnline });
  };

  if (driverLoading) return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      <Skeleton className="h-32 bg-white/8 rounded-2xl" />
      <Skeleton className="h-24 bg-white/8 rounded-2xl" />
    </div>
  );

  const cashWarning = (driver?.cashBalance ?? 0) >= CASH_WARNING;
  const cashLocked = (driver?.cashBalance ?? 0) >= CASH_LIMIT;

  return (
    <div className="min-h-screen bg-background text-white pb-8">
      <div className="bg-background border-b border-yellow-400/20 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest">{t.driverTitle}</p>
            <h1 className="text-2xl font-black text-yellow-400">Que Lo Que 🛵</h1>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <LangToggle />
            <div className="text-right">
              <p className="text-xs text-gray-400">{user?.name}</p>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${driver?.isOnline ? "bg-green-400 animate-pulse" : "bg-gray-500"}`} />
                <span className="text-xs font-bold">{driver?.isOnline ? t.online : t.offline}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {cashWarning && (
          <div className={`flex items-center gap-3 p-4 rounded-2xl border ${cashLocked ? "bg-red-500/20 border-red-500/50" : "bg-yellow-400/10 border-yellow-400/40"}`}>
            <AlertTriangle size={20} className={cashLocked ? "text-red-400" : "text-yellow-400"} />
            <div>
              <p className={`font-black text-sm ${cashLocked ? "text-red-400" : "text-yellow-400"}`}>
                {cashLocked ? t.cashLocked : t.cashWarning}
              </p>
              <p className="text-xs text-gray-400">
                {cashLocked ? t.cashLockedMsg : t.cashWarningMsg(formatDOP(driver?.cashBalance ?? 0))}
              </p>
            </div>
          </div>
        )}

        <div className="bg-white/8 border border-white/10 rounded-2xl p-6 text-center">
          <p className="text-gray-400 text-sm mb-4">
            {driver?.isOnline ? t.receivingOrders : t.activateToReceive}
          </p>
          <button
            onClick={toggleOnline}
            disabled={updateStatus.isPending || (cashLocked && !driver?.isOnline)}
            className={`w-32 h-32 rounded-full border-4 font-black text-lg transition-all shadow-[0_0_30px] ${
              driver?.isOnline
                ? "bg-green-400 border-green-300 text-black shadow-green-400/30 hover:bg-green-300"
                : "bg-white/8 border-yellow-400/40 text-yellow-400 shadow-transparent hover:border-yellow-400 hover:shadow-yellow-400/20"
            } disabled:opacity-50`}
          >
            {driver?.isOnline ? t.active : t.inactive}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-yellow-400" />
              <span className="text-xs text-gray-400 font-bold uppercase">{t.today}</span>
            </div>
            <p className="text-2xl font-black text-yellow-400">{formatDOP(stats?.earningsToday ?? 0)}</p>
            <p className="text-xs text-gray-400">{stats?.deliveriesToday ?? 0} {t.deliveries}</p>
          </div>
          <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet size={16} className="text-green-400" />
              <span className="text-xs text-gray-400 font-bold uppercase">{t.wallet}</span>
            </div>
            <p className="text-2xl font-black text-green-400">{formatDOP(driver?.walletBalance ?? 0)}</p>
            <p className="text-xs text-gray-400">{t.available}</p>
          </div>
        </div>

        <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-yellow-400" />
              <span className="text-sm font-bold text-white">{t.deliveryStreak}</span>
            </div>
            <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/40 text-xs">
              {driver?.totalDeliveries ?? 0} {t.total}
            </Badge>
          </div>
          <Progress value={stats?.bonusProgress ?? 0} className="h-3 mb-2 bg-white/10" />
          <p className="text-xs text-gray-400">
            {stats?.currentStreak ?? 0}/10 → {t.nextBonus(formatDOP(500))}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link href="/driver/jobs">
            <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-2xl p-4 text-center hover:bg-yellow-400/20 transition cursor-pointer">
              <Package size={24} className="text-yellow-400 mx-auto mb-2" />
              <p className="font-bold text-yellow-400 text-sm">{t.viewJobs}</p>
            </div>
          </Link>
          <Link href="/driver/wallet">
            <div className="bg-white/8 border border-white/10 rounded-2xl p-4 text-center hover:border-yellow-400/30 transition cursor-pointer">
              <Wallet size={24} className="text-gray-300 mx-auto mb-2" />
              <p className="font-bold text-gray-300 text-sm">{t.myWallet}</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
