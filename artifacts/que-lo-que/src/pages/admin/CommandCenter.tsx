import { useState, useEffect, useRef } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { Link } from "wouter";
import { formatDOP } from "@/lib/auth";
import {
  ArrowLeft, RefreshCw, TrendingUp, Users, Bike, Package, AlertTriangle,
  Zap, Clock, ChefHat, BarChart3, MessageSquare, CheckCircle, XCircle,
  Shield, Activity, Bot, Play, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface KPI { revenueToday: number; revenueWeek: number; revenueTotal: number; gmvToday: number; gmvWeek: number; ordersToday: number; ordersWeek: number; ordersTotal: number; ordersGrowthPct: number; deliveryRateToday: number; }
interface Overview { kpi: KPI; users: { total: number; banned: number }; drivers: { total: number; online: number; locked: number }; businesses: { total: number; active: number }; pipeline: { pending: number; accepted: number; picked_up: number }; dailyStats: Array<{ date: string; orders: number; revenue: number }>; recentOrders: Array<{ id: number; status: string; totalAmount: number; businessName: string; createdAt: string }>; generatedAt: string; }
interface AgentData { status: string; lastRun: string; [key: string]: any; }

const STATUS_DOT: Record<string, string> = {
  active: "bg-green-400", clean: "bg-green-400", idle: "bg-gray-400",
  surge: "bg-red-400", warning: "bg-yellow-400", critical: "bg-red-500",
  no_drivers: "bg-red-400", quiet: "bg-blue-400", normal: "bg-green-400",
  action_needed: "bg-yellow-400", good: "bg-green-400",
};
const STATUS_LABEL: Record<string, string> = {
  active: "Activo", clean: "Sin alertas", idle: "Sin pedidos", surge: "¡SURGE!", warning: "Advertencias",
  critical: "¡CRÍTICO!", no_drivers: "Sin drivers", quiet: "Sin demanda", normal: "Normal", action_needed: "Acción requerida", good: "Todo bien",
};

function AgentCard({ title, icon: Icon, iconColor, agent, children, onRun, running }: { title: string; icon: any; iconColor: string; agent: AgentData | null; children?: React.ReactNode; onRun?: () => void; running?: boolean; }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg ${iconColor} flex items-center justify-center`}>
            <Icon size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-white">{title}</p>
            {agent && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[agent.status] ?? "bg-gray-400"}`} />
                <span className="text-[10px] text-gray-400 font-bold">{STATUS_LABEL[agent.status] ?? agent.status}</span>
              </div>
            )}
          </div>
        </div>
        {onRun && (
          <button onClick={onRun} disabled={running} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-yellow-400/15 border border-yellow-400/30 text-yellow-400 text-xs font-bold hover:bg-yellow-400/25 transition disabled:opacity-50">
            {running ? <RefreshCw size={11} className="animate-spin" /> : <Play size={11} />} Ejecutar
          </button>
        )}
      </div>
      {agent ? children : <div className="h-12 bg-white/5 rounded-xl animate-pulse" />}
    </div>
  );
}

export default function AdminCommandCenter() {
  const { toast } = useToast();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [dispatch, setDispatch] = useState<AgentData | null>(null);
  const [fraud, setFraud] = useState<AgentData | null>(null);
  const [surge, setSurge] = useState<AgentData | null>(null);
  const [eta, setEta] = useState<AgentData | null>(null);
  const [menu, setMenu] = useState<AgentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = async () => {
    try {
      const [ov, disp, fr, su, et, mn] = await Promise.all([
        fetch("/api/agents/overview", { credentials: "include" }).then(r => r.json()),
        fetch("/api/agents/dispatch/status", { credentials: "include" }).then(r => r.json()),
        fetch("/api/agents/fraud/status", { credentials: "include" }).then(r => r.json()),
        fetch("/api/agents/surge/status", { credentials: "include" }).then(r => r.json()),
        fetch("/api/agents/eta/status", { credentials: "include" }).then(r => r.json()),
        fetch("/api/agents/menu-optimizer/status", { credentials: "include" }).then(r => r.json()),
      ]);
      setOverview(ov); setDispatch(disp); setFraud(fr); setSurge(su); setEta(et); setMenu(mn);
      setLastRefresh(new Date());
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(fetchAll, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const runDispatch = async () => {
    setDispatching(true);
    try {
      const r = await apiFetch("/api/agents/dispatch/run", { method: "POST" });
      const d = await r.json();
      toast({ title: `🚀 Dispatch completado`, description: d.message });
      fetchAll();
    } catch { } finally { setDispatching(false); }
  };

  const maxDailyOrders = Math.max(...(overview?.dailyStats.map(d => d.orders) ?? [1]), 1);

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-400/20 text-yellow-400",
    accepted: "bg-blue-400/20 text-blue-400",
    picked_up: "bg-purple-400/20 text-purple-400",
    delivered: "bg-green-400/20 text-green-400",
    cancelled: "bg-red-400/20 text-red-400",
  };

  if (loading) return (
    <div className="min-h-screen bg-background p-4 space-y-3">
      {[1,2,3,4].map(i => <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse" />)}
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-white pb-28">
      {/* Header */}
      <div className="bg-background border-b border-yellow-400/20 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10 transition">
              <ArrowLeft size={18} />
            </button>
          </Link>
          <div className="flex-1">
            <p className="text-[10px] text-yellow-400/60 font-bold uppercase tracking-widest">YaPide</p>
            <h1 className="text-lg font-black text-yellow-400 leading-tight">Command Center</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] text-gray-400 font-bold">LIVE</span>
            </div>
            <button onClick={fetchAll} className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10 transition">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
        <p className="text-[10px] text-gray-500 mt-1 pl-12">Última actualización: {lastRefresh.toLocaleTimeString("es-DO")} · Auto-refresh cada 30s</p>
      </div>

      <div className="px-4 py-4 space-y-5">

        {/* KPI Strip */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Revenue hoy", value: formatDOP(overview?.kpi.revenueToday ?? 0), icon: TrendingUp, color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/25" },
            { label: "Revenue semana", value: formatDOP(overview?.kpi.revenueWeek ?? 0), icon: BarChart3, color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/25" },
            { label: "Pedidos hoy", value: overview?.kpi.ordersToday ?? 0, sub: `${overview?.kpi.deliveryRateToday ?? 0}% entregados`, icon: Package, color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/25" },
            { label: "GMV semana", value: formatDOP(overview?.kpi.gmvWeek ?? 0), sub: `vs semana anterior`, icon: Activity, color: "text-green-400", bg: "bg-green-400/10 border-green-400/25", growth: overview?.kpi.ordersGrowthPct },
          ].map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className={`rounded-2xl p-4 border ${card.bg}`}>
                <div className="flex items-center justify-between mb-1">
                  <Icon size={15} className={card.color} />
                  {card.growth !== undefined && (
                    <div className={`flex items-center gap-0.5 text-[10px] font-bold ${card.growth >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {card.growth >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                      {Math.abs(card.growth)}%
                    </div>
                  )}
                </div>
                <p className={`text-xl font-black ${card.color}`}>{typeof card.value === "number" ? card.value.toLocaleString() : card.value}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{card.label}</p>
                {card.sub && <p className="text-[10px] text-gray-500">{card.sub}</p>}
              </div>
            );
          })}
        </div>

        {/* Entity Health */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Estado del ecosistema</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-2xl font-black text-white">{overview?.drivers.online ?? 0}</p>
              <p className="text-[11px] text-green-400 font-bold">Drivers online</p>
              <p className="text-[10px] text-gray-500">{overview?.drivers.total ?? 0} total · {overview?.drivers.locked ?? 0} 🔒</p>
            </div>
            <div className="text-center border-x border-white/10">
              <p className="text-2xl font-black text-white">{overview?.businesses.active ?? 0}</p>
              <p className="text-[11px] text-yellow-400 font-bold">Negocios activos</p>
              <p className="text-[10px] text-gray-500">{overview?.businesses.total ?? 0} registrados</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-white">{overview?.users.total ?? 0}</p>
              <p className="text-[11px] text-blue-400 font-bold">Clientes</p>
              <p className="text-[10px] text-gray-500">{overview?.users.banned ?? 0} baneados</p>
            </div>
          </div>
        </div>

        {/* Live Order Pipeline */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Pipeline en vivo</h2>
          <div className="flex gap-2">
            {[
              { key: "pending", label: "Esperando", value: overview?.pipeline.pending ?? 0, color: "bg-yellow-400", text: "text-yellow-400" },
              { key: "accepted", label: "Preparando", value: overview?.pipeline.accepted ?? 0, color: "bg-blue-400", text: "text-blue-400" },
              { key: "picked_up", label: "En camino", value: overview?.pipeline.picked_up ?? 0, color: "bg-purple-400", text: "text-purple-400" },
            ].map(stage => (
              <div key={stage.key} className="flex-1 bg-white/5 rounded-xl p-3 text-center">
                <p className={`text-3xl font-black ${stage.text}`}>{stage.value}</p>
                <p className="text-[11px] text-gray-400 mt-1 font-bold">{stage.label}</p>
                <div className={`mt-2 h-1 rounded-full ${stage.value > 0 ? stage.color : "bg-white/10"}`} />
              </div>
            ))}
          </div>
        </div>

        {/* 7-Day Bar Chart */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Pedidos — últimos 7 días</h2>
          <div className="flex items-end gap-1.5 h-24">
            {overview?.dailyStats.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <p className="text-[9px] text-gray-500 font-bold">{day.orders}</p>
                <div
                  className="w-full rounded-t-md bg-yellow-400/70"
                  style={{ height: `${Math.max((day.orders / maxDailyOrders) * 80, day.orders > 0 ? 4 : 2)}px` }}
                />
                <p className="text-[8px] text-gray-500 text-center leading-tight">{day.date.split(" ")[0]}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── AI AGENTS ─────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Bot size={14} className="text-yellow-400" />
            <h2 className="text-xs font-bold text-yellow-400 uppercase tracking-widest">Agentes de IA</h2>
          </div>
          <div className="space-y-3">

            {/* 1. Dispatch */}
            <AgentCard title="Dispatch Agent" icon={Zap} iconColor="bg-yellow-500" agent={dispatch} onRun={runDispatch} running={dispatching}>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><p className="text-lg font-black text-white">{dispatch?.unassignedOrders ?? 0}</p><p className="text-[10px] text-gray-400">Sin asignar</p></div>
                <div><p className="text-lg font-black text-white">{dispatch?.availableDrivers ?? 0}</p><p className="text-[10px] text-gray-400">Disponibles</p></div>
                <div><p className="text-lg font-black text-white">{dispatch?.recommendations?.length ?? 0}</p><p className="text-[10px] text-gray-400">Matches</p></div>
              </div>
              {dispatch?.recommendations?.length > 0 && (
                <div className="mt-2 space-y-1">
                  {dispatch.recommendations.slice(0, 3).map((r: any) => (
                    <div key={r.orderId} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-1.5">
                      <span className="text-xs text-gray-300">Pedido #{r.orderId}</span>
                      <span className="text-xs font-bold text-yellow-400">→ {r.driverName}</span>
                      <span className="text-[10px] text-gray-500">Score {r.score}</span>
                    </div>
                  ))}
                </div>
              )}
            </AgentCard>

            {/* 2. Fraud */}
            <AgentCard title="Fraud Detection Agent" icon={Shield} iconColor="bg-red-600" agent={fraud}>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div><p className={`text-lg font-black ${fraud?.highSeverity > 0 ? "text-red-400" : "text-green-400"}`}>{fraud?.highSeverity ?? 0}</p><p className="text-[10px] text-gray-400">Alta severidad</p></div>
                <div><p className={`text-lg font-black ${fraud?.totalAlerts > 0 ? "text-yellow-400" : "text-green-400"}`}>{fraud?.totalAlerts ?? 0}</p><p className="text-[10px] text-gray-400">Total alertas</p></div>
              </div>
              {fraud?.alerts?.length > 0 && (
                <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto">
                  {fraud.alerts.slice(0, 5).map((alert: any, i: number) => (
                    <div key={i} className={`flex items-start gap-2 rounded-lg px-3 py-2 ${alert.severity === "high" ? "bg-red-400/10 border border-red-400/20" : "bg-yellow-400/8 border border-yellow-400/15"}`}>
                      <AlertTriangle size={12} className={alert.severity === "high" ? "text-red-400 flex-shrink-0 mt-0.5" : "text-yellow-400 flex-shrink-0 mt-0.5"} />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-white">{alert.entityName}</p>
                        <p className="text-[10px] text-gray-400">{alert.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AgentCard>

            {/* 3. Surge */}
            <AgentCard title="Surge Pricing Agent" icon={TrendingUp} iconColor="bg-orange-500" agent={surge}>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><p className="text-lg font-black text-white">{surge?.pendingOrders ?? 0}</p><p className="text-[10px] text-gray-400">Demanda</p></div>
                <div><p className="text-lg font-black text-white">{surge?.onlineDrivers ?? 0}</p><p className="text-[10px] text-gray-400">Oferta</p></div>
                <div><p className={`text-lg font-black ${surge?.isSurge ? "text-red-400" : "text-green-400"}`}>{surge?.surgeMultiplier ?? 1}x</p><p className="text-[10px] text-gray-400">Multiplicador</p></div>
              </div>
              {surge?.recommendation && (
                <div className={`mt-2 rounded-xl px-3 py-2 text-xs font-bold ${surge.isSurge ? "bg-red-400/10 border border-red-400/20 text-red-300" : "bg-white/5 text-gray-400"}`}>
                  {surge.recommendation}
                </div>
              )}
            </AgentCard>

            {/* 4. ETA */}
            <AgentCard title="ETA Agent" icon={Clock} iconColor="bg-blue-600" agent={eta}>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><p className="text-lg font-black text-white">{eta?.avgPrepTimeAcrossBusinesses ?? 0}m</p><p className="text-[10px] text-gray-400">Prep avg</p></div>
                <div><p className="text-lg font-black text-white">{eta?.suggestedBaseETA ?? 0}m</p><p className="text-[10px] text-gray-400">ETA sugerido</p></div>
                <div><p className={`text-lg font-black ${(eta?.trafficMultiplier ?? 1) > 1 ? "text-orange-400" : "text-green-400"}`}>{eta?.trafficMultiplier ?? 1}x</p><p className="text-[10px] text-gray-400">Tráfico</p></div>
              </div>
              {eta?.note && <p className="mt-2 text-[10px] text-gray-400 bg-white/5 rounded-lg px-3 py-2">{eta.note}</p>}
            </AgentCard>

            {/* 5. Menu Optimizer */}
            <AgentCard title="Menu Optimizer Agent" icon={ChefHat} iconColor="bg-green-600" agent={menu}>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><p className="text-lg font-black text-white">{menu?.activeProducts ?? 0}</p><p className="text-[10px] text-gray-400">Activos</p></div>
                <div><p className={`text-lg font-black ${menu?.outOfStock > 0 ? "text-red-400" : "text-green-400"}`}>{menu?.outOfStock ?? 0}</p><p className="text-[10px] text-gray-400">Agotados</p></div>
                <div><p className={`text-lg font-black ${menu?.insights?.length > 0 ? "text-yellow-400" : "text-green-400"}`}>{menu?.insights?.length ?? 0}</p><p className="text-[10px] text-gray-400">Insights</p></div>
              </div>
              {menu?.insights?.length > 0 && (
                <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto">
                  {menu.insights.slice(0, 4).map((insight: any, i: number) => (
                    <div key={i} className={`flex items-start gap-2 rounded-lg px-3 py-2 ${insight.severity === "high" ? "bg-red-400/10 border border-red-400/20" : "bg-yellow-400/8 border border-yellow-400/15"}`}>
                      <span className="text-[10px] flex-shrink-0 mt-0.5">{insight.severity === "high" ? "🔴" : "🟡"}</span>
                      <div>
                        <p className="text-[11px] font-bold text-white">{insight.productName}</p>
                        <p className="text-[10px] text-gray-400">{insight.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {menu?.topProducts?.length > 0 && (
                <div className="mt-2">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1.5">Top productos (30 días)</p>
                  {menu.topProducts.map((p: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-1">
                      <span className="text-[11px] text-gray-300">#{i + 1} {p.productName}</span>
                      <span className="text-[11px] font-bold text-yellow-400">{p.quantitySold} uds</span>
                    </div>
                  ))}
                </div>
              )}
            </AgentCard>

            {/* 6. Support Agent */}
            <AgentCard title="Customer Support Agent" icon={MessageSquare} iconColor="bg-indigo-600" agent={{ status: "active", lastRun: new Date().toISOString() }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-300">Bot activo con respuestas a FAQ, estados de pedido y escalación a WhatsApp.</p>
                </div>
                <Link href="/customer/support">
                  <button className="ml-3 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold hover:bg-indigo-500/30 transition flex-shrink-0">
                    Ver <ArrowUpRight size={10} />
                  </button>
                </Link>
              </div>
            </AgentCard>

          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Últimos 10 pedidos</h2>
            <Link href="/admin/orders"><span className="text-xs text-yellow-400 font-bold">Ver todos →</span></Link>
          </div>
          <div className="divide-y divide-white/5">
            {overview?.recentOrders.map(order => (
              <div key={order.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-black text-gray-500 flex-shrink-0">#{order.id}</span>
                  <span className="text-xs text-gray-300 truncate">{order.businessName}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-bold text-white">{formatDOP(order.totalAmount)}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors[order.status] ?? "bg-white/10 text-gray-400"}`}>{order.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
