import { useState, useEffect } from "react";
import { Link } from "wouter";
import { formatDOP } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import LangToggle from "@/components/LangToggle";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, TrendingUp, ShoppingBag, DollarSign, BarChart2 } from "lucide-react";

interface DayStat { date: string; revenue: number; orders: number; }
interface TopProduct { productName: string; quantity: number; revenue: number; }
interface Analytics {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  dailyStats: DayStat[];
  topProducts: TopProduct[];
}

export default function BusinessAnalytics() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLang();

  useEffect(() => {
    fetch("/api/businesses/mine/analytics", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setAnalytics(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const maxRevenue = Math.max(...(analytics?.dailyStats.map(d => d.revenue) ?? [1]), 1);

  const dayLabel = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("es-DO", { weekday: "short" }).slice(0, 3).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background text-white pb-24">
      <div className="bg-background border-b border-yellow-400/20 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/business">
          <button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10 transition">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <div>
          <h1 className="text-xl font-black text-yellow-400">Analíticas</h1>
          <p className="text-xs text-gray-400">Últimos 7 días</p>
        </div>
        <div className="ml-auto"><LangToggle /></div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 bg-white/8 rounded-2xl" />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/8 border border-white/10 rounded-2xl p-3 text-center">
                <DollarSign size={16} className="text-yellow-400 mx-auto mb-1" />
                <p className="text-lg font-black text-yellow-400">{formatDOP(analytics?.totalRevenue ?? 0)}</p>
                <p className="text-xs text-gray-400 mt-0.5">Ingresos</p>
              </div>
              <div className="bg-white/8 border border-white/10 rounded-2xl p-3 text-center">
                <ShoppingBag size={16} className="text-yellow-400 mx-auto mb-1" />
                <p className="text-lg font-black text-yellow-400">{analytics?.totalOrders ?? 0}</p>
                <p className="text-xs text-gray-400 mt-0.5">Pedidos</p>
              </div>
              <div className="bg-white/8 border border-white/10 rounded-2xl p-3 text-center">
                <TrendingUp size={16} className="text-yellow-400 mx-auto mb-1" />
                <p className="text-lg font-black text-yellow-400">{formatDOP(analytics?.avgOrderValue ?? 0)}</p>
                <p className="text-xs text-gray-400 mt-0.5">Promedio</p>
              </div>
            </div>

            <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 size={16} className="text-yellow-400" />
                <h2 className="font-bold text-sm text-gray-400 uppercase tracking-widest">Ingresos diarios</h2>
              </div>
              <div className="flex items-end gap-2 h-32">
                {analytics?.dailyStats.map(day => (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end justify-center" style={{ height: "90px" }}>
                      <div
                        className="w-full rounded-t-lg bg-yellow-400/80 hover:bg-yellow-400 transition-all"
                        style={{ height: `${Math.max((day.revenue / maxRevenue) * 90, day.revenue > 0 ? 6 : 0)}px` }}
                        title={formatDOP(day.revenue)}
                      />
                    </div>
                    <span className="text-xs text-gray-500 font-bold">{dayLabel(day.date)}</span>
                  </div>
                ))}
              </div>
              {analytics?.totalOrders === 0 && (
                <p className="text-center text-gray-500 text-sm mt-2">No hay datos para mostrar</p>
              )}
            </div>

            <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
              <h2 className="font-bold text-sm text-gray-400 uppercase tracking-widest mb-3">🏆 Top productos</h2>
              {analytics?.topProducts.length === 0 ? (
                <p className="text-gray-500 text-sm">Sin datos todavía</p>
              ) : (
                <div className="space-y-3">
                  {analytics?.topProducts.map((p, i) => (
                    <div key={p.productName} className="flex items-center gap-3">
                      <span className="text-lg font-black text-yellow-400 w-6">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{p.productName}</p>
                        <p className="text-xs text-gray-400">{p.quantity} vendidos</p>
                      </div>
                      <span className="text-sm font-black text-yellow-400">{formatDOP(p.revenue)}</span>
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
