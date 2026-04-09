import { Link } from "wouter";
import { useAdminListDrivers, getAdminListDriversQueryKey, useAdminLockDriver } from "@workspace/api-client-react";
import { formatDOP } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import LangToggle from "@/components/LangToggle";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Star, Lock, Unlock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminDrivers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLang();

  const { data: drivers, isLoading } = useAdminListDrivers({
    query: { queryKey: getAdminListDriversQueryKey() }
  });

  const lockDriver = useAdminLockDriver({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getAdminListDriversQueryKey() });
        toast({ title: t.driverUpdated });
      },
      onError: () => toast({ title: t.error, variant: "destructive" }),
    }
  });

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="bg-black border-b border-yellow-400/20 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/admin">
          <button className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <h1 className="text-xl font-black text-yellow-400">{t.drivers}</h1>
        <div className="ml-auto">
          <LangToggle />
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 bg-white/5 rounded-xl" />)}
          </div>
        ) : drivers?.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-3xl mb-2">🛵</p>
            <p>{t.noResults}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {drivers?.map((driver) => (
              <div key={driver.id} data-testid={`driver-${driver.id}`} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="font-black text-white">{driver.user?.name ?? "Driver"}</p>
                    <p className="text-xs text-gray-400">{driver.user?.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={`border text-xs ${driver.isLocked ? "bg-red-500/20 text-red-400 border-red-500/40" : driver.isOnline ? "bg-green-400/20 text-green-400 border-green-400/40" : "bg-gray-500/20 text-gray-400 border-gray-500/40"}`}>
                      {driver.isLocked ? "🔒" : driver.isOnline ? t.online : t.offline}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-yellow-400 mb-1">
                      <Star size={12} fill="currentColor" />
                      <span className="text-sm font-bold">{driver.rating?.toFixed(1) ?? "—"}</span>
                    </div>
                    <p className="text-xs text-gray-500">{t.rating}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-white">{driver.totalDeliveries ?? 0}</p>
                    <p className="text-xs text-gray-500">{t.deliveries}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-white">{formatDOP(driver.cashBalance ?? 0)}</p>
                    <p className="text-xs text-gray-500">{t.cashBalance}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className={`w-full font-bold text-xs gap-2 ${driver.isLocked ? "bg-green-500/80 hover:bg-green-500 text-white" : "bg-red-500/80 hover:bg-red-500 text-white"}`}
                  onClick={() => lockDriver.mutate({ driverId: driver.id, data: { isLocked: !driver.isLocked } })}
                  disabled={lockDriver.isPending}
                >
                  {driver.isLocked ? <><Unlock size={12} /> {t.unblock}</> : <><Lock size={12} /> {t.block}</>}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
