import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { formatDOP } from "@/lib/auth";
import { ArrowLeft, Bike, Building2, ChevronDown, ChevronUp, Check, CreditCard, Smartphone, Banknote, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface DriverBalance {
  driverId: number;
  userId: number;
  name: string;
  vehicleType: string;
  vehiclePlate: string | null;
  pendingOrdersCount: number;
  pendingAmount: number;
  pendingOrders: Array<{ id: number; totalAmount: number; commission: number; createdAt: string }>;
}

interface BusinessBalance {
  businessId: number;
  userId: number;
  name: string;
  phone: string | null;
  availableOrdersCount: number;
  availableAmount: number;
  lastPayoutDate: string | null;
  lastPayoutAmount: number | null;
}

const PAYOUT_METHODS = [
  { value: "efectivo", label: "Efectivo", icon: Banknote },
  { value: "tpago", label: "Tpago", icon: Smartphone },
  { value: "transferencia", label: "Transferencia", icon: CreditCard },
];

export default function AdminCashFlow() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"drivers" | "businesses">("drivers");

  // Driver state
  const [expandedDriver, setExpandedDriver] = useState<number | null>(null);
  const [depositAmounts, setDepositAmounts] = useState<Record<number, string>>({});
  const [depositNotes, setDepositNotes] = useState<Record<number, string>>({});
  const [depositing, setDepositing] = useState<number | null>(null);

  // Business state
  const [expandedBiz, setExpandedBiz] = useState<number | null>(null);
  const [payoutMethod, setPayoutMethod] = useState<Record<number, string>>({});
  const [payoutRef, setPayoutRef] = useState<Record<number, string>>({});
  const [payingOut, setPayingOut] = useState<number | null>(null);

  const { data: driverBalances, isLoading: driversLoading } = useQuery<DriverBalance[]>({
    queryKey: ["/admin/cash/driver-balances"],
    queryFn: async () => {
      const r = await apiFetch("/api/admin/cash/driver-balances");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    refetchInterval: 30_000,
  });

  const { data: bizBalances, isLoading: bizLoading } = useQuery<BusinessBalance[]>({
    queryKey: ["/admin/cash/business-balances"],
    queryFn: async () => {
      const r = await apiFetch("/api/admin/cash/business-balances");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    refetchInterval: 30_000,
  });

  const handleDeposit = async (driver: DriverBalance) => {
    const raw = depositAmounts[driver.driverId];
    const amount = parseFloat(raw ?? String(driver.pendingAmount));
    if (!amount || amount <= 0) {
      toast({ title: "Ingresa el monto recibido", variant: "destructive" });
      return;
    }
    setDepositing(driver.driverId);
    try {
      const r = await apiFetch(`/api/admin/drivers/${driver.driverId}/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountReceived: amount, note: depositNotes[driver.driverId] }),
      });
      if (r.ok) {
        const data = await r.json();
        toast({ title: `✅ Depósito registrado — ${data.affectedBusinesses} negocio(s) notificado(s)` });
        setExpandedDriver(null);
        queryClient.invalidateQueries({ queryKey: ["/admin/cash/driver-balances"] });
        queryClient.invalidateQueries({ queryKey: ["/admin/cash/business-balances"] });
      } else {
        const e = await r.json();
        toast({ title: e.error ?? "Error al registrar depósito", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error de red", variant: "destructive" });
    } finally {
      setDepositing(null);
    }
  };

  const handlePayout = async (biz: BusinessBalance) => {
    const method = payoutMethod[biz.businessId] ?? "efectivo";
    const ref = payoutRef[biz.businessId] ?? "";
    setPayingOut(biz.businessId);
    try {
      const r = await apiFetch(`/api/admin/businesses/${biz.businessId}/payout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutMethod: method, reference: ref || undefined }),
      });
      if (r.ok) {
        const data = await r.json();
        toast({ title: `✅ Pago de ${formatDOP(data.amount)} registrado — negocio notificado` });
        setExpandedBiz(null);
        queryClient.invalidateQueries({ queryKey: ["/admin/cash/business-balances"] });
      } else {
        const e = await r.json();
        toast({ title: e.error ?? "Error al procesar pago", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error de red", variant: "destructive" });
    } finally {
      setPayingOut(null);
    }
  };

  const totalPending = (driverBalances ?? []).reduce((s, d) => s + d.pendingAmount, 0);
  const totalAvailable = (bizBalances ?? []).reduce((s, b) => s + b.availableAmount, 0);

  return (
    <div className="min-h-screen bg-background text-white pb-24">
      {/* Header */}
      <div className="bg-background border-b border-yellow-400/20 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/admin">
          <button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10 transition">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <h1 className="text-xl font-black text-yellow-400">Flujo de Efectivo</h1>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 px-4 py-4">
        <div className="bg-orange-400/10 border border-orange-400/25 rounded-2xl p-3 text-center">
          <p className="text-xl font-black text-orange-400">{formatDOP(totalPending)}</p>
          <p className="text-xs text-white/50 mt-0.5">Con choferes</p>
        </div>
        <div className="bg-green-400/10 border border-green-400/25 rounded-2xl p-3 text-center">
          <p className="text-xl font-black text-green-400">{formatDOP(totalAvailable)}</p>
          <p className="text-xs text-white/50 mt-0.5">En oficina</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 mb-4">
        {[
          { key: "drivers" as const, label: "Depósitos de choferes", count: driverBalances?.length ?? 0 },
          { key: "businesses" as const, label: "Pagos a negocios", count: bizBalances?.length ?? 0 },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${tab === t.key ? "border-yellow-400 bg-yellow-400/20 text-yellow-400" : "border-white/10 bg-white/8 text-gray-400"}`}
          >
            {t.label}
            {t.count > 0 && <span className="ml-1.5 bg-yellow-400 text-black text-[10px] font-black px-1.5 py-0.5 rounded-full">{t.count}</span>}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-3">
        {/* ── Drivers tab ── */}
        {tab === "drivers" && (
          <>
            {driversLoading ? (
              [1, 2].map(i => <Skeleton key={i} className="h-20 bg-white/8 rounded-xl" />)
            ) : driverBalances?.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-3xl mb-2">🏍️</p>
                <p className="text-gray-400 text-sm">No hay choferes con efectivo pendiente</p>
              </div>
            ) : driverBalances?.map(driver => (
              <div key={driver.driverId} className="bg-white/8 border border-orange-400/30 rounded-2xl overflow-hidden">
                <button
                  className="w-full p-4 flex items-center gap-3 text-left"
                  onClick={() => setExpandedDriver(expandedDriver === driver.driverId ? null : driver.driverId)}
                >
                  <div className="w-10 h-10 rounded-xl bg-orange-400/15 flex items-center justify-center flex-shrink-0">
                    <Bike size={18} className="text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-white text-sm">{driver.name}</p>
                    <p className="text-xs text-gray-400">{driver.vehiclePlate ?? driver.vehicleType} · {driver.pendingOrdersCount} pedidos</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-orange-400">{formatDOP(driver.pendingAmount)}</p>
                    {expandedDriver === driver.driverId ? <ChevronUp size={14} className="text-gray-400 ml-auto mt-1" /> : <ChevronDown size={14} className="text-gray-400 ml-auto mt-1" />}
                  </div>
                </button>

                {expandedDriver === driver.driverId && (
                  <div className="border-t border-white/10 p-4 space-y-3">
                    {/* Order list */}
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {driver.pendingOrders.map(o => (
                        <div key={o.id} className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">Pedido #{o.id}</span>
                          <span className="text-white font-bold">{formatDOP(o.totalAmount - o.commission)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-sm font-black border-t border-white/10 pt-2">
                      <span className="text-gray-300">Total esperado</span>
                      <span className="text-orange-400">{formatDOP(driver.pendingAmount)}</span>
                    </div>

                    <div className="space-y-2">
                      <Input
                        type="number"
                        placeholder={`Monto recibido (esperado: ${driver.pendingAmount.toFixed(0)})`}
                        value={depositAmounts[driver.driverId] ?? ""}
                        onChange={e => setDepositAmounts(p => ({ ...p, [driver.driverId]: e.target.value }))}
                        className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400"
                      />
                      <Input
                        placeholder="Nota (opcional)"
                        value={depositNotes[driver.driverId] ?? ""}
                        onChange={e => setDepositNotes(p => ({ ...p, [driver.driverId]: e.target.value }))}
                        className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400"
                      />
                      <Button
                        className="w-full bg-orange-500 hover:bg-orange-400 text-white font-black gap-2"
                        onClick={() => handleDeposit(driver)}
                        disabled={depositing === driver.driverId}
                      >
                        <Check size={15} />
                        {depositing === driver.driverId ? "Registrando..." : "Confirmar depósito recibido"}
                      </Button>
                      <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-1">
                        <AlertCircle size={11} />
                        Los negocios serán notificados automáticamente
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* ── Businesses tab ── */}
        {tab === "businesses" && (
          <>
            {bizLoading ? (
              [1, 2].map(i => <Skeleton key={i} className="h-20 bg-white/8 rounded-xl" />)
            ) : bizBalances?.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-3xl mb-2">🏪</p>
                <p className="text-gray-400 text-sm">No hay negocios con saldo disponible</p>
              </div>
            ) : bizBalances?.map(biz => (
              <div key={biz.businessId} className="bg-white/8 border border-green-400/25 rounded-2xl overflow-hidden">
                <button
                  className="w-full p-4 flex items-center gap-3 text-left"
                  onClick={() => setExpandedBiz(expandedBiz === biz.businessId ? null : biz.businessId)}
                >
                  <div className="w-10 h-10 rounded-xl bg-green-400/15 flex items-center justify-center flex-shrink-0">
                    <Building2 size={18} className="text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-white text-sm">{biz.name}</p>
                    <p className="text-xs text-gray-400">{biz.availableOrdersCount} pedidos · {biz.phone ?? "sin tel."}</p>
                    {biz.lastPayoutDate && (
                      <p className="text-xs text-gray-600">Último pago: {new Date(biz.lastPayoutDate).toLocaleDateString("es-DO", { day: "numeric", month: "short" })}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-green-400">{formatDOP(biz.availableAmount)}</p>
                    {expandedBiz === biz.businessId ? <ChevronUp size={14} className="text-gray-400 ml-auto mt-1" /> : <ChevronDown size={14} className="text-gray-400 ml-auto mt-1" />}
                  </div>
                </button>

                {expandedBiz === biz.businessId && (
                  <div className="border-t border-white/10 p-4 space-y-3">
                    <p className="text-sm font-black text-white">Pagar {formatDOP(biz.availableAmount)}</p>

                    {/* Method selector */}
                    <div className="grid grid-cols-3 gap-2">
                      {PAYOUT_METHODS.map(m => {
                        const Icon = m.icon;
                        const selected = (payoutMethod[biz.businessId] ?? "efectivo") === m.value;
                        return (
                          <button
                            key={m.value}
                            onClick={() => setPayoutMethod(p => ({ ...p, [biz.businessId]: m.value }))}
                            className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-bold transition ${selected ? "border-yellow-400 bg-yellow-400/15 text-yellow-400" : "border-white/10 bg-white/5 text-gray-400"}`}
                          >
                            <Icon size={16} />
                            {m.label}
                          </button>
                        );
                      })}
                    </div>

                    <Input
                      placeholder="Referencia / confirmación (opcional)"
                      value={payoutRef[biz.businessId] ?? ""}
                      onChange={e => setPayoutRef(p => ({ ...p, [biz.businessId]: e.target.value }))}
                      className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400"
                    />

                    <Button
                      className="w-full bg-green-500 hover:bg-green-400 text-white font-black gap-2"
                      onClick={() => handlePayout(biz)}
                      disabled={payingOut === biz.businessId}
                    >
                      <Check size={15} />
                      {payingOut === biz.businessId ? "Procesando..." : `Confirmar pago de ${formatDOP(biz.availableAmount)}`}
                    </Button>
                    <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-1">
                      <AlertCircle size={11} />
                      El negocio recibirá notificación por push y WhatsApp
                    </p>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
