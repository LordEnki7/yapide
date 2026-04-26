import { useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, XCircle, RefreshCw, Loader2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/apiFetch";
import type { Order, OrderItem } from "@workspace/api-zod";

type PickerStatus = "pending" | "found" | "out_of_stock" | "substituted";

const STATUS_COLORS: Record<PickerStatus, string> = {
  pending: "border-white/15 bg-white/5",
  found: "border-green-500/50 bg-green-500/10",
  out_of_stock: "border-red-500/50 bg-red-500/10",
  substituted: "border-orange-400/50 bg-orange-400/10",
};

const STATUS_LABELS: Record<PickerStatus, string> = {
  pending: "Pendiente",
  found: "Encontrado",
  out_of_stock: "Sin stock",
  substituted: "Sustituto",
};

interface SubstituteForm {
  name: string;
  price: string;
}

export default function Picker() {
  const { id } = useParams<{ id: string }>();
  const orderId = parseInt(id ?? "0", 10);
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const [subs, setSubs] = useState<Record<number, SubstituteForm>>({});
  const [showSubForm, setShowSubForm] = useState<Record<number, boolean>>({});

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ["/api/orders", orderId],
    queryFn: async () => {
      const r = await apiFetch(`/api/orders/${orderId}`);
      if (!r.ok) throw new Error("Failed to load order");
      return r.json();
    },
    refetchInterval: false,
  });

  const updateItem = useMutation({
    mutationFn: async ({ itemId, pickerStatus, substituteName, substitutePrice }: {
      itemId: number;
      pickerStatus: PickerStatus;
      substituteName?: string;
      substitutePrice?: number;
    }) => {
      const r = await apiFetch(`/api/orders/${orderId}/items/${itemId}/picker`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pickerStatus, substituteName, substitutePrice }),
      });
      if (!r.ok) throw new Error("Failed to update item");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/orders", orderId] }),
    onError: () => toast({ title: "Error al actualizar artículo", variant: "destructive" }),
  });

  const confirmPicking = useMutation({
    mutationFn: async () => {
      const r = await apiFetch(`/api/orders/${orderId}/confirm-picking`, { method: "POST" });
      if (!r.ok) throw new Error("Failed to confirm picking");
      return r.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.status === "pending_substitution"
          ? "✅ Picking listo — esperando aprobación del cliente"
          : "✅ Picking completo — buscando driver",
      });
      navigate("/business/orders");
    },
    onError: () => toast({ title: "Error al confirmar picking", variant: "destructive" }),
  });

  const items = (order?.items ?? []) as (OrderItem & { pickerStatus?: PickerStatus; substituteName?: string | null; substitutePrice?: number | null })[];

  const allMarked = items.length > 0 && items.every(i => (i.pickerStatus ?? "pending") !== "pending");

  const handleMark = (item: typeof items[0], status: PickerStatus) => {
    if (status === "substituted") {
      setShowSubForm(prev => ({ ...prev, [item.id]: true }));
      return;
    }
    setShowSubForm(prev => ({ ...prev, [item.id]: false }));
    updateItem.mutate({ itemId: item.id, pickerStatus: status });
  };

  const handleConfirmSub = (item: typeof items[0]) => {
    const sub = subs[item.id];
    if (!sub?.name) {
      toast({ title: "Escribe el nombre del sustituto", variant: "destructive" });
      return;
    }
    updateItem.mutate({
      itemId: item.id,
      pickerStatus: "substituted",
      substituteName: sub.name,
      substitutePrice: sub.price ? parseFloat(sub.price) : undefined,
    });
    setShowSubForm(prev => ({ ...prev, [item.id]: false }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-yellow-400" size={32} />
      </div>
    );
  }

  const foundCount = items.filter(i => (i.pickerStatus ?? "pending") === "found").length;
  const subCount = items.filter(i => (i.pickerStatus ?? "pending") === "substituted").length;
  const oosCount = items.filter(i => (i.pickerStatus ?? "pending") === "out_of_stock").length;

  return (
    <div className="min-h-screen bg-background text-white pb-32">
      {/* Header */}
      <div className="bg-background border-b border-yellow-400/20 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/business/orders">
          <button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10 transition">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <div>
          <h1 className="text-xl font-black text-yellow-400 leading-tight">Recoger Artículos</h1>
          <p className="text-xs text-white/50">Pedido #{orderId}</p>
        </div>
        <div className="ml-auto flex gap-1.5">
          <Badge className="bg-green-500/20 text-green-400 border-green-500/40 text-xs">{foundCount} ✓</Badge>
          {subCount > 0 && <Badge className="bg-orange-400/20 text-orange-400 border-orange-400/40 text-xs">{subCount} ~</Badge>}
          {oosCount > 0 && <Badge className="bg-red-500/20 text-red-400 border-red-500/40 text-xs">{oosCount} ✗</Badge>}
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        <p className="text-xs text-white/40 uppercase tracking-widest font-bold">
          {items.length} {items.length === 1 ? "artículo" : "artículos"} · marca cada uno mientras lo buscas
        </p>

        {items.map(item => {
          const status = (item.pickerStatus ?? "pending") as PickerStatus;
          const showSub = showSubForm[item.id];

          return (
            <div key={item.id} className={`rounded-2xl border p-4 transition-all ${STATUS_COLORS[status]}`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/8 flex items-center justify-center flex-shrink-0">
                  <Package size={20} className="text-yellow-400/70" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm leading-tight">{item.productName}</p>
                  <p className="text-xs text-white/50 mt-0.5">
                    Cant: <span className="font-bold text-white">{item.quantity}</span>
                    {" · "}RD${item.price.toFixed(2)} c/u
                  </p>
                  {status === "substituted" && item.substituteName && (
                    <p className="text-xs text-orange-400 mt-1 font-bold">
                      Sustituto: {item.substituteName}
                      {item.substitutePrice ? ` · RD$${item.substitutePrice.toFixed(2)}` : ""}
                    </p>
                  )}
                  <Badge className={`mt-1.5 text-[10px] border ${STATUS_COLORS[status]}`}>
                    {STATUS_LABELS[status]}
                  </Badge>
                </div>
              </div>

              {/* Action buttons */}
              {status === "pending" && !showSub && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleMark(item, "found")}
                    className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl bg-green-500/20 border border-green-500/40 text-green-400 text-xs font-bold hover:bg-green-500/30 transition"
                    disabled={updateItem.isPending}
                  >
                    <CheckCircle2 size={14} /> Encontrado
                  </button>
                  <button
                    onClick={() => handleMark(item, "substituted")}
                    className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl bg-orange-400/20 border border-orange-400/40 text-orange-400 text-xs font-bold hover:bg-orange-400/30 transition"
                    disabled={updateItem.isPending}
                  >
                    <RefreshCw size={14} /> Sustituto
                  </button>
                  <button
                    onClick={() => handleMark(item, "out_of_stock")}
                    className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-bold hover:bg-red-500/30 transition"
                    disabled={updateItem.isPending}
                  >
                    <XCircle size={14} /> Sin stock
                  </button>
                </div>
              )}

              {/* Substitute form */}
              {showSub && (
                <div className="mt-3 space-y-2">
                  <Input
                    placeholder="Nombre del sustituto (ej: Leche Parmalat 1L)"
                    className="bg-white/8 border-orange-400/30 text-white placeholder:text-white/30 text-sm h-10"
                    value={subs[item.id]?.name ?? ""}
                    onChange={e => setSubs(prev => ({ ...prev, [item.id]: { ...prev[item.id], name: e.target.value } }))}
                  />
                  <Input
                    placeholder="Precio (opcional)"
                    type="number"
                    className="bg-white/8 border-orange-400/30 text-white placeholder:text-white/30 text-sm h-10"
                    value={subs[item.id]?.price ?? ""}
                    onChange={e => setSubs(prev => ({ ...prev, [item.id]: { ...prev[item.id], price: e.target.value } }))}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-orange-400 text-black font-bold h-10 hover:bg-orange-300"
                      onClick={() => handleConfirmSub(item)}
                      disabled={updateItem.isPending}
                    >
                      Confirmar sustituto
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/20 text-white/60 h-10"
                      onClick={() => setShowSubForm(prev => ({ ...prev, [item.id]: false }))}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {/* Re-mark button when already marked */}
              {status !== "pending" && !showSub && (
                <button
                  className="mt-2 text-[10px] text-white/30 hover:text-white/60 transition"
                  onClick={() => updateItem.mutate({ itemId: item.id, pickerStatus: "pending" as any })}
                >
                  Deshacer
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirm button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-yellow-400/20">
        {!allMarked && (
          <p className="text-center text-xs text-white/40 mb-2">
            Marca todos los artículos antes de confirmar
          </p>
        )}
        <Button
          className="w-full h-14 text-base font-black rounded-2xl bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-40"
          disabled={!allMarked || confirmPicking.isPending}
          onClick={() => confirmPicking.mutate()}
        >
          {confirmPicking.isPending
            ? <Loader2 size={20} className="animate-spin mx-auto" />
            : "✅ Picking terminado — Listo para delivery"}
        </Button>
      </div>
    </div>
  );
}
