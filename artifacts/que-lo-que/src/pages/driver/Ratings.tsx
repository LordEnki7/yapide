import { Link } from "wouter";
import { ArrowLeft, Star, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";

interface RatingEntry {
  orderId: number;
  rating: number;
  createdAt: string;
  businessName: string | null;
}

interface RatingSummary {
  average: number;
  total: number;
  breakdown: Record<number, number>;
  recent: RatingEntry[];
}

export default function DriverRatings() {
  const { data, isLoading } = useQuery<RatingSummary>({
    queryKey: ["/api/drivers/me/ratings"],
    queryFn: async () => {
      const r = await apiFetch("/api/drivers/me/ratings");
      if (!r.ok) throw new Error("Failed to load ratings");
      return r.json();
    },
  });

  const avg = data?.average ?? 0;
  const total = data?.total ?? 0;

  return (
    <div className="min-h-screen bg-background text-white pb-24">
      <div className="bg-background border-b border-yellow-400/20 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/driver">
          <button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10 transition">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <h1 className="text-xl font-black text-yellow-400">Mis calificaciones</h1>
      </div>

      <div className="px-4 py-5 space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-36 bg-white/8 rounded-2xl" />
            <Skeleton className="h-48 bg-white/8 rounded-2xl" />
          </div>
        ) : (
          <>
            {/* Average score hero */}
            <div className="bg-yellow-400/8 border border-yellow-400/20 rounded-2xl p-5 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-5xl font-black text-yellow-400">{avg.toFixed(1)}</span>
                <Star size={28} className="text-yellow-400" fill="currentColor" />
              </div>
              <p className="text-white/60 text-sm">{total} calificaciones recibidas</p>

              <div className="mt-4 space-y-1.5">
                {[5, 4, 3, 2, 1].map(n => {
                  const count = data?.breakdown[n] ?? 0;
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div key={n} className="flex items-center gap-2 text-xs">
                      <span className="text-white/60 w-3">{n}</span>
                      <Star size={10} className="text-yellow-400 flex-shrink-0" fill="currentColor" />
                      <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
                        <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-white/40 w-6 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent ratings */}
            <div>
              <h2 className="text-sm font-black text-white/60 uppercase tracking-widest mb-3 flex items-center gap-2">
                <TrendingUp size={14} />
                Últimas calificaciones
              </h2>
              {!data?.recent.length ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-3xl mb-2">⭐</p>
                  <p className="text-sm">Aún no tienes calificaciones</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.recent.map(r => (
                    <div key={r.orderId} className="bg-white/8 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-white">Pedido #{r.orderId}</p>
                        <p className="text-xs text-gray-400">{r.businessName ?? "—"} · {new Date(r.createdAt).toLocaleDateString("es-DO", { day: "numeric", month: "short" })}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(n => (
                          <Star key={n} size={14} className={n <= r.rating ? "text-yellow-400" : "text-white/20"} fill="currentColor" />
                        ))}
                      </div>
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
