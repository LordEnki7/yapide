import { Link } from "wouter";
import { useListOrders, getListOrdersQueryKey, useUpdateOrderStatus } from "@workspace/api-client-react";
import { formatDOP } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import LangToggle from "@/components/LangToggle";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function BusinessOrders() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLang();

  const { data: orders, isLoading } = useListOrders(
    {},
    { query: { queryKey: getListOrdersQueryKey({}) } }
  );

  const updateStatus = useUpdateOrderStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({}) });
      },
      onError: () => toast({ title: t.error, variant: "destructive" }),
    }
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
        <Link href="/business">
          <button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10 transition">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <h1 className="text-xl font-black text-yellow-400">{t.orderMgmt}</h1>
        <div className="ml-auto">
          <LangToggle />
        </div>
      </div>

      <div className="px-4 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-36 bg-white/8 rounded-2xl" />)}
          </div>
        ) : orders?.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-gray-400 font-bold">{t.noOrdersYet}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders?.map((order) => (
              <div key={order.id} data-testid={`business-order-${order.id}`} className="bg-white/8 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-black text-white">#{order.id}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <Clock size={10} />
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <Badge className={`border text-xs ${STATUS_COLORS[order.status] ?? STATUS_COLORS.pending}`}>
                    {STATUS_LABELS[order.status] ?? order.status}
                  </Badge>
                </div>

                <div className="border-t border-white/5 py-2 mb-3">
                  {order.items?.slice(0, 3).map(item => (
                    <p key={item.id} className="text-sm text-gray-300">
                      {item.quantity}x {item.productName}
                    </p>
                  ))}
                  {(order.items?.length ?? 0) > 3 && (
                    <p className="text-xs text-gray-500">+{(order.items?.length ?? 0) - 3} más</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-yellow-400 font-black">{formatDOP(order.totalAmount)}</span>
                  <div className="flex gap-2">
                    {order.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500/40 text-red-400 hover:bg-red-500/20 font-bold text-xs h-8"
                          onClick={() => updateStatus.mutate({ orderId: order.id, data: { status: "cancelled" } })}
                          disabled={updateStatus.isPending}
                        >
                          {t.reject}
                        </Button>
                        <Button
                          size="sm"
                          className="bg-yellow-400 text-black font-bold text-xs h-8 hover:bg-yellow-300"
                          onClick={() => updateStatus.mutate({ orderId: order.id, data: { status: "accepted" } })}
                          disabled={updateStatus.isPending}
                        >
                          {t.accept}
                        </Button>
                      </>
                    )}
                    {order.status === "accepted" && (
                      <Badge className="bg-blue-400/20 text-blue-400 border-blue-400/40 text-xs">{t.preparing}</Badge>
                    )}
                    {order.status === "picked_up" && (
                      <Badge className="bg-purple-400/20 text-purple-400 border-purple-400/40 text-xs">{t.driverOnWay}</Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
