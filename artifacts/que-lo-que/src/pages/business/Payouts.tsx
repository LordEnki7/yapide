import { Link } from "wouter";
import { ArrowLeft, DollarSign, Clock, CheckCircle2, Truck, Banknote, Smartphone, CreditCard } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { formatDOP } from "@/lib/auth";

interface PayoutSummary {
  inTransit: number;
  pendingAmount: number;
  totalPaidOut: number;
  payouts: Array<{
    id: number;
    amount: number;
    payoutMethod: string | null;
    reference: string | null;
    note: string | null;
    createdAt: string;
  }>;
}

const METHOD_ICONS: Record<string, React.ReactNode> = {
  efectivo: <Banknote size={14} className="text-yellow-400" />,
  tpago:    <Smartphone size={14} className="text-blue-400" />,
  transferencia: <CreditCard size={14} className="text-purple-400" />,
};

const METHOD_LABELS: Record<string, string> = {
  efectivo: "Efectivo",
  tpago: "Tpago",
  transferencia: "Transferencia",
};

export default function BusinessPayouts() {
  const { data, isLoading } = useQuery<PayoutSummary>({
    queryKey: ["/api/businesses/mine/payouts"],
    queryFn: async () => {
      const r = await apiFetch("/api/businesses/mine/payouts");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    refetchInterval: 60_000,
  });

  return (
    <div className="min-h-screen bg-background text-white pb-24">
      <div className="bg-background border-b border-yellow-400/20 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/business">
          <button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10 transition">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <h1 className="text-xl font-black text-yellow-400">Pagos y cobros</h1>
      </div>

      <div className="px-4 py-5 space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-40 bg-white/8 rounded-2xl" />
            <Skeleton className="h-48 bg-white/8 rounded-2xl" />
          </div>
        ) : (
          <>
            {/* Three-bucket balance */}
            <div className="space-y-2">
              <h2 className="text-xs font-black text-white/40 uppercase tracking-widest">Tu dinero</h2>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-orange-400/8 border border-orange-400/20 rounded-2xl p-3 text-center">
                  <Truck size={16} className="text-orange-400 mx-auto mb-1" />
                  <p className="text-lg font-black text-orange-400 leading-tight">{formatDOP(data?.inTransit ?? 0)}</p>
                  <p className="text-[10px] text-white/50 mt-1 leading-tight">Con el chofer</p>
                </div>
                <div className="bg-yellow-400/8 border border-yellow-400/20 rounded-2xl p-3 text-center">
                  <Clock size={16} className="text-yellow-400 mx-auto mb-1" />
                  <p className="text-lg font-black text-yellow-400 leading-tight">{formatDOP(data?.pendingAmount ?? 0)}</p>
                  <p className="text-[10px] text-white/50 mt-1 leading-tight">En oficina</p>
                </div>
                <div className="bg-green-400/8 border border-green-400/20 rounded-2xl p-3 text-center">
                  <CheckCircle2 size={16} className="text-green-400 mx-auto mb-1" />
                  <p className="text-lg font-black text-green-400 leading-tight">{formatDOP(data?.totalPaidOut ?? 0)}</p>
                  <p className="text-[10px] text-white/50 mt-1 leading-tight">Pagado</p>
                </div>
              </div>
            </div>

            {/* Status explanation */}
            {(data?.inTransit ?? 0) > 0 && (
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 text-xs text-orange-300 flex items-start gap-2">
                <Truck size={13} className="flex-shrink-0 mt-0.5" />
                <span>El chofer todavía no ha entregado el efectivo a la oficina. En cuanto llegue te notificamos.</span>
              </div>
            )}
            {(data?.pendingAmount ?? 0) > 0 && (
              <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-xl p-3 text-xs text-yellow-200 flex items-start gap-2">
                <DollarSign size={13} className="flex-shrink-0 mt-0.5" />
                <span>Tu efectivo está en la oficina. YaPide procesará tu pago pronto.</span>
              </div>
            )}
            {(data?.inTransit ?? 0) === 0 && (data?.pendingAmount ?? 0) === 0 && (data?.totalPaidOut ?? 0) === 0 && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-300 flex items-start gap-2">
                <DollarSign size={13} className="flex-shrink-0 mt-0.5" />
                <span>Aquí verás el estado de tus pagos cuando completes pedidos.</span>
              </div>
            )}

            {/* Payout history */}
            <div>
              <h2 className="text-xs font-black text-white/40 uppercase tracking-widest mb-3">Historial de pagos</h2>
              {!data?.payouts.length ? (
                <div className="text-center py-10 text-gray-400">
                  <p className="text-3xl mb-2">💳</p>
                  <p className="text-sm">Aún no hay pagos registrados</p>
                  <p className="text-xs mt-1 text-gray-600">Contacta a YaPide para cualquier duda</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.payouts.map(p => {
                    const method = p.payoutMethod ?? "efectivo";
                    return (
                      <div key={p.id} className="bg-white/8 border border-white/10 rounded-xl p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {METHOD_ICONS[method] ?? METHOD_ICONS.efectivo}
                              <span className="text-xs text-gray-400 font-bold">{METHOD_LABELS[method] ?? method}</span>
                              {p.reference && <span className="text-xs text-gray-600">· Ref: {p.reference}</span>}
                            </div>
                            <p className="text-xs text-gray-500">{p.note ?? "Pago de YaPide"}</p>
                            <p className="text-xs text-gray-600 mt-0.5">
                              {new Date(p.createdAt).toLocaleDateString("es-DO", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-black text-green-400">{formatDOP(p.amount)}</p>
                            <CheckCircle2 size={14} className="text-green-400 ml-auto mt-1" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
