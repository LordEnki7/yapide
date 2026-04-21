import { useState } from "react";
import { Link } from "wouter";
import { formatDOP } from "@/lib/auth";
import { useAdminLang } from "@/lib/lang";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, AlertCircle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface Dispute {
  id: number;
  orderId: number;
  reason: string;
  description: string | null;
  status: string;
  refundAmount: number | null;
  adminNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  customer: { id: number; name: string; email: string } | null;
  order: { id: number; totalAmount: number; paymentMethod: string } | null;
}

const REASONS: Record<string, string> = {
  not_delivered: "No fue entregado",
  wrong_items: "Productos incorrectos",
  missing_items: "Productos faltantes",
  damaged: "Productos dañados",
  quality: "Mala calidad",
  other: "Otro",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  open:     { label: "Abierta",   color: "bg-yellow-400/20 text-yellow-400 border-yellow-400/40", icon: <AlertCircle size={12} /> },
  resolved: { label: "Resuelta",  color: "bg-green-400/20 text-green-400 border-green-400/40",   icon: <CheckCircle2 size={12} /> },
  rejected: { label: "Rechazada", color: "bg-red-400/20 text-red-400 border-red-400/40",          icon: <XCircle size={12} /> },
};

export default function AdminDisputes() {
  const { t } = useAdminLang();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Dispute | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  const { data: disputes, isLoading } = useQuery<Dispute[]>({
    queryKey: ["admin-disputes"],
    queryFn: () => fetch("/api/admin/disputes", { credentials: "include" }).then(r => r.json()),
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/admin/disputes/${id}/resolve`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          refundAmount: refundAmount ? parseFloat(refundAmount) : undefined,
          adminNotes: adminNotes || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-disputes"] });
      setSelected(null);
      setRefundAmount("");
      setAdminNotes("");
      toast({ title: "✅ Disputa resuelta" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCount = disputes?.filter(d => d.status === "open").length ?? 0;

  return (
    <div className="min-h-screen bg-background text-white pb-24">
      <div className="bg-background border-b border-yellow-400/20 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/admin">
          <button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10 transition">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <div>
          <h1 className="text-xl font-black text-yellow-400">Disputas & Reembolsos</h1>
          {openCount > 0 && (
            <p className="text-xs text-red-400 font-bold">{openCount} disputa{openCount > 1 ? "s" : ""} pendiente{openCount > 1 ? "s" : ""}</p>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {isLoading ? (
          [1, 2, 3].map(i => <Skeleton key={i} className="h-28 bg-white/8 rounded-2xl" />)
        ) : disputes?.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">🎉</p>
            <p className="text-gray-400 font-bold">Sin disputas por ahora</p>
          </div>
        ) : (
          disputes?.map(d => {
            const cfg = STATUS_CONFIG[d.status] ?? STATUS_CONFIG.open;
            return (
              <div key={d.id} className="bg-white/8 border border-white/10 rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-black text-white">Pedido #{d.orderId}</p>
                    <p className="text-xs text-gray-400">{d.customer?.name} · {d.customer?.email}</p>
                  </div>
                  <Badge className={`border flex items-center gap-1 ${cfg.color}`}>
                    {cfg.icon} {cfg.label}
                  </Badge>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Motivo</p>
                  <p className="text-sm font-bold text-white">{REASONS[d.reason] ?? d.reason}</p>
                  {d.description && <p className="text-xs text-gray-400 mt-1">{d.description}</p>}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Total pedido: <span className="text-white font-bold">{formatDOP(d.order?.totalAmount ?? 0)}</span></span>
                  {d.refundAmount && (
                    <span className="text-green-400 font-bold">Reembolso: {formatDOP(d.refundAmount)}</span>
                  )}
                </div>
                {d.adminNotes && (
                  <p className="text-xs text-gray-400 italic">📝 {d.adminNotes}</p>
                )}
                <p className="text-[10px] text-gray-600">{new Date(d.createdAt).toLocaleString()}</p>
                {d.status === "open" && (
                  <Button
                    size="sm"
                    className="w-full bg-yellow-400 text-black font-black hover:bg-yellow-300"
                    onClick={() => { setSelected(d); setRefundAmount(""); setAdminNotes(""); }}
                  >
                    Resolver disputa
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Resolve modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-t-3xl p-6 pb-8 space-y-4">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />
            <h2 className="text-lg font-black text-gray-900 text-center">Resolver Disputa</h2>
            <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700">
              <p><span className="font-bold">Pedido:</span> #{selected.orderId}</p>
              <p><span className="font-bold">Cliente:</span> {selected.customer?.name}</p>
              <p><span className="font-bold">Motivo:</span> {REASONS[selected.reason] ?? selected.reason}</p>
              {selected.description && <p className="text-gray-500 mt-1">{selected.description}</p>}
            </div>
            <div>
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Reembolso (RD$) — opcional</label>
              <Input
                type="number"
                placeholder="0"
                value={refundAmount}
                onChange={e => setRefundAmount(e.target.value)}
                className="mt-1 border-gray-200"
              />
            </div>
            <div>
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Nota interna</label>
              <Textarea
                placeholder="Notas sobre la resolución..."
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                className="mt-1 border-gray-200 resize-none"
                rows={3}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 border-red-300 text-red-500 font-black hover:bg-red-50"
                onClick={() => resolveMutation.mutate({ id: selected.id, status: "rejected" })}
                disabled={resolveMutation.isPending}
              >
                {resolveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                &nbsp;Rechazar
              </Button>
              <Button
                className="flex-1 bg-green-500 text-white font-black hover:bg-green-400"
                onClick={() => resolveMutation.mutate({ id: selected.id, status: "resolved" })}
                disabled={resolveMutation.isPending}
              >
                {resolveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                &nbsp;Resolver
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
