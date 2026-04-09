import { Link } from "wouter";
import { useGetMyBusiness, getGetMyBusinessQueryKey, useUpdateBusiness, useGetBusinessStats, getGetBusinessStatsQueryKey } from "@workspace/api-client-react";
import { formatDOP, getStoredUser } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import LangToggle from "@/components/LangToggle";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, ChefHat, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function BusinessDashboard() {
  const user = getStoredUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLang();

  const { data: business, isLoading: bizLoading } = useGetMyBusiness({
    query: { queryKey: getGetMyBusinessQueryKey() }
  });

  const { data: stats } = useGetBusinessStats({
    query: { queryKey: getGetBusinessStatsQueryKey() }
  });

  const updateStatus = useUpdateBusiness({
    mutation: {
      onSuccess: (b) => {
        queryClient.invalidateQueries({ queryKey: getGetMyBusinessQueryKey() });
        toast({ title: b.isOpen ? t.open : t.closed });
      }
    }
  });

  if (bizLoading) return (
    <div className="min-h-screen bg-black p-4 space-y-4">
      <Skeleton className="h-32 bg-white/5 rounded-2xl" />
      <Skeleton className="h-24 bg-white/5 rounded-2xl" />
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {business?.imageUrl && (
        <div className="relative h-44">
          <img src={business.imageUrl} alt={business.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black to-black/30" />
          <div className="absolute top-4 right-4">
            <LangToggle />
          </div>
        </div>
      )}

      <div className={`px-4 py-4 ${business?.imageUrl ? "-mt-6 relative" : ""}`}>
        {!business?.imageUrl && (
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest">{t.businessPanel}</p>
              <h1 className="text-xl font-black text-yellow-400">{business?.name}</h1>
            </div>
            <LangToggle />
          </div>
        )}

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              {business?.imageUrl && <h1 className="text-2xl font-black text-white mb-1">{business.name}</h1>}
              <p className="text-sm text-gray-400 font-bold">{t.businessPanel}</p>
              <p className="text-xs text-gray-500">{business?.address}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className={`border text-sm font-bold px-3 py-1 ${business?.isOpen ? "bg-green-400/20 text-green-400 border-green-400/40" : "bg-gray-500/20 text-gray-400 border-gray-500/40"}`}>
                {business?.isOpen ? t.open : t.closed}
              </Badge>
              <Button
                size="sm"
                onClick={() => updateStatus.mutate({ businessId: business!.id, data: { isOpen: !business?.isOpen } })}
                disabled={updateStatus.isPending}
                className={`text-xs font-bold ${business?.isOpen ? "bg-red-500/80 hover:bg-red-500 text-white" : "bg-green-500/80 hover:bg-green-500 text-white"}`}
              >
                {business?.isOpen ? t.close : t.open}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
            <p className="text-xl font-black text-yellow-400">{formatDOP(stats?.salesToday ?? 0)}</p>
            <p className="text-xs text-gray-400 mt-1">{t.salesToday}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
            <p className="text-xl font-black text-yellow-400">{stats?.ordersToday ?? 0}</p>
            <p className="text-xs text-gray-400 mt-1">{t.ordersToday}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
            <p className="text-xl font-black text-yellow-400">⭐{business?.rating?.toFixed(1) ?? "—"}</p>
            <p className="text-xs text-gray-400 mt-1">{t.rating}</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-yellow-400" />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t.thisWeekSales}</span>
          </div>
          <p className="text-2xl font-black text-yellow-400">{formatDOP(stats?.salesWeek ?? 0)}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link href="/business/orders">
            <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-2xl p-4 text-center hover:bg-yellow-400/20 transition cursor-pointer">
              <Package size={24} className="text-yellow-400 mx-auto mb-2" />
              <p className="font-bold text-yellow-400 text-sm">{t.orders}</p>
              {(stats?.pendingOrders ?? 0) > 0 && (
                <Badge className="bg-yellow-400 text-black text-xs mt-1">{t.newOrders(stats!.pendingOrders)}</Badge>
              )}
            </div>
          </Link>
          <Link href="/business/menu">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center hover:border-yellow-400/30 transition cursor-pointer">
              <ChefHat size={24} className="text-gray-300 mx-auto mb-2" />
              <p className="font-bold text-gray-300 text-sm">{t.menu}</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
