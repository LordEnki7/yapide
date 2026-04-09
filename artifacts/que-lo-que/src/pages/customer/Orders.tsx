import { Link } from "wouter";
import { useListOrders, getListOrdersQueryKey } from "@workspace/api-client-react";
import { formatDOP } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, ArrowLeft } from "lucide-react";

export default function CustomerOrders() {
  const { data: orders, isLoading } = useListOrders(
    {},
    { query: { queryKey: getListOrdersQueryKey({}) } }
  );
  const { t } = useLang();

  const statusConfig = {
    pending: { label: t.statusPending, color: "bg-yellow-400/20 text-yellow-400 border-yellow-400/40", step: 1 },
    accepted: { label: t.statusAccepted, color: "bg-blue-400/20 text-blue-400 border-blue-400/40", step: 2 },
    picked_up: { label: t.statusPickedUp, color: "bg-purple-400/20 text-purple-400 border-purple-400/40", step: 3 },
    delivered: { label: t.statusDelivered, color: "bg-green-400/20 text-green-400 border-green-400/40", step: 4 },
    cancelled: { label: t.statusCancelled, color: "bg-red-400/20 text-red-400 border-red-400/40", step: 0 },
  };

  return (
    <div className="min-h-screen bg-background text-white">
      <div className="bg-background border-b border-yellow-400/20 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/customer">
          <button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10 transition">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <h1 className="text-xl font-black text-yellow-400">{t.myOrders}</h1>
      </div>

      <div className="px-4 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 bg-white/8 rounded-xl" />)}
          </div>
        ) : orders?.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">📦</p>
            <p className="text-gray-400 font-bold">{t.noOrders}</p>
            <Link href="/customer">
              <p className="text-yellow-400 mt-3 font-bold">{t.orderSomething}</p>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders?.map((order) => {
              const status = statusConfig[order.status as keyof typeof statusConfig] ?? statusConfig.pending;
              return (
                <Link key={order.id} href={`/customer/orders/${order.id}`}>
                  <div data-testid={`order-card-${order.id}`} className="bg-white/8 border border-white/10 rounded-2xl p-4 hover:border-yellow-400/30 transition cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-black text-white">{order.business?.name ?? "Negocio"}</p>
                        <p className="text-gray-400 text-xs mt-0.5 flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(order.createdAt).toLocaleDateString()} · #{order.id}
                        </p>
                      </div>
                      <Badge className={`border text-xs ${status.color}`}>{status.label}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-gray-400 text-sm">{t.items(order.items?.length ?? 0)}</p>
                      <p className="text-yellow-400 font-black">{formatDOP(order.totalAmount)}</p>
                    </div>
                    {order.status !== "cancelled" && (
                      <div className="mt-3 flex items-center gap-1">
                        {["pending", "accepted", "picked_up", "delivered"].map((s, i) => (
                          <div key={s} className={`flex-1 h-1 rounded-full transition-all ${status.step > i ? "bg-yellow-400" : "bg-white/10"}`} />
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
