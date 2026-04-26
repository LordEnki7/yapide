import { Link } from "wouter";
import { ArrowLeft, DollarSign, Clock, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { formatDOP } from "@/lib/auth";

interface PayoutSummary {
  pendingAmount: number;
  totalPaidOut: number;
  payouts: Array<{ id: number; amount: number; note: string | null; createdAt: string }>;
}

export default function BusinessPayouts() {
  const { data, isLoading } = useQuery<PayoutSummary>({
    queryKey: ["/api/businesses/mine/payouts"],
    queryFn: async () => {
      const r = await apiFetch("/api/businesses/mine/payouts");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
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
            <Skeleton className="h-32 bg-white/8 rounded-2xl" />
            <Skeleton className="h-48 bg-white/8 rounded-2xl" />
          </div>
        ) : (
          <>
            {/* Balance cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-yellow-400/8 border border-yellow-400/25 rounded-2xl p-4 text-center">
                <Clock size={18} className="text-yellow-400 mx-auto mb-1" />
                <p className="text-2xl font-black text-yellow-400">{formatDOP(data?.pendingAmount ?? 0)}</p>
                <p className="text-xs text-white/60 mt-1">Por cobrar</p>
              </div>
              <div className="bg-green-400/8 border border-green-400/20 rounded-2xl p-4 text-center">
                <CheckCircle2 size={18} className="text-green-400 mx-auto mb-1" />
                <p className="text-2xl font-black text-green-400">{formatDOP(data?.totalPaidOut ?? 0)}</p>
                <p className="text-xs text-white/60 mt-1">Total pagado</p>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-300">
              <DollarSign size={12} className="inline mr-1" />
              El monto "Por cobrar" corresponde al 85% de las órdenes entregadas, menos los pagos ya realizados. YaPide retiene el 15% como comisión de la plataforma.
            </div>

            {/* Payout history */}
            <div>
              <h2 className="text-sm font-black text-white/60 uppercase tracking-widest mb-3">Historial de pagos</h2>
              {!data?.payouts.length ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-3xl mb-2">💳</p>
                  <p className="text-sm">Aún no hay pagos registrados</p>
                  <p className="text-xs mt-1">Contacta a YaPide para solicitar tu pago</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.payouts.map(p => (
                    <div key={p.id} className="bg-white/8 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-green-400 text-sm">{formatDOP(p.amount)}</p>
                        <p className="text-xs text-gray-400">{p.note ?? "Pago de YaPide"}</p>
                        <p className="text-xs text-gray-500">{new Date(p.createdAt).toLocaleDateString("es-DO", { day: "numeric", month: "short", year: "numeric" })}</p>
                      </div>
                      <CheckCircle2 size={18} className="text-green-400 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
