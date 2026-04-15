import { Link } from "wouter";
import { useGetDriverWallet, getGetDriverWalletQueryKey, useGetDriverTransactions, getGetDriverTransactionsQueryKey } from "@workspace/api-client-react";
import { formatDOP } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import LangToggle from "@/components/LangToggle";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, AlertTriangle, TrendingUp, Wallet, ArrowDownRight, ArrowUpRight, Gift } from "lucide-react";

export default function DriverWallet() {
  const { t } = useLang();
  const { data: wallet, isLoading: walletLoading } = useGetDriverWallet({
    query: { queryKey: getGetDriverWalletQueryKey() }
  });
  const { data: transactions, isLoading: txnLoading } = useGetDriverTransactions({
    query: { queryKey: getGetDriverTransactionsQueryKey() }
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
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">{t.wallet}</p>
                <p className="text-2xl font-black text-green-400">{formatDOP(wallet?.walletBalance ?? 0)}</p>
                <p className="text-xs text-gray-500">{t.walletBalance}</p>
              </div>
              <div className={`rounded-2xl p-4 text-center border ${cashLocked ? "bg-red-500/20 border-red-500/50" : cashOver80 ? "bg-yellow-400/10 border-yellow-400/40" : "bg-white/8 border-white/10"}`}>
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">{t.cashBalance}</p>
                <p className={`text-2xl font-black ${cashLocked ? "text-red-400" : cashOver80 ? "text-yellow-400" : "text-white"}`}>
                  {formatDOP(wallet?.cashBalance ?? 0)}
                </p>
                <p className="text-xs text-gray-500">{t.cashBalance}</p>
              </div>
            </div>

            {cashOver80 && (
              <div className={`flex items-start gap-3 p-4 rounded-2xl border ${cashLocked ? "bg-red-500/10 border-red-500/40" : "bg-yellow-400/10 border-yellow-400/40"}`}>
                <AlertTriangle size={18} className={cashLocked ? "text-red-400 flex-shrink-0 mt-0.5" : "text-yellow-400 flex-shrink-0 mt-0.5"} />
                <div>
                  <p className={`font-black text-sm ${cashLocked ? "text-red-400" : "text-yellow-400"}`}>
                    {cashLocked ? t.cashLocked : t.cashWarning}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {cashLocked ? t.cashLockedMsg : t.cashWarningMsg(formatDOP(wallet?.cashBalance ?? 0))}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/8 border border-white/10 rounded-xl p-3">
                <p className="text-xs text-gray-400">{t.today}</p>
                <p className="text-lg font-black text-yellow-400">{formatDOP(wallet?.totalEarningsToday ?? 0)}</p>
                <p className="text-xs text-gray-500">{wallet?.deliveriesToday ?? 0} {t.deliveries}</p>
              </div>
              <div className="bg-white/8 border border-white/10 rounded-xl p-3">
                <p className="text-xs text-gray-400">{t.thisWeek}</p>
                <p className="text-lg font-black text-yellow-400">{formatDOP(wallet?.totalEarningsWeek ?? 0)}</p>
                <p className="text-xs text-gray-500">{wallet?.deliveriesWeek ?? 0} {t.deliveries}</p>
              </div>
            </div>
          </>
        )}

        <div>
          <h2 className="font-bold text-sm text-gray-400 uppercase tracking-widest mb-3">{t.history}</h2>
          {txnLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 bg-white/8 rounded-xl" />)}
            </div>
          ) : transactions?.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
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
                      <p className="text-xs text-gray-400 truncate">{txn.description ?? ""}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-black text-sm ${config.colorClass}`}>
                        {config.sign}{formatDOP(Math.abs(txn.amount))}
                      </p>
                      <p className="text-xs text-gray-500">{new Date(txn.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
