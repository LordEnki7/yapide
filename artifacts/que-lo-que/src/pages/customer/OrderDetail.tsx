import { useParams, Link } from "wouter";
import { useGetOrder, getGetOrderQueryKey, useRateOrder } from "@workspace/api-client-react";
import { formatDOP } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Star, MessageCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function CustomerOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const orderId = parseInt(id, 10);
  const [driverRating, setDriverRating] = useState(5);
  const [bizRating, setBizRating] = useState(5);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLang();

  const STEPS = [
    { key: "pending", label: t.pendingStep },
    { key: "accepted", label: t.acceptedStep },
    { key: "picked_up", label: t.pickedUpStep },
    { key: "delivered", label: t.deliveredStep },
  ];

  const { data: order, isLoading } = useGetOrder(
    orderId,
    { query: { enabled: !!orderId, queryKey: getGetOrderQueryKey(orderId) } }
  );

  const rateOrder = useRateOrder({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(orderId) });
        toast({ title: t.success, description: t.sendRating });
      },
    },
  });

  const currentStep = STEPS.findIndex(s => s.key === order?.status);
  const isDelivered = order?.status === "delivered";

  if (isLoading) return (
    <div className="min-h-screen bg-background p-4 space-y-3">
      <Skeleton className="h-48 bg-white/8 rounded-2xl" />
      <Skeleton className="h-24 bg-white/8 rounded-2xl" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-white pb-8">
      <div className="bg-background border-b border-yellow-400/20 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/customer/orders">
          <button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10 transition">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <div>
          <h1 className="text-lg font-black text-yellow-400">{t.orderTitle(orderId)}</h1>
          <p className="text-xs text-gray-400">{order?.business?.name}</p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
          <h2 className="font-bold text-sm text-gray-400 mb-4 uppercase tracking-widest">{t.orderStatus}</h2>
          <div className="space-y-3">
            {STEPS.map((step, i) => {
              const isCompleted = currentStep >= i;
              const isCurrent = currentStep === i;
              return (
                <div key={step.key} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${
                    isCompleted ? "bg-yellow-400 text-black shadow-[0_0_10px_rgba(255,215,0,0.5)]" : "bg-white/10 text-gray-500"
                  }`}>
                    {isCompleted ? "✓" : i + 1}
                  </div>
                  <span className={`font-bold text-sm ${isCurrent ? "text-yellow-400" : isCompleted ? "text-white" : "text-gray-500"}`}>
                    {step.label}
                  </span>
                  {isCurrent && order?.status !== "delivered" && (
                    <span className="text-xs text-gray-400 bg-white/8 px-2 py-0.5 rounded-full ml-auto animate-pulse">...</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {order?.driver && (
          <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
            <h2 className="font-bold text-sm text-gray-400 mb-3 uppercase tracking-widest">{t.yourDriver}</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-yellow-400/20 flex items-center justify-center text-2xl">🛵</div>
                <div>
                  <p className="font-black text-white">{order.driver.user?.name ?? "Driver"}</p>
                  <div className="flex items-center gap-1 text-yellow-400">
                    <Star size={12} fill="currentColor" />
                    <span className="text-xs font-bold">{order.driver.rating?.toFixed(1)}</span>
                  </div>
                </div>
              </div>
              {order.driver.user?.phone && (
                <a href={`https://wa.me/1${order.driver.user.phone}?text=${orderId}`} target="_blank" rel="noreferrer">
                  <Button size="sm" className="bg-green-500 hover:bg-green-400 text-white font-bold gap-2">
                    <MessageCircle size={14} />
                    {t.chat}
                  </Button>
                </a>
              )}
            </div>
          </div>
        )}

        <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
          <h2 className="font-bold text-sm text-gray-400 mb-3 uppercase tracking-widest">{t.yourItems}</h2>
          {order?.items?.map((item) => (
            <div key={item.id} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
              <span className="text-sm text-gray-300">{item.quantity}x {item.productName}</span>
              <span className="text-sm font-bold text-white">{formatDOP(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="border-t border-white/10 mt-2 pt-2 flex justify-between font-black">
            <span>{t.delivery}</span>
            <span className="text-yellow-400">{formatDOP(order?.deliveryFee ?? 0)}</span>
          </div>
          <div className="flex justify-between font-black text-lg mt-1">
            <span>{t.total}</span>
            <span className="text-yellow-400">{formatDOP((order?.totalAmount ?? 0) + (order?.deliveryFee ?? 0))}</span>
          </div>
        </div>

        {isDelivered && !order?.driverRating && (
          <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-2xl p-4">
            <h2 className="font-black text-yellow-400 mb-4">{t.rateTitle}</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-300 mb-2">{t.rateDriver}</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setDriverRating(n)} className="text-2xl transition-transform hover:scale-110">
                      {n <= driverRating ? "⭐" : "☆"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-300 mb-2">{t.rateBusiness}</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setBizRating(n)} className="text-2xl transition-transform hover:scale-110">
                      {n <= bizRating ? "⭐" : "☆"}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                className="w-full bg-yellow-400 text-black font-bold hover:bg-yellow-300"
                onClick={() => rateOrder.mutate({ orderId, data: { driverRating, businessRating: bizRating } })}
                disabled={rateOrder.isPending}
              >
                {t.sendRating}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
