import { Link } from "wouter";
import { useAdminListOrders, getAdminListOrdersQueryKey } from "@workspace/api-client-react";
import { formatDOP } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import LangToggle from "@/components/LangToggle";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Clock } from "lucide-react";

export default function AdminOrders() {
  const { t } = useLang();
  const { data: orders, isLoading } = useAdminListOrders({
    query: { queryKey: getAdminListOrdersQueryKey() }
  });

  const STATUS_COLORS: Record<string, string> = {
    pending: "bg-yellow-400/20 text-yellow-400 border-yellow-400/40",
    accepted: "bg-blue-400/20 text-blue-400 border-blue-400/40",
    picked_up: "bg-purple-400/20 text-purple-400 border-purple-400/40",
    delivered: "bg-green-400/20 text-green-400 border-green-400/40",
    cancelled: "bg-red-400/20 text-red-400 border-red-400/40",
  };

  const STATUS_LABELS: Record<string, string> = {
    pending: t.statusPending,
    accepted: t.statusAccepted,
    picked_up: t.statusPickedUp,
    delivered: t.statusDelivered,
    cancelled: t.statusCancelled,
  };

  return (
    <div className="min-h-screen bg-background text-white pb-24">
      <div className="bg-background border-b border-yellow-400/20 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/admin">
          <button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10 transition">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <h1 className="text-xl font-black text-yellow-400">{t.allOrders}</h1>
        <div className="ml-auto">
          <LangToggle />
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 bg-white/8 rounded-xl" />)}
          </div>
        ) : orders?.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-3xl mb-2">📦</p>
            <p>{t.noOrdersYet}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orders?.map((order) => (
              <div key={order.id} data-testid={`admin-order-${order.id}`} className="bg-white/8 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-black text-white">#{order.id}</p>
                    <p className="text-xs text-gray-400">{order.business?.name}</p>
                  </div>
                  <Badge className={`border text-xs ${STATUS_COLORS[order.status] ?? STATUS_COLORS.pending}`}>
                    {STATUS_LABELS[order.status] ?? order.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-gray-400">
                    <Clock size={12} />
                    <span className="text-xs">{new Date(order.createdAt).toLocaleDateString()}</span>
                  </div>
                  <span className="text-yellow-400 font-black">{formatDOP(order.totalAmount)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
