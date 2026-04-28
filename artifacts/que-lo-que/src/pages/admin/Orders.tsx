import { useState } from "react";
import { Link } from "wouter";
import { useAdminListOrders, getAdminListOrdersQueryKey, useAdminListDrivers, getAdminListDriversQueryKey } from "@workspace/api-client-react";
import { formatDOP } from "@/lib/auth";
import { useAdminLang } from "@/lib/lang";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Clock, UserPlus, Loader2, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface AssignModal {
  orderId: number;
  currentDriverId: number | null;
}

export default function AdminOrders() {
  const { t } = useAdminLang();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [assignModal, setAssignModal] = useState<AssignModal | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);

  const { data: orders, isLoading } = useAdminListOrders(undefined, {
    query: { queryKey: getAdminListOrdersQueryKey() }
  });

  const { data: drivers } = useAdminListDrivers({
    query: { queryKey: getAdminListDriversQueryKey() }
  });

  const approvedOnlineDrivers = (drivers as any[] | undefined)?.filter(
    d => d.approvalStatus === "approved" && !d.isLocked
  ) ?? [];

  const assignMutation = useMutation({
    mutationFn: async ({ orderId, driverId }: { orderId: number; driverId: number }) => {
      const res = await fetch(`/api/admin/orders/${orderId}/assign-driver`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getAdminListOrdersQueryKey() });
      setAssignModal(null);
      setSelectedDriverId(null);
      toast({ title: "✅ Driver asignado", description: "El driver fue asignado al pedido." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
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

  const canAssign = (status: string) => ["pending", "accepted"].includes(status);

  return (
    <div className="min-h-screen bg-background text-white pb-24">
      <div className="bg-background border-b border-yellow-400/20 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/admin">
          <button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10 transition">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <h1 className="text-xl font-black text-yellow-400">{t.allOrders}</h1>
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
                    <p className="text-xs text-gray-400">{(order as any).business?.name ?? `Negocio #${order.businessId}`}</p>
                  </div>
                  <Badge className={`border text-xs ${STATUS_COLORS[order.status] ?? STATUS_COLORS.pending}`}>
                    {STATUS_LABELS[order.status] ?? order.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-gray-400">
                      <Clock size={12} />
                      <span className="text-xs">{new Date(order.createdAt).toLocaleDateString()}</span>
                    </div>
                    {order.driverId ? (
                      <span className="text-xs text-green-400 font-bold">🛵 Driver #{order.driverId}</span>
                    ) : (
                      <span className="text-xs text-gray-500">Sin driver</span>
                    )}
                  </div>
                  <span className="text-yellow-400 font-black">{formatDOP(order.totalAmount)}</span>
                </div>
                {canAssign(order.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 w-full border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10 font-bold gap-2"
                    onClick={() => { setAssignModal({ orderId: order.id, currentDriverId: order.driverId ?? null }); setSelectedDriverId(null); }}
                  >
                    <UserPlus size={13} />
                    {order.driverId ? "Cambiar driver" : "Asignar driver"}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assign Driver Modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setAssignModal(null)} />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-t-3xl p-6 pb-8 space-y-4">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-gray-900">Asignar Driver — Pedido #{assignModal.orderId}</h2>
              <button onClick={() => setAssignModal(null)}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            {approvedOnlineDrivers.length === 0 ? (
              <p className="text-center text-gray-400 py-6">No hay drivers disponibles en este momento</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {approvedOnlineDrivers.map((driver: any) => (
                  <button
                    key={driver.id}
                    onClick={() => setSelectedDriverId(driver.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition ${
                      selectedDriverId === driver.id
                        ? "bg-yellow-400 text-black font-black"
                        : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <div className="text-left">
                      <p className="font-bold">{driver.user?.name ?? `Driver #${driver.id}`}</p>
                      <p className={`text-xs ${selectedDriverId === driver.id ? "text-black/70" : "text-gray-400"}`}>
                        {driver.vehicleType} · {driver.city} · ⭐ {driver.rating?.toFixed(1)}
                      </p>
                    </div>
                    <div className={`text-xs font-bold ${driver.isOnline ? "text-green-500" : "text-gray-400"}`}>
                      {driver.isOnline ? "En línea" : "Offline"}
                    </div>
                  </button>
                ))}
              </div>
            )}
            <Button
              className="w-full bg-yellow-400 text-black font-black hover:bg-yellow-300 h-12"
              disabled={!selectedDriverId || assignMutation.isPending}
              onClick={() => selectedDriverId && assignMutation.mutate({ orderId: assignModal.orderId, driverId: selectedDriverId })}
            >
              {assignMutation.isPending ? <Loader2 size={16} className="animate-spin mr-2" /> : <UserPlus size={16} className="mr-2" />}
              Confirmar asignación
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
