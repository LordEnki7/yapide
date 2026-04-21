import { Link } from "wouter";
import { useGetMyBusiness, getGetMyBusinessQueryKey, useUpdateBusiness, useGetBusinessStats, getGetBusinessStatsQueryKey } from "@workspace/api-client-react";
import { formatDOP, getStoredUser } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import LangToggle from "@/components/LangToggle";
import NotificationBell from "@/components/NotificationBell";
import ImageUpload from "@/components/ImageUpload";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, ChefHat, TrendingUp, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function BusinessDashboard() {
  const user = getStoredUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLang();

  const { data: business, isLoading: bizLoading } = useGetMyBusiness({
    query: { queryKey: getGetMyBusinessQueryKey() }
  });

  const { data: stats } = useGetBusinessStats({
    query: { queryKey: getGetBusinessStatsQueryKey() }
  });

  const updateStatus = useUpdateBusiness({
    mutation: {
      onSuccess: (b) => {
        queryClient.invalidateQueries({ queryKey: getGetMyBusinessQueryKey() });
        toast({ title: b.isOpen ? t.open : t.closed });
      }
    }
  });

  const updateBanner = useUpdateBusiness({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMyBusinessQueryKey() });
        toast({ title: "¡Foto de portada actualizada!" });
      }
    }
  });

  const handleBannerUploaded = (objectPath: string) => {
    if (!business) return;
    updateBanner.mutate({ businessId: business.id, data: { imageUrl: `/api/storage/objects/${objectPath}` } });
  };

  const handleLogoUploaded = async (objectPath: string) => {
    const res = await fetch("/api/businesses/mine/logo", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logoUrl: `/api/storage/objects/${objectPath}` }),
    });
    if (res.ok) {
      queryClient.invalidateQueries({ queryKey: getGetMyBusinessQueryKey() });
      toast({ title: "¡Logo actualizado!" });
    }
  };

  const [prepTime, setPrepTime] = useState<number | null>(null);
  const [savingPrepTime, setSavingPrepTime] = useState(false);

  const currentPrepTime = prepTime ?? business?.prepTimeMinutes ?? 25;

  const handlePrepTime = async (minutes: number) => {
    setPrepTime(minutes);
    setSavingPrepTime(true);
    try {
      await fetch("/api/businesses/mine/prep-time", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prepTimeMinutes: minutes }),
      });
      queryClient.invalidateQueries({ queryKey: getGetMyBusinessQueryKey() });
      toast({ title: `⏱ Tiempo de preparación: ${minutes} min` });
    } catch {
      toast({ title: t.error, variant: "destructive" });
    } finally {
      setSavingPrepTime(false);
    }
  };

  if (bizLoading) return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      <Skeleton className="h-32 bg-white/8 rounded-2xl" />
      <Skeleton className="h-24 bg-white/8 rounded-2xl" />
    </div>
  );

  if (business && (business as any).approvalStatus === "pending") return (
    <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-6 text-center gap-6">
      <div className="w-24 h-24 rounded-full bg-yellow-400/15 border-2 border-yellow-400/40 flex items-center justify-center text-5xl">🏪</div>
      <div>
        <h1 className="text-2xl font-black text-yellow-400 mb-2">Negocio en revisión</h1>
        <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
          Tu negocio está siendo revisado por el equipo de YaPide. Recibirás una notificación cuando seas aprobado.
        </p>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 w-full max-w-xs space-y-2 text-left">
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">¿Qué sigue?</p>
        <div className="flex items-start gap-2 text-sm text-gray-300">
          <span className="text-yellow-400 flex-shrink-0">✓</span>
          <span>Registro completado</span>
        </div>
        <div className="flex items-start gap-2 text-sm text-gray-400">
          <span className="flex-shrink-0">⏳</span>
          <span>Revisión del equipo (24–48h)</span>
        </div>
        <div className="flex items-start gap-2 text-sm text-gray-400">
          <span className="flex-shrink-0">🚀</span>
          <span>¡Empieza a recibir pedidos!</span>
        </div>
      </div>
      <p className="text-xs text-gray-600">¿Preguntas? Escríbenos al WhatsApp 📱</p>
    </div>
  );

  if (business && (business as any).approvalStatus === "rejected") return (
    <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-6 text-center gap-5">
      <div className="w-20 h-20 rounded-full bg-red-500/15 border-2 border-red-500/40 flex items-center justify-center text-4xl">❌</div>
      <div>
        <h1 className="text-xl font-black text-red-400 mb-2">Solicitud rechazada</h1>
        <p className="text-gray-400 text-sm max-w-xs">Tu negocio no fue aprobado en este momento. Contáctanos para más información.</p>
      </div>
    </div>
  );

  if (!business) return null;

  return (
    <div className="min-h-screen bg-background text-white pb-24">
      {business?.imageUrl && (
        <div className="relative h-44">
          <img src={business.imageUrl} alt={business.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black to-black/30" />
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <NotificationBell />
            <LangToggle />
          </div>
          <div className="absolute bottom-3 right-3">
            <ImageUpload
              currentUrl={undefined}
              onUploaded={handleBannerUploaded}
              shape="square"
              label=""
              size="sm"
            />
          </div>
        </div>
      )}

      <div className={`px-4 py-4 ${business?.imageUrl ? "-mt-6 relative" : ""}`}>
        {!business?.imageUrl && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <ImageUpload
                currentUrl={(business as any)?.logoUrl}
                onUploaded={handleLogoUploaded}
                shape="square"
                label="Logo"
                size="sm"
              />
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest">{t.businessPanel}</p>
                <h1 className="text-xl font-black text-yellow-400">{business?.name}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <LangToggle />
            </div>
          </div>
        )}

        <div className="bg-white/8 border border-white/10 rounded-2xl p-4 mb-4">
          {/* Logo + name row */}
          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex-shrink-0">
              <div className="w-14 h-14 rounded-xl overflow-hidden border border-white/15 bg-white/5">
                {(business as any)?.logoUrl ? (
                  <img src={(business as any).logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">🏪</div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1">
                <ImageUpload
                  currentUrl={(business as any)?.logoUrl}
                  onUploaded={handleLogoUploaded}
                  shape="square"
                  label=""
                  size="xs"
                />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              {business?.imageUrl && <h1 className="text-xl font-black text-white leading-tight line-clamp-1">{business.name}</h1>}
              {!business?.imageUrl && <h1 className="text-xl font-black text-white leading-tight">{business.name}</h1>}
              <p className="text-xs text-gray-500 mt-0.5">{business?.address}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div />
            <div className="flex flex-col items-end gap-2">
              <Badge className={`border text-sm font-bold px-3 py-1 ${business?.isOpen ? "bg-green-400/20 text-green-400 border-green-400/40" : "bg-gray-500/20 text-gray-400 border-gray-500/40"}`}>
                {business?.isOpen ? t.open : t.closed}
              </Badge>
              <Button
                size="sm"
                onClick={() => updateStatus.mutate({ businessId: business!.id, data: { isOpen: !business?.isOpen } })}
                disabled={updateStatus.isPending}
                className={`text-xs font-bold ${business?.isOpen ? "bg-red-500/80 hover:bg-red-500 text-white" : "bg-green-500/80 hover:bg-green-500 text-white"}`}
              >
                {business?.isOpen ? t.close : t.open}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white/8 border border-white/10 rounded-2xl p-3 text-center">
            <p className="text-xl font-black text-yellow-400">{formatDOP(stats?.salesToday ?? 0)}</p>
            <p className="text-xs text-gray-400 mt-1">{t.salesToday}</p>
          </div>
          <div className="bg-white/8 border border-white/10 rounded-2xl p-3 text-center">
            <p className="text-xl font-black text-yellow-400">{stats?.ordersToday ?? 0}</p>
            <p className="text-xs text-gray-400 mt-1">{t.ordersToday}</p>
          </div>
          <div className="bg-white/8 border border-white/10 rounded-2xl p-3 text-center">
            <p className="text-xl font-black text-yellow-400">⭐{business?.rating?.toFixed(1) ?? "—"}</p>
            <p className="text-xs text-gray-400 mt-1">{t.rating}</p>
          </div>
        </div>

        <div className="bg-white/8 border border-white/10 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-yellow-400" />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t.thisWeekSales}</span>
          </div>
          <p className="text-2xl font-black text-yellow-400">{formatDOP(stats?.salesWeek ?? 0)}</p>
        </div>

        {/* Prep time selector */}
        <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-yellow-400" />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tiempo de preparación</span>
            <span className="ml-auto text-yellow-400 font-black text-sm">{currentPrepTime} min</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[10, 15, 20, 25, 30, 45, 60].map((m) => (
              <button
                key={m}
                onClick={() => handlePrepTime(m)}
                disabled={savingPrepTime}
                className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all ${
                  currentPrepTime === m
                    ? "bg-yellow-400 text-black border-yellow-400 shadow-[0_0_10px_rgba(255,215,0,0.4)]"
                    : "bg-white/5 text-gray-400 border-white/10 hover:border-yellow-400/40 hover:text-yellow-400"
                }`}
              >
                {m} min
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link href="/business/orders">
            <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-2xl p-4 text-center hover:bg-yellow-400/20 transition cursor-pointer">
              <Package size={24} className="text-yellow-400 mx-auto mb-2" />
              <p className="font-bold text-yellow-400 text-sm">{t.orders}</p>
              {(stats?.pendingOrders ?? 0) > 0 && (
                <Badge className="bg-yellow-400 text-black text-xs mt-1">{t.newOrders(stats!.pendingOrders)}</Badge>
              )}
            </div>
          </Link>
          <Link href="/business/menu">
            <div className="bg-white/8 border border-white/10 rounded-2xl p-4 text-center hover:border-yellow-400/30 transition cursor-pointer">
              <ChefHat size={24} className="text-gray-300 mx-auto mb-2" />
              <p className="font-bold text-gray-300 text-sm">{t.menu}</p>
            </div>
          </Link>
        </div>

        <Link href="/business/analytics">
          <div className="bg-white/8 border border-white/10 rounded-2xl p-4 flex items-center gap-3 hover:border-yellow-400/30 transition cursor-pointer mt-3">
            <TrendingUp size={20} className="text-yellow-400 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm">Analíticas</p>
              <p className="text-xs text-gray-400">Ingresos, pedidos y top productos</p>
            </div>
            <span className="ml-auto text-gray-500 text-lg">›</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
