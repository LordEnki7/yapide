import { Link } from "wouter";
import { useGetAvailableJobs, getGetAvailableJobsQueryKey, useAcceptJob, useDeclineJob } from "@workspace/api-client-react";
import { formatDOP } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import LangToggle from "@/components/LangToggle";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Banknote, CreditCard, Clock, Navigation } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DriverJobs() {
  const { data: jobs, isLoading } = useGetAvailableJobs({
    query: { queryKey: getGetAvailableJobsQueryKey() }
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLang();

  const accept = useAcceptJob({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAvailableJobsQueryKey() });
        toast({ title: t.orderSent, description: "🛵💨" });
      },
      onError: () => toast({ title: t.error, description: t.error, variant: "destructive" }),
    }
  });

  const decline = useDeclineJob({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAvailableJobsQueryKey() });
      }
    }
  });

  return (
    <div className="min-h-screen bg-background text-white">
      <div className="bg-background border-b border-yellow-400/20 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/driver">
          <button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10 transition">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <h1 className="text-xl font-black text-yellow-400">{t.availableJobs}</h1>
        <div className="ml-auto flex items-center gap-2">
          <LangToggle />
          {jobs && jobs.length > 0 && (
            <Badge className="bg-yellow-400 text-black font-bold">{jobs.length}</Badge>
          )}
        </div>
      </div>

      <div className="px-4 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <Skeleton key={i} className="h-44 bg-white/8 rounded-2xl" />)}
          </div>
        ) : jobs?.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-3">😴</p>
            <p className="text-xl font-black text-white mb-2">{t.noJobs}</p>
            <p className="text-gray-400">{t.noJobsMsg}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs?.map((job) => (
              <div key={job.id} data-testid={`job-card-${job.id}`} className="bg-white/8 border border-yellow-400/20 rounded-2xl p-4 shadow-[0_0_20px_rgba(255,215,0,0.05)]">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-1 uppercase tracking-widest">#{job.id}</p>
                    <p className="font-black text-xl text-yellow-400">{formatDOP(job.driverEarnings)}</p>
                    <p className="text-xs text-gray-400">{t.yourEarning}</p>
                  </div>
                  <Badge className={`border ${job.paymentMethod === "cash" ? "bg-green-400/20 text-green-400 border-green-400/40" : "bg-blue-400/20 text-blue-400 border-blue-400/40"}`}>
                    {job.paymentMethod === "cash" ? <Banknote size={12} className="mr-1 inline" /> : <CreditCard size={12} className="mr-1 inline" />}
                    {job.paymentMethod === "cash" ? t.cash : t.card}
                  </Badge>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-start gap-2 text-sm text-gray-300">
                    <MapPin size={14} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                    <span className="flex-1">{job.deliveryAddress}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-sm text-gray-400 flex-1">
                      <Clock size={12} />
                      <span>~25 min</span>
                    </div>
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(job.deliveryAddress ?? "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold hover:bg-blue-500/20 transition"
                    >
                      <Navigation size={11} />
                      Maps
                    </a>
                    <a
                      href={`https://waze.com/ul?q=${encodeURIComponent(job.deliveryAddress ?? "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold hover:bg-cyan-500/20 transition"
                    >
                      <Navigation size={11} />
                      Waze
                    </a>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-3 flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-400">{t.total}</span>
                  <span className="font-bold text-white">{formatDOP(job.totalAmount + job.deliveryFee)}</span>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 border-white/20 text-gray-400 hover:border-red-400/50 hover:text-red-400 font-bold"
                    onClick={() => decline.mutate({ orderId: job.id })}
                    disabled={decline.isPending}
                  >
                    {t.decline}
                  </Button>
                  <Button
                    className="flex-2 flex-grow-[2] bg-yellow-400 text-black font-black hover:bg-yellow-300 shadow-[0_0_20px_rgba(255,215,0,0.3)]"
                    onClick={() => accept.mutate({ orderId: job.id })}
                    disabled={accept.isPending}
                    data-testid={`button-accept-${job.id}`}
                  >
                    {t.accept}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
