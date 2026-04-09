import { Link } from "wouter";
import { useGetMyPoints, getGetMyPointsQueryKey, useRedeemPoints } from "@workspace/api-client-react";
import { useLang } from "@/lib/lang";
import LangToggle from "@/components/LangToggle";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Star, Gift, TrendingUp, ArrowUpRight, ArrowDownLeft, Info, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TIER_COLORS = {
  silver: "from-gray-400 to-gray-600",
  gold: "from-yellow-400 to-yellow-600",
  platinum: "from-purple-400 to-purple-700",
};

function getTier(points: number) {
  if (points >= 500) return "platinum";
  if (points >= 250) return "gold";
  return "silver";
}

export default function CustomerPoints() {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading, isError } = useGetMyPoints({
    query: { queryKey: getGetMyPointsQueryKey(), retry: false }
  });

  const redeem = useRedeemPoints({
    mutation: {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: getGetMyPointsQueryKey() });
        toast({ title: t.redeemSuccess, description: t.redeemSuccessMsg(res.discountAmount) });
      },
      onError: () => {
        toast({ title: t.notEnoughPoints, description: t.notEnoughPointsMsg(data ? data.nextRewardAt - data.points : 500), variant: "destructive" });
      }
    }
  });

  const tier = getTier(data?.points ?? 0);
  const progressPct = data ? Math.min((data.progress / data.nextRewardAt) * 100, 100) : 0;
  const pointsNeeded = data ? Math.max(0, data.nextRewardAt - data.progress) : 500;
  const canRedeem = (data?.points ?? 0) >= (data?.nextRewardAt ?? 500);

  return (
    <div className="min-h-screen bg-background text-white pb-28">
      <div className="bg-background border-b border-yellow-400/20 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/customer">
          <button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10 transition">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <h1 className="text-xl font-black text-yellow-400">{t.pointsTitle}</h1>
        <div className="ml-auto">
          <LangToggle />
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {isLoading ? (
          <>
            <Skeleton className="h-44 bg-white/8 rounded-2xl" />
            <Skeleton className="h-24 bg-white/8 rounded-2xl" />
          </>
        ) : isError ? (
          <div className="space-y-4">
            <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-2xl p-6 text-center">
              <Star size={48} className="text-yellow-400 mx-auto mb-3" fill="currentColor" />
              <h2 className="font-black text-xl text-yellow-400 mb-2">{t.pointsTitle}</h2>
              <p className="text-sm text-gray-400 mb-5">{t.howItWorksLine1}</p>
              <Link href="/login">
                <Button className="bg-yellow-400 text-black font-black hover:bg-yellow-300">
                  {t.signIn}
                </Button>
              </Link>
            </div>
            <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Info size={16} className="text-yellow-400" />
                <h3 className="font-bold text-sm text-gray-300">{t.howItWorks}</h3>
              </div>
              <div className="space-y-2">
                {[t.howItWorksLine1, t.howItWorksLine2, t.howItWorksLine3].map((line, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-yellow-400/20 flex items-center justify-center text-xs font-bold text-yellow-400 flex-shrink-0">{i + 1}</div>
                    <p className="text-sm text-gray-300">{line}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${tier === "platinum" ? TIER_COLORS.platinum : tier === "gold" ? TIER_COLORS.gold : TIER_COLORS.silver} p-1`}>
              <div className="bg-background rounded-xl p-5">
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">{t.pointsBalance}</p>
                    <p className={`text-5xl font-black ${tier === "platinum" ? "text-purple-400" : tier === "gold" ? "text-yellow-400" : "text-gray-300"}`}>
                      {data?.points.toLocaleString() ?? 0}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">{t.pointsTier(data?.points ?? 0)}</p>
                  </div>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br ${tier === "platinum" ? TIER_COLORS.platinum : tier === "gold" ? TIER_COLORS.gold : TIER_COLORS.silver}`}>
                    <Star size={28} className="text-black" fill="currentColor" />
                  </div>
                </div>

                {(data?.redeemableRewards ?? 0) > 0 && (
                  <div className="mb-4 bg-yellow-400/10 border border-yellow-400/30 rounded-xl px-3 py-2">
                    <p className="text-yellow-400 font-black text-sm">{t.redeemableRewards(data!.redeemableRewards)}</p>
                  </div>
                )}

                <div className="mb-2">
                  <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                    <span>{t.pointsProgress(data?.progress ?? 0, data?.nextRewardAt ?? 500)}</span>
                    <span>🍔 RD${data?.redemptionValue}</span>
                  </div>
                  <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ${tier === "platinum" ? "from-purple-400 to-purple-600" : tier === "gold" ? "from-yellow-400 to-yellow-500" : "from-gray-400 to-gray-500"}`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  {canRedeem ? t.pointsReady : t.pointsNextReward(pointsNeeded)}
                </p>
              </div>
            </div>

            {canRedeem ? (
              <div className="bg-yellow-400/10 border-2 border-yellow-400/40 rounded-2xl p-5 text-center">
                <Gift size={36} className="text-yellow-400 mx-auto mb-3" />
                <p className="font-black text-lg text-yellow-400 mb-1">{t.pointsReady}</p>
                <p className="text-sm text-gray-400 mb-4">{t.pointsReadyMsg(data?.redemptionValue ?? 500)}</p>
                <Button
                  className="w-full bg-yellow-400 text-black font-black text-lg h-12 hover:bg-yellow-300 shadow-[0_0_30px_rgba(255,215,0,0.4)]"
                  onClick={() => redeem.mutate()}
                  disabled={redeem.isPending}
                >
                  {redeem.isPending ? t.redeeming : t.redeemNow}
                </Button>
              </div>
            ) : (
              <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Info size={16} className="text-yellow-400" />
                  <h3 className="font-bold text-sm text-gray-300">{t.howItWorks}</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-yellow-400/20 flex items-center justify-center text-xs font-bold text-yellow-400 flex-shrink-0">1</div>
                    <p className="text-sm text-gray-300">{t.howItWorksLine1}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-yellow-400/20 flex items-center justify-center text-xs font-bold text-yellow-400 flex-shrink-0">2</div>
                    <p className="text-sm text-gray-300">{t.howItWorksLine2}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-yellow-400/20 flex items-center justify-center text-xs font-bold text-yellow-400 flex-shrink-0">3</div>
                    <p className="text-sm text-gray-300">{t.howItWorksLine3}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">{t.pointsHistory}</h2>
              {data?.transactions.length === 0 ? (
                <div className="text-center py-12">
                  <TrendingUp size={32} className="mx-auto mb-2 text-gray-600" />
                  <p className="text-gray-400">{t.noPointsHistory}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data?.transactions.map((txn) => {
                    const isEarn = txn.amount > 0;
                    return (
                      <div key={txn.id} className="bg-white/8 border border-white/10 rounded-xl p-3 flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isEarn ? "bg-green-400/20" : "bg-yellow-400/20"}`}>
                          {isEarn ? <ArrowUpRight size={16} className="text-green-400" /> : <ArrowDownLeft size={16} className="text-yellow-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white">
                            {txn.type === "earn" ? t.earnType : txn.type === "redeem" ? t.redeemType : t.bonusPointsType}
                          </p>
                          {txn.description && <p className="text-xs text-gray-400 truncate">{txn.description}</p>}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`font-black text-sm ${isEarn ? "text-green-400" : "text-yellow-400"}`}>
                            {isEarn ? "+" : ""}{txn.amount}
                          </p>
                          <p className="text-xs text-gray-500">{new Date(txn.createdAt).toLocaleDateString()}</p>
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
