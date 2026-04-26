import { Link } from "wouter";
import { useGetMyDriver, getGetMyDriverQueryKey, useUpdateDriverStatus, useGetDriverStats, getGetDriverStatsQueryKey, useAcceptJob, useDeclineJob, getGetAvailableJobsQueryKey } from "@workspace/api-client-react";
import { getStoredUser, formatDOP } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import LangToggle from "@/components/LangToggle";
import NotificationBell from "@/components/NotificationBell";
import ImageUpload from "@/components/ImageUpload";
import JobAlertModal from "@/components/JobAlertModal";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Zap, Wallet, Package, TrendingUp, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef, useState } from "react";

const CASH_LIMIT = 10000;
const CASH_WARNING = 8000;

export default function DriverDashboard() {
  const user = getStoredUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLang();
  const [alertJob, setAlertJob] = useState<any | null>(null);
  const seenJobIds = useRef<Set<number>>(new Set());

  const { data: driver, isLoading: driverLoading } = useGetMyDriver({
    query: { queryKey: getGetMyDriverQueryKey() }
  });

  const { data: stats } = useGetDriverStats({
    query: { queryKey: getGetDriverStatsQueryKey() }
  });

  const updateStatus = useUpdateDriverStatus({
    mutation: {
      onSuccess: (d) => {
        queryClient.invalidateQueries({ queryKey: getGetMyDriverQueryKey() });
        toast({ title: d.isOnline ? t.online : t.offline });
      },
      onError: () => {
        toast({ title: t.error, description: t.error, variant: "destructive" });
      }
    }
  });

  const toggleOnline = () => {
    if (!driver) return;
    updateStatus.mutate({ isOnline: !driver.isOnline });
  };

  const { data: availableJobs } = useQuery({
    queryKey: getGetAvailableJobsQueryKey(),
    queryFn: async () => {
      const res = await fetch("/api/driver/available-jobs", { credentials: "include" });
      return res.ok ? res.json() : [];
    },
    refetchInterval: driver?.isOnline ? 8000 : false,
    enabled: !!driver?.isOnline,
  });

  const acceptJob = useAcceptJob({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAvailableJobsQueryKey() });
        setAlertJob(null);
        toast({ title: "¡Pedido aceptado!", description: "Ve a recoger en el negocio 🛵" });
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.error ?? t.error;
        toast({ title: "Error", description: msg, variant: "destructive" });
        setAlertJob(null);
      },
    }
  });

  const declineJob = useDeclineJob({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAvailableJobsQueryKey() });
        setAlertJob(null);
      },
    }
  });

  useEffect(() => {
    if (!availableJobs?.length || !driver?.isOnline) return;
    const newJob = availableJobs.find((j: any) => !seenJobIds.current.has(j.id));
    if (newJob && !alertJob) {
      seenJobIds.current.add(newJob.id);
      setAlertJob(newJob);
    }
  }, [availableJobs, driver?.isOnline]);

  const handlePhotoUploaded = async (objectPath: string) => {
    const res = await fetch("/api/drivers/me/photo", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoUrl: objectPath }),
    });
    if (res.ok) {
      queryClient.invalidateQueries({ queryKey: getGetMyDriverQueryKey() });
      toast({ title: "¡Foto actualizada!" });
    }
  };

  if (driverLoading) return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      <Skeleton className="h-32 bg-white/8 rounded-2xl" />
      <Skeleton className="h-24 bg-white/8 rounded-2xl" />
    </div>
  );

  if (driver && (driver as any).approvalStatus === "pending") return (
    <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-6 text-center gap-6">
      <div className="w-24 h-24 rounded-full bg-yellow-400/15 border-2 border-yellow-400/40 flex items-center justify-center text-5xl">⏳</div>
      <div>
        <h1 className="text-2xl font-black text-yellow-400 mb-2">Solicitud en revisión</h1>
        <p className="text-white/70 text-sm leading-relaxed max-w-xs">
          Tu perfil de motorista está siendo revisado por nuestro equipo. Te notificaremos cuando seas aprobado.
        </p>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 w-full max-w-xs space-y-2 text-left">
        <p className="text-xs font-black text-[#FFD700]/80 uppercase tracking-widest">¿Qué sigue?</p>
        <div className="flex items-start gap-2 text-sm text-white/80">
          <span className="text-yellow-400 flex-shrink-0">✓</span>
          <span>Solicitud enviada</span>
        </div>
        <div className="flex items-start gap-2 text-sm text-white/60">
          <span className="flex-shrink-0">⏳</span>
          <span>Revisión del equipo YaPide (24–48h)</span>
        </div>
        <div className="flex items-start gap-2 text-sm text-white/60">
          <span className="flex-shrink-0">🛵</span>
          <span>¡Empieza a ganar!</span>
        </div>
      </div>
      <p className="text-xs text-white/50">¿Preguntas? Escríbenos al WhatsApp 📱</p>
    </div>
  );

  if (driver && (driver as any).approvalStatus === "rejected") return (
    <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-6 text-center gap-5">
      <div className="w-20 h-20 rounded-full bg-red-500/15 border-2 border-red-500/40 flex items-center justify-center text-4xl">❌</div>
      <div>
        <h1 className="text-xl font-black text-red-400 mb-2">Solicitud rechazada</h1>
        <p className="text-white/70 text-sm max-w-xs">Tu solicitud no fue aprobada en este momento. Contáctanos para más información.</p>
      </div>
    </div>
  );

  const cashWarning = (driver?.cashBalance ?? 0) >= CASH_WARNING;
  const cashLocked = (driver?.cashBalance ?? 0) >= CASH_LIMIT;

  return (
    <div className="min-h-screen bg-background text-white pb-8">
      {alertJob && (
        <JobAlertModal
          job={alertJob}
          onAccept={(id) => acceptJob.mutate({ orderId: id })}
          onDecline={(id) => { declineJob.mutate({ orderId: id }); }}
          accepting={acceptJob.isPending}
          declining={declineJob.isPending}
        />
      )}
      <div className="bg-background border-b border-yellow-400/20 px-4 pt-4 pb-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <ImageUpload
              currentUrl={driver?.photoUrl ? `/api/storage/objects/${driver.photoUrl}` : undefined}
              onUploaded={handlePhotoUploaded}
              shape="circle"
              label=""
              size="sm"
            />
            <div>
              <p className="text-xs text-[#FFD700]/70 uppercase tracking-widest">{t.driverTitle}</p>
              <h1 className="text-lg font-black text-yellow-400">{user?.name ?? "YaPide 🛵"}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <LangToggle />
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/8 border border-white/10">
              <div className={`w-2 h-2 rounded-full ${driver?.isOnline ? "bg-green-400 animate-pulse" : "bg-gray-500"}`} />
              <span className="text-xs font-bold">{driver?.isOnline ? t.online : t.offline}</span>
            </div>
          </div>
        </div>

        {/* Today's earnings banner */}
        <div className="flex items-center justify-between bg-yellow-400/10 border border-yellow-400/25 rounded-2xl px-4 py-3 mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-yellow-400" />
            <div>
              <p className="text-[10px] text-yellow-400/70 uppercase tracking-widest font-bold">Hoy</p>
              <p className="text-2xl font-black text-yellow-400 leading-none">{formatDOP(stats?.earningsToday ?? 0)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-white leading-none">{stats?.deliveriesToday ?? 0}</p>
            <p className="text-[10px] text-white/50 uppercase tracking-widest">{stats?.deliveriesToday === 1 ? "entrega" : "entregas"}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {cashWarning && (
          <div className={`flex items-center gap-3 p-4 rounded-2xl border ${cashLocked ? "bg-red-500/20 border-red-500/50" : "bg-yellow-400/10 border-yellow-400/40"}`}>
            <AlertTriangle size={20} className={cashLocked ? "text-red-400" : "text-yellow-400"} />
            <div>
              <p className={`font-black text-sm ${cashLocked ? "text-red-400" : "text-yellow-400"}`}>
                {cashLocked ? t.cashLocked : t.cashWarning}
              </p>
              <p className="text-xs text-white/60">
                {cashLocked ? t.cashLockedMsg : t.cashWarningMsg(formatDOP(driver?.cashBalance ?? 0))}
              </p>
            </div>
          </div>
        )}

        <div className="bg-white/8 border border-white/10 rounded-2xl p-6 text-center">
          <p className="text-white/60 text-sm mb-4">
            {driver?.isOnline ? t.receivingOrders : t.activateToReceive}
          </p>
          <button
            onClick={toggleOnline}
            disabled={updateStatus.isPending || (cashLocked && !driver?.isOnline)}
            className={`w-32 h-32 rounded-full border-4 font-black text-lg transition-all shadow-[0_0_30px] ${
              driver?.isOnline
                ? "bg-green-400 border-green-300 text-black shadow-green-400/30 hover:bg-green-300"
                : "bg-white/8 border-yellow-400/40 text-yellow-400 shadow-transparent hover:border-yellow-400 hover:shadow-yellow-400/20"
            } disabled:opacity-50`}
          >
            {driver?.isOnline ? t.active : t.driverInactive}
          </button>
        </div>

        <div className="bg-white/8 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-green-400" />
            <div>
              <p className="text-xs text-[#FFD700]/70 font-bold uppercase">{t.wallet}</p>
              <p className="text-2xl font-black text-green-400">{formatDOP(driver?.walletBalance ?? 0)}</p>
            </div>
          </div>
          <p className="text-xs text-white/50">{t.walletBalance}</p>
        </div>

        <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-yellow-400" />
              <span className="text-sm font-bold text-white">{t.deliveryStreak}</span>
            </div>
            <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/40 text-xs">
              {driver?.totalDeliveries ?? 0} {t.earningsTotal}
            </Badge>
          </div>
          <Progress value={stats?.bonusProgress ?? 0} className="h-3 mb-2 bg-white/10" />
          <p className="text-xs text-white/60">
            {stats?.currentStreak ?? 0}/10 → {t.nextBonus(formatDOP(500))}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link href="/driver/jobs">
            <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-2xl p-4 text-center hover:bg-yellow-400/20 transition cursor-pointer">
              <Package size={24} className="text-yellow-400 mx-auto mb-2" />
              <p className="font-bold text-yellow-400 text-sm">{t.viewJobs}</p>
            </div>
          </Link>
          <Link href="/driver/wallet">
            <div className="bg-white/8 border border-white/10 rounded-2xl p-4 text-center hover:border-yellow-400/30 transition cursor-pointer">
              <Wallet size={24} className="text-white/70 mx-auto mb-2" />
              <p className="font-bold text-white/70 text-sm">{t.myWallet}</p>
            </div>
          </Link>
        </div>
        <Link href="/driver/ratings">
          <div className="bg-white/8 border border-white/10 rounded-2xl p-4 flex items-center gap-3 hover:border-yellow-400/30 transition cursor-pointer">
            <span className="text-xl">⭐</span>
            <div>
              <p className="font-bold text-sm">Mis calificaciones</p>
              <p className="text-xs text-white/60">Historial de estrellas de clientes</p>
            </div>
            <span className="ml-auto text-white/50 text-lg">›</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
