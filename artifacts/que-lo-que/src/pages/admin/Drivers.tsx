import { useState } from "react";
import { Link } from "wouter";
import { useAdminListDrivers, getAdminListDriversQueryKey, useAdminLockDriver } from "@workspace/api-client-react";
import { formatDOP } from "@/lib/auth";
import { useAdminLang } from "@/lib/lang";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Star, Lock, Unlock, BanknoteIcon, CheckCircle2, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/apiFetch";
import { CASH_LIMIT, CASH_WARNING_THRESHOLD } from "@/lib/cashThresholds";

export default function AdminDrivers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useAdminLang();

  const [requestingDropoff, setRequestingDropoff] = useState<number | null>(null);
  const [recordingDropoff, setRecordingDropoff] = useState<{ id: number; name: string; balance: number } | null>(null);
  const [dropoffAmount, setDropoffAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: drivers, isLoading } = useAdminListDrivers({
    query: { queryKey: getAdminListDriversQueryKey() }
  });

  const lockDriver = useAdminLockDriver({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getAdminListDriversQueryKey() });
        toast({ title: t.driverUpdated });
      },
      onError: () => toast({ title: t.error, variant: "destructive" }),
    }
  });

  function cashColor(balance: number) {
    if (balance >= CASH_LIMIT) return "text-red-400";
    if (balance >= CASH_WARNING_THRESHOLD) return "text-amber-400";
    return "text-green-400";
  }

  function cashBg(balance: number) {
    if (balance >= CASH_LIMIT) return "bg-red-500/15 border-red-500/30";
    if (balance >= CASH_WARNING_THRESHOLD) return "bg-amber-500/15 border-amber-500/30";
    return "bg-green-500/10 border-green-500/20";
  }

  async function handleRequestDropoff(driverId: number) {
    setRequestingDropoff(driverId);
    try {
      const res = await apiFetch(`/api/admin/drivers/${driverId}/request-dropoff`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json() as { messageSent: boolean; driverName: string; cashBalance: number };
      toast({
        title: data.messageSent ? "✅ Mensaje enviado" : "⚠️ Sin WhatsApp",
        description: data.messageSent
          ? `Se le pidió a ${data.driverName} que venga a entregar ${formatDOP(data.cashBalance)}`
          : "El mensaje no se pudo enviar — verifica que el conductor tenga número de teléfono",
      });
    } catch {
      toast({ title: t.error, variant: "destructive" });
    } finally {
      setRequestingDropoff(null);
    }
  }

  async function handleRecordDropoff() {
    if (!recordingDropoff) return;
    const amount = parseFloat(dropoffAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Monto inválido", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch(`/api/admin/drivers/${recordingDropoff.id}/record-dropoff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json() as { newCashBalance: number; unlockedDriver: boolean };
      toast({
        title: "💰 Depósito registrado",
        description: `${recordingDropoff.name} entregó ${formatDOP(amount)}. Balance nuevo: ${formatDOP(data.newCashBalance)}${data.unlockedDriver ? " • Cuenta reactivada ✅" : ""}`,
      });
      queryClient.invalidateQueries({ queryKey: getAdminListDriversQueryKey() });
      setRecordingDropoff(null);
      setDropoffAmount("");
    } catch {
      toast({ title: t.error, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-white pb-24">
      <div className="bg-background border-b border-yellow-400/20 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/admin">
          <button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10 transition">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <h1 className="text-xl font-black text-yellow-400">{t.drivers}</h1>
      </div>

      <div className="px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-36 bg-white/8 rounded-xl" />)}
          </div>
        ) : drivers?.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-3xl mb-2">🛵</p>
            <p>{t.noResults}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {drivers?.map((driver) => (
              <div key={driver.id} data-testid={`driver-${driver.id}`} className="bg-white/8 border border-white/10 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="font-black text-white">{driver.user?.name ?? "Driver"}</p>
                    <p className="text-xs text-gray-400">{driver.user?.email}</p>
                    {driver.user?.phone && (
                      <p className="text-xs text-gray-500">{driver.user.phone}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={`border text-xs ${driver.isLocked ? "bg-red-500/20 text-red-400 border-red-500/40" : driver.isOnline ? "bg-green-400/20 text-green-400 border-green-400/40" : "bg-gray-500/20 text-gray-400 border-gray-500/40"}`}>
                      {driver.isLocked ? "🔒" : driver.isOnline ? t.online : t.offline}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-yellow-400 mb-1">
                      <Star size={12} fill="currentColor" />
                      <span className="text-sm font-bold">{driver.rating?.toFixed(1) ?? "—"}</span>
                    </div>
                    <p className="text-xs text-gray-500">{t.rating}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-white">{driver.totalDeliveries ?? 0}</p>
                    <p className="text-xs text-gray-500">{t.deliveries}</p>
                  </div>
                  <div className={`text-center rounded-lg p-1 border ${cashBg(driver.cashBalance ?? 0)}`}>
                    <p className={`text-sm font-bold ${cashColor(driver.cashBalance ?? 0)}`}>
                      {formatDOP(driver.cashBalance ?? 0)}
                    </p>
                    <p className="text-xs text-gray-500">{t.cashBalance}</p>
                  </div>
                </div>

                {(driver.cashBalance ?? 0) > 0 && (
                  <div className="flex gap-2 mb-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs gap-1.5 border-blue-400/40 text-blue-300 hover:bg-blue-500/10"
                      onClick={() => handleRequestDropoff(driver.id)}
                      disabled={requestingDropoff === driver.id}
                    >
                      <MessageCircle size={12} />
                      {requestingDropoff === driver.id ? "Enviando…" : "Pedir depósito"}
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 text-xs gap-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/30"
                      onClick={() => {
                        setRecordingDropoff({ id: driver.id, name: driver.user?.name ?? "Driver", balance: driver.cashBalance ?? 0 });
                        setDropoffAmount(String(Math.round(driver.cashBalance ?? 0)));
                      }}
                    >
                      <BanknoteIcon size={12} />
                      Registrar depósito
                    </Button>
                  </div>
                )}

                <Button
                  size="sm"
                  className={`w-full font-bold text-xs gap-2 ${driver.isLocked ? "bg-green-500/80 hover:bg-green-500 text-white" : "bg-red-500/80 hover:bg-red-500 text-white"}`}
                  onClick={() => lockDriver.mutate({ driverId: driver.id, data: { isLocked: !driver.isLocked } })}
                  disabled={lockDriver.isPending}
                >
                  {driver.isLocked ? <><Unlock size={12} /> {t.unblock}</> : <><Lock size={12} /> {t.block}</>}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!recordingDropoff} onOpenChange={(o) => { if (!o) { setRecordingDropoff(null); setDropoffAmount(""); } }}>
        <DialogContent className="bg-[#0a0f2c] border border-white/10 text-white max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-yellow-400 flex items-center gap-2">
              <BanknoteIcon size={18} />
              Registrar depósito
            </DialogTitle>
          </DialogHeader>
          {recordingDropoff && (
            <div className="space-y-4 pt-2">
              <div className="bg-white/5 rounded-xl p-3 text-sm">
                <p className="text-gray-400">Conductor</p>
                <p className="font-bold">{recordingDropoff.name}</p>
                <p className="text-gray-400 mt-1">Balance en efectivo</p>
                <p className={`font-bold ${cashColor(recordingDropoff.balance)}`}>{formatDOP(recordingDropoff.balance)}</p>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Monto recibido (RD$)</label>
                <Input
                  type="number"
                  value={dropoffAmount}
                  onChange={e => setDropoffAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-white/8 border-white/20 text-white"
                  min={1}
                  step={1}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 border-white/20 text-gray-300" onClick={() => { setRecordingDropoff(null); setDropoffAmount(""); }}>
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-bold gap-2"
                  onClick={handleRecordDropoff}
                  disabled={saving || !dropoffAmount}
                >
                  <CheckCircle2 size={14} />
                  {saving ? "Guardando…" : "Confirmar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
