import { useParams, Link, useLocation } from "wouter";
import { useGetOrder, getGetOrderQueryKey, useRateOrder } from "@workspace/api-client-react";
import { formatDOP } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Star, MessageCircle, Share2, Clock, Phone, MessageSquare, Pencil, Check, X, AlertTriangle } from "lucide-react";
import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { XCircle, Loader2 } from "lucide-react";

const LiveDriverMap = lazy(() => import("@/components/LiveDriverMap"));

export default function CustomerOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const orderId = parseInt(id, 10);
  const [driverRating, setDriverRating] = useState(5);
  const [bizRating, setBizRating] = useState(5);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [disputeModal, setDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDesc, setDisputeDesc] = useState("");
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [disputeSubmitted, setDisputeSubmitted] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLang();
  const [, navigate] = useLocation();

  const STEPS = [
    { key: "pending", label: t.pendingStep },
    { key: "accepted", label: t.acceptedStep },
    { key: "picked_up", label: t.pickedUpStep },
    { key: "delivered", label: t.deliveredStep },
  ];

  const { data: order, isLoading } = useGetOrder(
    orderId,
    { query: { enabled: !!orderId, queryKey: getGetOrderQueryKey(orderId), refetchInterval: 8000 } }
  );

  const rateOrder = useRateOrder({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(orderId) });
        toast({ title: t.success, description: t.sendRating });
      },
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Error al cancelar");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(orderId) });
      toast({ title: "Pedido cancelado", description: "Tu pedido fue cancelado exitosamente." });
      const bizId = data?.businessId ?? (order as any)?.businessId;
      if (bizId) navigate(`/customer/business/${bizId}`);
    },
    onError: (err: any) => {
      toast({ title: "No se pudo cancelar", description: err.message, variant: "destructive" });
    },
  });

  const saveNotesMutation = useMutation({
    mutationFn: async (notes: string) => {
      const res = await fetch(`/api/orders/${orderId}/notes`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Error al guardar");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(orderId) });
      setEditingNotes(false);
      toast({ title: "✅ Nota guardada", description: "El negocio verá tu nota." });
    },
    onError: (err: any) => {
      toast({ title: "No se pudo guardar", description: err.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (order && !editingNotes) {
      setNotesValue((order as any).notes ?? "");
    }
  }, [order?.id, (order as any)?.notes]);

  const currentStep = STEPS.findIndex(s => s.key === order?.status);
  const isDelivered = order?.status === "delivered";
  const isCancelled = order?.status === "cancelled";
  const isPending = order?.status === "pending";

  const [countdown, setCountdown] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevStatusRef = useRef<string | null>(null);

  const STATUS_CONFIG: Record<string, { emoji: string; headline: string; sub: string; color: string; bg: string; border: string }> = {
    pending:   { emoji: "⏳", headline: "Esperando confirmación", sub: "El negocio está revisando tu pedido ahora mismo...", color: "text-gray-300", bg: "bg-white/5", border: "border-white/10" },
    accepted:  { emoji: "👨‍🍳", headline: "¡Tu pedido está siendo preparado!", sub: "El negocio ya lo confirmó y está cocinando para ti.", color: "text-white", bg: "bg-yellow-400/8", border: "border-yellow-400/25" },
    picked_up: { emoji: "🛵", headline: "¡Tu driver está en camino!", sub: "El repartidor ya recogió tu pedido. ¡Ya casi llega!", color: "text-white", bg: "bg-green-400/8", border: "border-green-400/25" },
    delivered: { emoji: "🎉", headline: "¡Pedido entregado!", sub: "¡Buen provecho! Gracias por usar YaPide.", color: "text-white", bg: "bg-yellow-400/8", border: "border-yellow-400/25" },
  };

  const STATUS_TOASTS: Record<string, { title: string; description: string }> = {
    accepted:  { title: "👨‍🍳 ¡Pedido confirmado!", description: "El negocio está preparando tu pedido." },
    picked_up: { title: "🛵 ¡En camino!", description: "Tu driver ya recogió el pedido." },
    delivered: { title: "🎉 ¡Entregado!", description: "¡Buen provecho!" },
    cancelled: { title: "❌ Pedido cancelado", description: "Tu pedido fue cancelado." },
  };

  useEffect(() => {
    if (!order?.status) return;
    const prev = prevStatusRef.current;
    if (prev !== null && prev !== order.status) {
      const t = STATUS_TOASTS[order.status];
      if (t) toast({ title: t.title, description: t.description });
    }
    prevStatusRef.current = order.status;
  }, [order?.status]);

  useEffect(() => {
    if (!order || isDelivered || isCancelled) {
      if (timerRef.current) clearInterval(timerRef.current);
      setCountdown(null);
      return;
    }
    const estimatedMinutes: number = (order as any).estimatedMinutes ?? 40;
    const createdAt = new Date((order as any).createdAt).getTime();
    const etaMs = createdAt + estimatedMinutes * 60 * 1000;
    const tick = () => {
      const remaining = Math.max(0, etaMs - Date.now());
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      if (remaining <= 0) {
        setCountdown("¡Ya llega!");
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        setCountdown(`${mins}:${secs.toString().padStart(2, "0")}`);
      }
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [order?.id, order?.status]);

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
        {/* ETA Banner */}
        {countdown && !isCancelled && !isDelivered && (
          <div className="rounded-2xl px-5 py-4 bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-400/20 flex items-center justify-center flex-shrink-0">
                <Clock size={20} className="text-yellow-400" />
              </div>
              <div>
                <p className="text-xs text-yellow-400/70 font-bold uppercase tracking-wider">Tiempo estimado</p>
                <p className="text-sm text-white font-bold">
                  {(order as any)?.estimatedMinutes
                    ? `~${(order as any).estimatedMinutes} min · Prep ${(order as any).business?.prepTimeMinutes ?? 20} min + entrega 20 min`
                    : "~40 min estimados"}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-yellow-400 tabular-nums">{countdown}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">restantes</p>
            </div>
          </div>
        )}

        {/* Delivery verification PIN — shown only while order is active */}
        {(order as any)?.verificationPin && !isDelivered && !isCancelled && (
          <div className="rounded-2xl border-2 border-yellow-400/50 bg-yellow-400/8 px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">🔐</span>
              <p className="text-xs font-black text-yellow-400 uppercase tracking-widest">PIN de entrega</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-black text-white tracking-[0.25em] tabular-nums">
                  {(order as any).verificationPin}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Díselo al driver cuando llegue para confirmar que eres tú
                </p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-yellow-400/15 border border-yellow-400/30 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🛵</span>
              </div>
            </div>
          </div>
        )}

        {/* Live status card */}
        {order?.status && STATUS_CONFIG[order.status] && (
          <div className={`border rounded-2xl px-4 py-4 flex items-center gap-4 transition-all ${STATUS_CONFIG[order.status].bg} ${STATUS_CONFIG[order.status].border}`}>
            <span className="text-3xl flex-shrink-0">{STATUS_CONFIG[order.status].emoji}</span>
            <div>
              <p className={`font-black text-base leading-tight ${STATUS_CONFIG[order.status].color}`}>
                {STATUS_CONFIG[order.status].headline}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{STATUS_CONFIG[order.status].sub}</p>
            </div>
          </div>
        )}

        <div className={`border rounded-2xl p-4 ${isCancelled ? "bg-red-400/5 border-red-400/30" : "bg-white/8 border-white/10"}`}>
          <h2 className="font-bold text-sm text-gray-400 mb-4 uppercase tracking-widest">{t.orderStatus}</h2>
          {isCancelled ? (
            <div className="flex items-center gap-3 py-2">
              <div className="w-8 h-8 rounded-full bg-red-400/20 flex items-center justify-center flex-shrink-0">
                <XCircle size={18} className="text-red-400" />
              </div>
              <div>
                <p className="font-black text-red-400">Pedido cancelado</p>
                <p className="text-xs text-gray-400">Este pedido fue cancelado.</p>
              </div>
            </div>
          ) : (
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
          )}
          {isPending && !isCancelled && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4 w-full border-red-400/30 text-red-400 hover:bg-red-400/10 hover:border-red-400/60 font-bold"
              onClick={() => {
                if (confirm("¿Seguro que quieres cancelar? Regresarás al menú del negocio para pedir de nuevo.")) cancelMutation.mutate();
              }}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? <Loader2 size={14} className="animate-spin mr-2" /> : <XCircle size={14} className="mr-2" />}
              Cancelar y pedir de nuevo
            </Button>
          )}
        </div>

        {(order?.business as any)?.phone && (
          <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-sm text-gray-400 uppercase tracking-widest">Negocio</h2>
                <p className="font-black text-white mt-1">{order?.business?.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <a href={`tel:${(order?.business as any)?.phone}`}>
                  <Button size="sm" className="bg-blue-500 hover:bg-blue-400 text-white font-bold gap-2">
                    <Phone size={14} />
                    Llamar
                  </Button>
                </a>
                <a href={`sms:${(order?.business as any)?.phone}?body=${encodeURIComponent(`Hola, tengo una pregunta sobre mi pedido #${orderId}`)}`}>
                  <Button size="sm" className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold gap-2">
                    <MessageSquare size={14} />
                    Texto
                  </Button>
                </a>
                <a
                  href={`https://wa.me/${(order?.business as any)?.phone?.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola, tengo una pregunta sobre mi pedido #${orderId} 🛵`)}`}
                  target="_blank" rel="noreferrer"
                >
                  <Button size="sm" className="bg-green-500 hover:bg-green-400 text-white font-bold gap-2">
                    <MessageCircle size={14} />
                    WhatsApp
                  </Button>
                </a>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`¡Mi pedido de ${order?.business?.name} está en camino! 🛵 Pedido #${orderId} — ${formatDOP((order?.totalAmount ?? 0) + (order?.deliveryFee ?? 0))}`)}`}
                  target="_blank" rel="noreferrer"
                >
                  <Button size="sm" variant="outline" className="border-white/20 text-white font-bold gap-2 hover:bg-white/10">
                    <Share2 size={14} />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        )}

        {order?.status === "picked_up" && order.deliveryAddress && (
          <Suspense fallback={<div className="h-52 bg-white/8 rounded-2xl animate-pulse" />}>
            <LiveDriverMap orderId={orderId} deliveryAddress={order.deliveryAddress} />
          </Suspense>
        )}

        {order?.driver && (
          <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
            <h2 className="font-bold text-sm text-gray-400 mb-3 uppercase tracking-widest">{t.yourDriver}</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-yellow-400/20 overflow-hidden flex items-center justify-center text-2xl flex-shrink-0">
                  {(order.driver as any).photoUrl ? (
                    <img
                      src={`/api/storage/objects/${(order.driver as any).photoUrl}`}
                      alt="Driver"
                      className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : "🛵"}
                </div>
                <div>
                  <p className="font-black text-white">{order.driver.user?.name ?? "Driver"}</p>
                  <div className="flex items-center gap-1 text-yellow-400">
                    <Star size={12} fill="currentColor" />
                    <span className="text-xs font-bold">{order.driver.rating?.toFixed(1)}</span>
                  </div>
                </div>
              </div>
              {order.driver.user?.phone && (
                <div className="flex gap-2">
                  <a href={`tel:${order.driver.user.phone}`}>
                    <Button size="sm" className="bg-blue-500 hover:bg-blue-400 text-white font-bold gap-2">
                      <Phone size={14} />
                      Llamar
                    </Button>
                  </a>
                  <a href={`sms:${order.driver.user.phone}?body=${encodeURIComponent(`Hola, soy el cliente del pedido #${orderId}`)}`}>
                    <Button size="sm" className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold gap-2">
                      <MessageSquare size={14} />
                      Texto
                    </Button>
                  </a>
                  <a
                    href={`https://wa.me/1${order.driver.user.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola, soy el cliente del pedido #${orderId} 🛵`)}`}
                    target="_blank" rel="noreferrer"
                  >
                    <Button size="sm" className="bg-green-500 hover:bg-green-400 text-white font-bold gap-2">
                      <MessageCircle size={14} />
                      WhatsApp
                    </Button>
                  </a>
                </div>
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
          {(order as any)?.promoDiscount > 0 && (
            <div className="flex justify-between text-sm text-green-400 font-bold mt-1">
              <span>🎟 {(order as any).promoCode}</span>
              <span>-{formatDOP((order as any).promoDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between font-black text-lg mt-1">
            <span>{t.total}</span>
            <span className="text-yellow-400">{formatDOP((order?.totalAmount ?? 0) + (order?.deliveryFee ?? 0))}</span>
          </div>
        </div>

        {/* Notes card — editable when pending */}
        {(isPending || (order as any)?.notes) && !isCancelled && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-sm text-gray-400 uppercase tracking-widest">📝 Nota al negocio</h2>
              {isPending && !editingNotes && (
                <button
                  onClick={() => { setNotesValue((order as any)?.notes ?? ""); setEditingNotes(true); }}
                  className="flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300 font-bold transition"
                >
                  <Pencil size={12} />
                  {(order as any)?.notes ? "Editar" : "Agregar nota"}
                </button>
              )}
            </div>
            {editingNotes ? (
              <div className="space-y-3">
                <Textarea
                  value={notesValue}
                  onChange={e => setNotesValue(e.target.value)}
                  placeholder="Sin cebolla, extra salsa, alergias..."
                  className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400 resize-none text-sm"
                  rows={3}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-yellow-400 text-black font-bold hover:bg-yellow-300 gap-1.5"
                    onClick={() => saveNotesMutation.mutate(notesValue)}
                    disabled={saveNotesMutation.isPending}
                  >
                    {saveNotesMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    Guardar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-gray-400 gap-1.5"
                    onClick={() => setEditingNotes(false)}
                    disabled={saveNotesMutation.isPending}
                  >
                    <X size={13} />
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-300 leading-relaxed">
                {(order as any)?.notes || <span className="text-gray-500 italic">Sin instrucciones especiales</span>}
              </p>
            )}
          </div>
        )}

        {(order as any)?.deliveryPhotoPath && (
          <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
            <h2 className="font-bold text-sm text-gray-400 mb-3 uppercase tracking-widest">📸 Foto de entrega</h2>
            <img
              src={`/api/storage${(order as any).deliveryPhotoPath}`}
              alt="Foto de entrega"
              className="w-full rounded-xl object-cover max-h-60"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
        )}

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

        {/* Dispute button — only for delivered orders without an open dispute */}
        {isDelivered && !disputeSubmitted && (
          <div className="text-center pt-2 pb-4">
            <button
              onClick={() => { setDisputeModal(true); setDisputeReason(""); setDisputeDesc(""); }}
              className="flex items-center gap-2 mx-auto text-xs text-gray-500 hover:text-red-400 transition"
            >
              <AlertTriangle size={12} />
              ¿Problema con tu pedido? Abrir disputa
            </button>
          </div>
        )}
        {isDelivered && disputeSubmitted && (
          <div className="bg-green-400/10 border border-green-400/20 rounded-2xl p-4 text-center">
            <p className="text-green-400 font-bold text-sm">✅ Disputa enviada — te contactaremos pronto</p>
          </div>
        )}
      </div>

      {/* Dispute Modal */}
      {disputeModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDisputeModal(false)} />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-t-3xl p-6 pb-8 space-y-4">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />
            <h2 className="text-base font-black text-gray-900">Abrir disputa — Pedido #{orderId}</h2>
            <div>
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Motivo</p>
              <div className="space-y-2">
                {[
                  { key: "not_delivered", label: "No fue entregado" },
                  { key: "wrong_items", label: "Me llegaron productos incorrectos" },
                  { key: "missing_items", label: "Faltan productos" },
                  { key: "damaged", label: "Productos dañados" },
                  { key: "quality", label: "Mala calidad" },
                  { key: "other", label: "Otro" },
                ].map(r => (
                  <button
                    key={r.key}
                    onClick={() => setDisputeReason(r.key)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition ${
                      disputeReason === r.key ? "bg-red-500 text-white" : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Descripción (opcional)</p>
              <textarea
                value={disputeDesc}
                onChange={e => setDisputeDesc(e.target.value)}
                placeholder="Cuéntanos qué pasó..."
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 resize-none focus:outline-none focus:border-red-400"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDisputeModal(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-bold text-sm"
              >
                Cancelar
              </button>
              <button
                disabled={!disputeReason || disputeLoading}
                onClick={async () => {
                  if (!disputeReason || disputeLoading) return;
                  setDisputeLoading(true);
                  try {
                    const res = await fetch(`/api/orders/${orderId}/dispute`, {
                      method: "POST",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ reason: disputeReason, description: disputeDesc || undefined }),
                    });
                    if (res.ok) {
                      setDisputeModal(false);
                      setDisputeSubmitted(true);
                      toast({ title: "✅ Disputa enviada", description: "Revisaremos tu caso y te contactaremos." });
                    } else {
                      const err = await res.json().catch(() => ({}));
                      toast({ title: "Error", description: err.error ?? "No se pudo enviar", variant: "destructive" });
                    }
                  } finally {
                    setDisputeLoading(false);
                  }
                }}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {disputeLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                Enviar disputa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
