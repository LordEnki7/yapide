import { Link } from "wouter";
import { apiFetch } from "@/lib/apiFetch";
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
import { Package, ChefHat, TrendingUp, Clock, CalendarClock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

// ── Business hours types ─────────────────────────────────────────────────────
type DayKey = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
type OpenHours = Partial<Record<DayKey, { open: string; close: string } | null>>;
const ALL_DAYS: { key: DayKey; label: string }[] = [
  { key: "mon", label: "Lun" },
  { key: "tue", label: "Mar" },
  { key: "wed", label: "Mié" },
  { key: "thu", label: "Jue" },
  { key: "fri", label: "Vie" },
  { key: "sat", label: "Sáb" },
  { key: "sun", label: "Dom" },
];

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
    const res = await apiFetch("/api/businesses/mine/logo", {
      method: "PATCH",
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

  // ── Business hours state ────────────────────────────────────────────────────
  const [hours, setHours] = useState<OpenHours>({});
  const [savingHours, setSavingHours] = useState(false);

  useEffect(() => {
    if (business && (business as any).openHours) {
      setHours((business as any).openHours as OpenHours);
    }
  }, [business]);

  const toggleDay = (day: DayKey) => {
    setHours(prev => {
      if (prev[day]) return { ...prev, [day]: null };
      return { ...prev, [day]: { open: "08:00", close: "22:00" } };
    });
  };

  const setSlot = (day: DayKey, field: "open" | "close", val: string) => {
    setHours(prev => ({ ...prev, [day]: { ...(prev[day] as any), [field]: val } }));
  };

  const saveHours = async () => {
    setSavingHours(true);
    try {
      const res = await apiFetch("/api/businesses/mine/hours", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openHours: Object.keys(hours).length === 0 ? null : hours }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      queryClient.invalidateQueries({ queryKey: getGetMyBusinessQueryKey() });
      toast({ title: "✅ Horario guardado" });
    } catch {
      toast({ title: "Error al guardar horario", variant: "destructive" });
    } finally {
      setSavingHours(false);
    }
  };

  const handlePrepTime = async (minutes: number) => {
    setPrepTime(minutes);
    setSavingPrepTime(true);
    try {
      await apiFetch("/api/businesses/mine/prep-time", {
        method: "PATCH",
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
        <p className="text-white/70 text-sm leading-relaxed max-w-xs">
          Tu negocio está siendo revisado por el equipo de YaPide. Recibirás una notificación cuando seas aprobado.
        </p>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 w-full max-w-xs space-y-2 text-left">
        <p className="text-xs font-black text-[#FFD700]/80 uppercase tracking-widest">¿Qué sigue?</p>
        <div className="flex items-start gap-2 text-sm text-white/80">
          <span className="text-yellow-400 flex-shrink-0">✓</span>
          <span>Registro completado</span>
        </div>
        <div className="flex items-start gap-2 text-sm text-white/60">
          <span className="flex-shrink-0">⏳</span>
          <span>Revisión del equipo (24–48h)</span>
        </div>
        <div className="flex items-start gap-2 text-sm text-white/60">
          <span className="flex-shrink-0">🚀</span>
          <span>¡Empieza a recibir pedidos!</span>
        </div>
      </div>
      <p className="text-xs text-white/50">¿Preguntas? Escríbenos al WhatsApp 📱</p>
    </div>
  );

  if (business && (business as any).approvalStatus === "rejected") return (
    <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-6 text-center gap-5">
      <div className="w-20 h-20 rounded-full bg-red-500/15 border-2 border-red-500/40 flex items-center justify-center text-4xl">❌</div>
      <div>
        <h1 className="text-xl font-black text-red-400 mb-2">Solicitud rechazada</h1>
        <p className="text-white/70 text-sm max-w-xs">Tu negocio no fue aprobado en este momento. Contáctanos para más información.</p>
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
                <p className="text-xs text-[#FFD700]/70 uppercase tracking-widest">{t.businessPanel}</p>
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
              <p className="text-xs text-white/50 mt-0.5">{business?.address}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div />
            <div className="flex flex-col items-end gap-2">
              <Badge className={`border text-sm font-bold px-3 py-1 ${business?.isOpen ? "bg-green-400/20 text-green-400 border-green-400/40" : "bg-white/10 text-white/60 border-white/20"}`}>
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
            <p className="text-xs text-[#FFD700]/70 mt-1">{t.salesToday}</p>
          </div>
          <div className="bg-white/8 border border-white/10 rounded-2xl p-3 text-center">
            <p className="text-xl font-black text-yellow-400">{stats?.ordersToday ?? 0}</p>
            <p className="text-xs text-[#FFD700]/70 mt-1">{t.ordersToday}</p>
          </div>
          <div className="bg-white/8 border border-white/10 rounded-2xl p-3 text-center">
            <p className="text-xl font-black text-yellow-400">⭐{business?.rating?.toFixed(1) ?? "—"}</p>
            <p className="text-xs text-[#FFD700]/70 mt-1">{t.rating}</p>
          </div>
        </div>

        <div className="bg-white/8 border border-white/10 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-yellow-400" />
            <span className="text-xs font-bold text-[#FFD700]/70 uppercase tracking-widest">{t.thisWeekSales}</span>
          </div>
          <p className="text-2xl font-black text-yellow-400">{formatDOP(stats?.salesWeek ?? 0)}</p>
        </div>

        {/* Prep time selector */}
        <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-yellow-400" />
            <span className="text-xs font-bold text-[#FFD700]/70 uppercase tracking-widest">Tiempo de preparación</span>
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
                    : "bg-white/5 text-white/60 border-white/10 hover:border-yellow-400/40 hover:text-yellow-400"
                }`}
              >
                {m} min
              </button>
            ))}
          </div>
        </div>

        {/* Business hours schedule */}
        <div className="bg-white/8 border border-white/10 rounded-2xl p-4 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock size={14} className="text-yellow-400" />
            <span className="text-xs font-bold text-[#FFD700]/70 uppercase tracking-widest">Horario de atención</span>
          </div>
          <div className="space-y-2">
            {ALL_DAYS.map(({ key, label }) => {
              const slot = hours[key];
              const enabled = !!slot;
              return (
                <div key={key} className="flex items-center gap-2">
                  {/* Day toggle */}
                  <button
                    onClick={() => toggleDay(key)}
                    className={`w-10 text-xs font-black rounded-lg py-1 transition-all flex-shrink-0 ${
                      enabled
                        ? "bg-yellow-400 text-black"
                        : "bg-white/8 text-white/40 border border-white/10"
                    }`}
                  >
                    {label}
                  </button>
                  {/* Time inputs */}
                  {enabled ? (
                    <div className="flex items-center gap-1.5 flex-1">
                      <input
                        type="time"
                        value={slot!.open}
                        onChange={e => setSlot(key, "open", e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-yellow-400/60 [color-scheme:dark]"
                      />
                      <span className="text-white/40 text-xs">–</span>
                      <input
                        type="time"
                        value={slot!.close}
                        onChange={e => setSlot(key, "close", e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-yellow-400/60 [color-scheme:dark]"
                      />
                    </div>
                  ) : (
                    <span className="flex-1 text-xs text-white/30 italic pl-1">Cerrado</span>
                  )}
                </div>
              );
            })}
          </div>
          <Button
            onClick={saveHours}
            disabled={savingHours}
            size="sm"
            className="w-full mt-3 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs"
          >
            {savingHours ? "Guardando..." : "Guardar horario"}
          </Button>
          {(business as any).openHours && (
            <p className="text-center text-xs text-white/40 mt-2">
              Apertura/cierre automático según este horario (hora DR)
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
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
              <ChefHat size={24} className="text-white/70 mx-auto mb-2" />
              <p className="font-bold text-white/70 text-sm">{t.menu}</p>
            </div>
          </Link>
        </div>

        <Link href="/business/analytics">
          <div className="bg-white/8 border border-white/10 rounded-2xl p-4 flex items-center gap-3 hover:border-yellow-400/30 transition cursor-pointer mt-3">
            <TrendingUp size={20} className="text-yellow-400 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm">Analíticas</p>
              <p className="text-xs text-white/60">Ingresos, pedidos y top productos</p>
            </div>
            <span className="ml-auto text-white/50 text-lg">›</span>
          </div>
        </Link>
        <Link href="/business/payouts">
          <div className="bg-green-400/8 border border-green-400/20 rounded-2xl p-4 flex items-center gap-3 hover:border-green-400/40 transition cursor-pointer mt-3">
            <span className="text-xl">💳</span>
            <div>
              <p className="font-bold text-sm">Pagos y cobros</p>
              <p className="text-xs text-white/60">Monto pendiente por cobrar a YaPide</p>
            </div>
            <span className="ml-auto text-white/50 text-lg">›</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
