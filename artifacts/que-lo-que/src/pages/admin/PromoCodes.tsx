import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Plus, ToggleLeft, ToggleRight, Trash2, Tag, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface PromoCode {
  id: number;
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  minOrder: number;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

const customFetch = (url: string, opts?: RequestInit) =>
  fetch(url, { credentials: "include", ...opts });

export default function AdminPromoCodes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: "",
    discountType: "percent" as "percent" | "fixed",
    discountValue: "",
    minOrder: "",
    maxUses: "",
    expiresAt: "",
  });

  const { data: codes, isLoading } = useQuery<PromoCode[]>({
    queryKey: ["promo-codes"],
    queryFn: async () => {
      const res = await customFetch("/api/promo-codes");
      if (!res.ok) throw new Error("Error loading codes");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await customFetch("/api/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: data.code.toUpperCase().trim(),
          discountType: data.discountType,
          discountValue: Number(data.discountValue),
          minOrder: data.minOrder ? Number(data.minOrder) : 0,
          maxUses: data.maxUses ? Number(data.maxUses) : null,
          expiresAt: data.expiresAt || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promo-codes"] });
      setForm({ code: "", discountType: "percent", discountValue: "", minOrder: "", maxUses: "", expiresAt: "" });
      setShowForm(false);
      toast({ title: "✅ Código creado" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await customFetch(`/api/promo-codes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Error updating");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["promo-codes"] }),
    onError: () => toast({ title: "Error al actualizar", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await customFetch(`/api/promo-codes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error deleting");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promo-codes"] });
      toast({ title: "Código eliminado" });
    },
    onError: () => toast({ title: "Error al eliminar", variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code || !form.discountValue) {
      toast({ title: "Completa los campos requeridos", variant: "destructive" });
      return;
    }
    createMutation.mutate(form);
  };

  const fmt = (p: PromoCode) =>
    p.discountType === "percent" ? `${p.discountValue}%` : `RD$${p.discountValue}`;

  return (
    <div className="min-h-screen bg-background text-white">
      <div className="bg-background border-b border-yellow-400/20 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/admin">
          <button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10 transition">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <Tag size={20} className="text-yellow-400" />
        <h1 className="text-xl font-black text-yellow-400 flex-1">Códigos Promo</h1>
        <Button
          size="sm"
          onClick={() => setShowForm(v => !v)}
          className="bg-yellow-400 text-black font-black hover:bg-yellow-300"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          <span className="ml-1">{showForm ? "Cancelar" : "Nuevo"}</span>
        </Button>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">

        {/* ─── CREATE FORM ─── */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-yellow-400/5 border border-yellow-400/30 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-black text-yellow-400 uppercase tracking-widest">Nuevo código</h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-gray-400 mb-1 block">Código *</label>
                <input
                  className="w-full bg-white/8 border border-white/20 rounded-xl px-3 py-2 text-white font-mono text-sm focus:border-yellow-400/50 outline-none uppercase"
                  placeholder="VERANO25"
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  required
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Tipo de descuento *</label>
                <select
                  className="w-full bg-white/8 border border-white/20 rounded-xl px-3 py-2 text-white text-sm focus:border-yellow-400/50 outline-none"
                  value={form.discountType}
                  onChange={e => setForm(f => ({ ...f, discountType: e.target.value as any }))}
                >
                  <option value="percent">Porcentaje (%)</option>
                  <option value="fixed">Monto fijo (RD$)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Valor * {form.discountType === "percent" ? "(%)" : "(RD$)"}
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full bg-white/8 border border-white/20 rounded-xl px-3 py-2 text-white text-sm focus:border-yellow-400/50 outline-none"
                  placeholder={form.discountType === "percent" ? "25" : "150"}
                  value={form.discountValue}
                  onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Pedido mínimo (RD$)</label>
                <input
                  type="number"
                  min="0"
                  className="w-full bg-white/8 border border-white/20 rounded-xl px-3 py-2 text-white text-sm focus:border-yellow-400/50 outline-none"
                  placeholder="500"
                  value={form.minOrder}
                  onChange={e => setForm(f => ({ ...f, minOrder: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Usos máximos</label>
                <input
                  type="number"
                  min="1"
                  className="w-full bg-white/8 border border-white/20 rounded-xl px-3 py-2 text-white text-sm focus:border-yellow-400/50 outline-none"
                  placeholder="100 (vacío = ilimitado)"
                  value={form.maxUses}
                  onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs text-gray-400 mb-1 block">Fecha de expiración</label>
                <input
                  type="datetime-local"
                  className="w-full bg-white/8 border border-white/20 rounded-xl px-3 py-2 text-white text-sm focus:border-yellow-400/50 outline-none"
                  value={form.expiresAt}
                  onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-yellow-400 text-black font-black hover:bg-yellow-300 h-12"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creando…" : <><Check size={16} className="mr-2" /> Crear código</>}
            </Button>
          </form>
        )}

        {/* ─── CODE LIST ─── */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 bg-white/8 rounded-2xl" />)}
          </div>
        ) : codes?.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🏷️</p>
            <p className="text-lg font-black text-white mb-1">Sin códigos aún</p>
            <p className="text-gray-400 text-sm">Crea tu primer código promocional</p>
          </div>
        ) : (
          <div className="space-y-3">
            {codes?.map((promo) => {
              const expired = promo.expiresAt && new Date(promo.expiresAt) < new Date();
              const exhausted = promo.maxUses !== null && promo.usedCount >= promo.maxUses;
              const usagePercent = promo.maxUses ? Math.min(100, Math.round((promo.usedCount / promo.maxUses) * 100)) : null;

              return (
                <div key={promo.id} className={`border rounded-2xl p-4 transition ${promo.isActive && !expired && !exhausted ? "bg-white/8 border-white/10" : "bg-white/4 border-white/5 opacity-60"}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-lg text-yellow-400">{promo.code}</span>
                      <Badge className={`text-xs border ${promo.isActive && !expired && !exhausted ? "bg-green-400/20 text-green-400 border-green-400/30" : "bg-red-400/20 text-red-400 border-red-400/30"}`}>
                        {expired ? "Expirado" : exhausted ? "Agotado" : promo.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                      <Badge className="text-xs bg-blue-400/10 text-blue-300 border-blue-400/20">
                        {fmt(promo)} off
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleMutation.mutate({ id: promo.id, isActive: !promo.isActive })}
                        disabled={toggleMutation.isPending}
                        className="p-2 rounded-lg hover:bg-white/10 transition text-gray-400 hover:text-yellow-400"
                        title={promo.isActive ? "Desactivar" : "Activar"}
                      >
                        {promo.isActive ? <ToggleRight size={20} className="text-green-400" /> : <ToggleLeft size={20} />}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar código ${promo.code}?`)) deleteMutation.mutate(promo.id);
                        }}
                        disabled={deleteMutation.isPending}
                        className="p-2 rounded-lg hover:bg-red-500/10 transition text-gray-400 hover:text-red-400"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 mb-2">
                    <div>
                      <p className="text-gray-500">Mín. pedido</p>
                      <p className="text-white font-bold">RD${promo.minOrder}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Usos</p>
                      <p className="text-white font-bold">
                        {promo.usedCount}{promo.maxUses !== null ? `/${promo.maxUses}` : " / ∞"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Expira</p>
                      <p className="text-white font-bold">
                        {promo.expiresAt ? new Date(promo.expiresAt).toLocaleDateString("es-DO") : "Nunca"}
                      </p>
                    </div>
                  </div>

                  {usagePercent !== null && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${usagePercent >= 90 ? "bg-red-400" : usagePercent >= 60 ? "bg-yellow-400" : "bg-green-400"}`}
                          style={{ width: `${usagePercent}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1 text-right">{usagePercent}% usado</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
