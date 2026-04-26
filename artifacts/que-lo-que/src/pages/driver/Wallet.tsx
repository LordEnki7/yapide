import { useState } from "react";
import { Link } from "wouter";
import { useGetDriverWallet, getGetDriverWalletQueryKey, useGetDriverTransactions, getGetDriverTransactionsQueryKey } from "@workspace/api-client-react";
import { formatDOP } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import LangToggle from "@/components/LangToggle";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, AlertTriangle, TrendingUp, Wallet, ArrowDownRight, ArrowUpRight, Gift, ChevronDown, ChevronRight, Store } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";
import { useQuery } from "@tanstack/react-query";

interface EarningsDay {
  date: string;
  earnings: number;
  orders: Array<{
    id: number;
    driverEarnings: number;
    totalAmount: number;
    paymentMethod: string;
    businessName: string;
    updatedAt: string;
  }>;
}

export default function DriverWallet() {
  const { t } = useLang();
  const [tab, setTab] = useState<"history" | "breakdown">("history");
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const { data: wallet, isLoading: walletLoading } = useGetDriverWallet({
    query: { queryKey: getGetDriverWalletQueryKey() }
  });
  const { data: transactions, isLoading: txnLoading } = useGetDriverTransactions({
    query: { queryKey: getGetDriverTransactionsQueryKey() }
  });
  const { data: earningsData, isLoading: earningsLoading } = useQuery({
    queryKey: ["driver-earnings"],
    queryFn: () => apiFetch("/api/drivers/me/earnings").then(r => r.json()) as Promise<{ days: EarningsDay[]; totalOrders: number }>,
    enabled: tab === "breakdown",
  });

  const cashOver80 = (wallet?.cashBalance ?? 0) >= 8000;
  const cashLocked = (wallet?.cashBalance ?? 0) >= 10000;

  const TRANSACTION_CONFIG: Record<string, { icon: typeof Wallet; label: string; colorClass: string; sign: string }> = {
    earning: { icon: ArrowUpRight, label: t.driverEarnType, colorClass: "text-green-400", sign: "+" },
    cash_collected: { icon: ArrowDownRight, label: t.cashType, colorClass: "text-red-400", sign: "-" },
    bonus: { icon: Gift, label: t.bonusType, colorClass: "text-yellow-400", sign: "+" },
    adjustment: { icon: Wallet, label: t.adjustType, colorClass: "text-blue-400", sign: "±" },
    settlement: { icon: TrendingUp, label: t.settlementType, colorClass: "text-purple-400", sign: "+" },
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("es-DO", { weekday: "short", day: "numeric", month: "short" });
  };

  return (
    <div className="min-h-screen bg-background text-white pb-8">
      <div className="bg-background border-b border-yellow-400/20 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/driver">
          <button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10 transition">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <h1 className="text-xl font-black text-yellow-400">{t.walletTitle}</h1>
        <div className="ml-auto">
          <LangToggle />
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {walletLoading ? (
          <Skeleton className="h-40 bg-white/8 rounded-2xl" />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-400/10 border border-green-400/30 rounded-2xl p-4 text-center">
                <p className="text-xs text-[#FFD700]/70 uppercase tracking-widest mb-1">{t.wallet}</p>
                <p className="text-2xl font-black text-green-400">{formatDOP(wallet?.walletBalance ?? 0)}</p>
                <p className="text-xs text-white/50">{t.walletBalance}</p>
              </div>
              <div className={`rounded-2xl p-4 text-center border ${cashLocked ? "bg-red-500/20 border-red-500/50" : cashOver80 ? "bg-yellow-400/10 border-yellow-400/40" : "bg-white/8 border-white/10"}`}>
                <p className="text-xs text-[#FFD700]/70 uppercase tracking-widest mb-1">{t.cashBalance}</p>
                <p className={`text-2xl font-black ${cashLocked ? "text-red-400" : cashOver80 ? "text-yellow-400" : "text-white"}`}>
                  {formatDOP(wallet?.cashBalance ?? 0)}
                </p>
                <p className="text-xs text-white/50">{t.cashBalance}</p>
              </div>
            </div>

            {cashOver80 && (
              <div className={`flex items-start gap-3 p-4 rounded-2xl border ${cashLocked ? "bg-red-500/10 border-red-500/40" : "bg-yellow-400/10 border-yellow-400/40"}`}>
                <AlertTriangle size={18} className={cashLocked ? "text-red-400 flex-shrink-0 mt-0.5" : "text-yellow-400 flex-shrink-0 mt-0.5"} />
                <div>
                  <p className={`font-black text-sm ${cashLocked ? "text-red-400" : "text-yellow-400"}`}>
                    {cashLocked ? t.cashLocked : t.cashWarning}
                  </p>
                  <p className="text-xs text-white/60 mt-1">
                    {cashLocked ? t.cashLockedMsg : t.cashWarningMsg(formatDOP(wallet?.cashBalance ?? 0))}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/8 border border-white/10 rounded-xl p-3">
                <p className="text-xs text-[#FFD700]/70">{t.today}</p>
                <p className="text-lg font-black text-yellow-400">{formatDOP(wallet?.totalEarningsToday ?? 0)}</p>
                <p className="text-xs text-white/50">{wallet?.deliveriesToday ?? 0} {t.deliveries}</p>
              </div>
              <div className="bg-white/8 border border-white/10 rounded-xl p-3">
                <p className="text-xs text-[#FFD700]/70">{t.thisWeek}</p>
                <p className="text-lg font-black text-yellow-400">{formatDOP(wallet?.totalEarningsWeek ?? 0)}</p>
                <p className="text-xs text-white/50">{wallet?.deliveriesWeek ?? 0} {t.deliveries}</p>
              </div>
            </div>
          </>
        )}

        {/* Tab selector */}
        <div className="flex bg-white/8 rounded-xl p-1 gap-1">
          <button
            onClick={() => setTab("history")}
            className={`flex-1 text-sm font-bold py-2 rounded-lg transition ${tab === "history" ? "bg-[#FFD700] text-black" : "text-white/60 hover:text-white"}`}
          >
            {t.history}
          </button>
          <button
            onClick={() => setTab("breakdown")}
            className={`flex-1 text-sm font-bold py-2 rounded-lg transition ${tab === "breakdown" ? "bg-[#FFD700] text-black" : "text-white/60 hover:text-white"}`}
          >
            Por entrega
          </button>
        </div>

        {/* History tab */}
        {tab === "history" && (
          <div>
            {txnLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 bg-white/8 rounded-xl" />)}
              </div>
            ) : transactions?.length === 0 ? (
              <div className="text-center py-10 text-white/60">
                <Wallet size={32} className="mx-auto mb-2 opacity-30" />
                <p>{t.noTransactions}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions?.map((txn) => {
                  const config = TRANSACTION_CONFIG[txn.type] ?? TRANSACTION_CONFIG.adjustment;
                  const Icon = config.icon;
                  return (
                    <div key={txn.id} data-testid={`transaction-${txn.id}`} className="bg-white/8 border border-white/10 rounded-xl p-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center flex-shrink-0">
                        <Icon size={16} className={config.colorClass} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white">{config.label}</p>
                        <p className="text-xs text-white/60 truncate">{txn.description ?? ""}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-black text-sm ${config.colorClass}`}>
                          {config.sign}{formatDOP(Math.abs(txn.amount))}
                        </p>
                        <p className="text-xs text-white/50">{new Date(txn.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Breakdown tab */}
        {tab === "breakdown" && (
          <div>
            {earningsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 bg-white/8 rounded-xl" />)}
              </div>
            ) : !earningsData || earningsData.days.length === 0 ? (
              <div className="text-center py-10 text-white/60">
                <TrendingUp size={32} className="mx-auto mb-2 opacity-30" />
                <p>Sin entregas completadas aún</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-white/40 text-center">{earningsData.totalOrders} entregas en total</p>
                {earningsData.days.map(day => (
                  <div key={day.date} className="bg-white/8 border border-white/10 rounded-xl overflow-hidden">
                    <button
                      className="w-full p-4 flex items-center gap-3 hover:bg-white/10 transition"
                      onClick={() => setExpandedDay(expandedDay === day.date ? null : day.date)}
                    >
                      <div className="flex-1 text-left">
                        <p className="font-bold text-sm text-white capitalize">{formatDate(day.date)}</p>
                        <p className="text-xs text-white/50">{day.orders.length} {day.orders.length === 1 ? "entrega" : "entregas"}</p>
                      </div>
                      <p className="font-black text-green-400">{formatDOP(day.earnings)}</p>
                      {expandedDay === day.date
                        ? <ChevronDown size={16} className="text-white/40" />
                        : <ChevronRight size={16} className="text-white/40" />}
                    </button>
                    {expandedDay === day.date && (
                      <div className="border-t border-white/10 divide-y divide-white/5">
                        {day.orders.map(o => (
                          <div key={o.id} className="px-4 py-3 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#0057B7]/30 flex items-center justify-center flex-shrink-0">
                              <Store size={14} className="text-[#0057B7]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-white truncate">{o.businessName}</p>
                              <p className="text-xs text-white/40">Orden #{o.id} · {o.paymentMethod === "cash" ? "Efectivo" : "Digital"}</p>
                            </div>
                            <p className="font-black text-sm text-green-400">+{formatDOP(o.driverEarnings)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
