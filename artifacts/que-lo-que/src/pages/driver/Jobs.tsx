import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useGetAvailableJobs, getGetAvailableJobsQueryKey, useAcceptJob, useDeclineJob, useUpdateOrderStatus, getListOrdersQueryKey } from "@workspace/api-client-react";
import { formatDOP } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import LangToggle from "@/components/LangToggle";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Banknote, CreditCard, Clock, Navigation, Camera, CheckCircle2, Package, Loader2, Store, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ActiveOrder {
  id: number;
  status: string;
  deliveryAddress: string;
  totalAmount: number;
  deliveryFee: number;
  driverEarnings: number;
  tip: number;
  paymentMethod: string;
  notes?: string | null;
  businessName?: string | null;
  businessAddress?: string | null;
  businessPhone?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
}

function NavLinks({ address, label }: { address: string; label: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2 text-sm text-gray-300">
        <MapPin size={14} className="text-yellow-400 flex-shrink-0 mt-0.5" />
        <span className="flex-1">{address}</span>
      </div>
      <div className="flex gap-2">
        <a href={`https://maps.google.com/?q=${encodeURIComponent(address)}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold hover:bg-blue-500/20 transition">
          <Navigation size={11} /> Maps
        </a>
        <a href={`https://waze.com/ul?q=${encodeURIComponent(address)}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold hover:bg-cyan-500/20 transition">
          <Navigation size={11} /> Waze
        </a>
        <span className="text-xs text-gray-500 self-center">{label}</span>
      </div>
    </div>
  );
}

export default function DriverJobs() {
  const { data: jobs, isLoading } = useGetAvailableJobs({
    query: { queryKey: getGetAvailableJobsQueryKey(), refetchInterval: 10000 }
  });
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [activeLoading, setActiveLoading] = useState(true);
  const [deliveryPhoto, setDeliveryPhoto] = useState<{ [orderId: number]: File | null }>({});
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const fileRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLang();

  const fetchActiveOrders = async () => {
    try {
      const res = await fetch("/api/driver/active-orders", { credentials: "include" });
      if (res.ok) setActiveOrders(await res.json());
    } catch {
    } finally {
      setActiveLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveOrders();
    const interval = setInterval(fetchActiveOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    const hasActivePickedUp = activeOrders.some(o => o.status === "picked_up");
    if (!hasActivePickedUp) return;

    const sendLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetch("/api/drivers/me/location", {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          }).catch(() => {});
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000 }
      );
    };

    sendLocation();
    const gpsInterval = setInterval(sendLocation, 10000);
    return () => clearInterval(gpsInterval);
  }, [activeOrders]);

  const updateStatus = useUpdateOrderStatus({
    mutation: {
      onSuccess: () => {
        fetchActiveOrders();
        queryClient.invalidateQueries({ queryKey: getGetAvailableJobsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
      },
      onError: () => toast({ title: t.error, description: t.error, variant: "destructive" }),
    }
  });

  const accept = useAcceptJob({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAvailableJobsQueryKey() });
        fetchActiveOrders();
        toast({ title: t.jobAccepted, description: t.goPickUp });
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.error ?? t.error;
        toast({ title: "Error", description: msg, variant: "destructive" });
      },
    }
  });

  const decline = useDeclineJob({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetAvailableJobsQueryKey() }),
    }
  });

  const handleMarkPickedUp = (orderId: number) => {
    updateStatus.mutate({ orderId, data: { status: "picked_up" } });
  };

  const handleMarkDelivered = async (orderId: number) => {
    const photo = deliveryPhoto[orderId];
    setUploadingId(orderId);
    let deliveryPhotoPath: string | undefined;

    if (photo) {
      try {
        const urlRes = await fetch("/api/storage/uploads/request-url", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: photo.name, size: photo.size, contentType: photo.type }),
        });
        if (urlRes.ok) {
          const { uploadURL, objectPath } = await urlRes.json();
          await fetch(uploadURL, { method: "PUT", body: photo, headers: { "Content-Type": photo.type } });
          deliveryPhotoPath = objectPath;
        }
      } catch {
        toast({ title: t.photoUploadError, description: t.deliveredWithoutPhoto, variant: "destructive" });
      }
    }

    updateStatus.mutate({ orderId, data: { status: "delivered", deliveryPhotoPath } as any });
    setUploadingId(null);
  };

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

      <div className="px-4 py-4 space-y-6">

        {/* ─── ACTIVE ORDERS ─── */}
        {activeOrders.length > 0 && (
          <div>
            <p className="text-xs text-yellow-400 uppercase tracking-widest font-bold mb-3">🛵 En curso</p>
            <div className="space-y-4">
              {activeOrders.map((order) => (
                <div key={order.id} className="bg-yellow-400/5 border border-yellow-400/40 rounded-2xl p-4 shadow-[0_0_20px_rgba(255,215,0,0.1)]">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">#{order.id}</p>
                      <p className="font-black text-xl text-yellow-400">{formatDOP(order.driverEarnings + (order.tip ?? 0))}</p>
                      <p className="text-xs text-gray-400">tu ganancia{order.tip > 0 ? ` + RD$${order.tip} propina` : ""}</p>
                    </div>
                    <Badge className={`border ${order.status === "accepted" ? "bg-blue-400/20 text-blue-400 border-blue-400/40" : "bg-purple-400/20 text-purple-400 border-purple-400/40"}`}>
                      {order.status === "accepted"
                        ? <><Store size={12} className="mr-1 inline" /> Ve a recoger</>
                        : <><CheckCircle2 size={12} className="mr-1 inline" /> En camino</>}
                    </Badge>
                  </div>

                  {/* Step-aware navigation */}
                  {order.status === "accepted" ? (
                    <div className="space-y-3 mb-3">
                      <div>
                        <p className="text-xs text-yellow-400 font-bold uppercase tracking-wide mb-1">📦 Paso 1 — Recoger en el negocio</p>
                        {order.businessAddress
                          ? <NavLinks address={order.businessAddress} label={order.businessName ?? ""} />
                          : <p className="text-sm text-gray-400">{order.businessName}</p>}
                      </div>
                      <div className="border-t border-white/5 pt-3">
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-1">📍 Paso 2 — Entregar luego en</p>
                        <p className="text-sm text-gray-400">{order.deliveryAddress}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 mb-3">
                      <div>
                        <p className="text-xs text-yellow-400 font-bold uppercase tracking-wide mb-1">🏠 Paso 2 — Entregar ahora en</p>
                        <NavLinks address={order.deliveryAddress} label="destino" />
                      </div>
                    </div>
                  )}

                  {order.notes && (
                    <p className="text-xs text-gray-400 bg-white/5 rounded-lg px-3 py-2 mb-3 italic">"{order.notes}"</p>
                  )}

                  {order.status === "picked_up" && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-400 mb-2 font-bold">📸 Foto de entrega (opcional)</p>
                      <input
                        ref={el => { fileRefs.current[order.id] = el; }}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={e => setDeliveryPhoto(prev => ({ ...prev, [order.id]: e.target.files?.[0] ?? null }))}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => fileRefs.current[order.id]?.click()}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/8 border border-white/20 text-sm text-gray-300 hover:bg-white/12 transition"
                        >
                          <Camera size={14} className="text-yellow-400" />
                          {deliveryPhoto[order.id] ? t.changePhoto : t.takePhoto}
                        </button>
                        {deliveryPhoto[order.id] && (
                          <span className="text-xs text-green-400 font-bold">✓ {t.changePhoto.toLowerCase()}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {order.customerPhone && (
                    <a
                      href={`https://wa.me/1${order.customerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola${order.customerName ? ` ${order.customerName.split(" ")[0]}` : ""}, soy tu delivery de YaPide 🛵 Pedido #${order.id}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 w-full mb-3 py-2.5 rounded-xl bg-green-500/15 border border-green-500/40 text-green-400 text-sm font-bold hover:bg-green-500/25 transition"
                    >
                      <MessageCircle size={15} />
                      Contactar a {order.customerName?.split(" ")[0] ?? "el cliente"} por WhatsApp
                    </a>
                  )}

                  {order.status === "accepted" ? (
                    <Button
                      className="w-full bg-blue-500 hover:bg-blue-400 text-white font-black h-12"
                      onClick={() => handleMarkPickedUp(order.id)}
                      disabled={updateStatus.isPending}
                    >
                      <Package size={16} className="mr-2" />
                      ✅ Ya recogí el pedido
                    </Button>
                  ) : (
                    <Button
                      className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-black h-12 shadow-[0_0_20px_rgba(255,215,0,0.3)]"
                      onClick={() => handleMarkDelivered(order.id)}
                      disabled={updateStatus.isPending || uploadingId === order.id}
                    >
                      {uploadingId === order.id ? <Loader2 size={16} className="mr-2 animate-spin" /> : <CheckCircle2 size={16} className="mr-2" />}
                      ✅ Marcar como entregado
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── AVAILABLE JOBS ─── */}
        <div>
          {activeOrders.length > 0 && (
            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-3">Nuevos trabajos</p>
          )}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-52 bg-white/8 rounded-2xl" />)}
            </div>
          ) : jobs?.length === 0 && activeOrders.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-5xl mb-3">😴</p>
              <p className="text-xl font-black text-white mb-2">{t.noJobs}</p>
              <p className="text-gray-400">{t.noJobsMsg}</p>
            </div>
          ) : jobs?.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm">No hay nuevos pedidos disponibles ahora mismo</p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs?.map((job: any) => (
                <div key={job.id} data-testid={`job-card-${job.id}`} className="bg-white/8 border border-yellow-400/20 rounded-2xl p-4 shadow-[0_0_20px_rgba(255,215,0,0.05)]">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-1 uppercase tracking-widest">#{job.id}</p>
                      <p className="font-black text-xl text-yellow-400">{formatDOP(job.driverEarnings + (job.tip ?? 0))}</p>
                      <p className="text-xs text-gray-400">{t.yourEarning}{job.tip > 0 ? ` + RD$${job.tip} propina` : ""}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={`border ${job.paymentMethod === "cash" ? "bg-green-400/20 text-green-400 border-green-400/40" : "bg-blue-400/20 text-blue-400 border-blue-400/40"}`}>
                        {job.paymentMethod === "cash" ? <Banknote size={12} className="mr-1 inline" /> : <CreditCard size={12} className="mr-1 inline" />}
                        {job.paymentMethod === "cash" ? t.cash : t.card}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={10} />
                        <span>~25 min</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div>
                      <p className="text-xs text-yellow-400 font-bold uppercase tracking-wide mb-1">
                        <Store size={10} className="inline mr-1" />Recoger en
                      </p>
                      {job.businessName && <p className="text-sm font-bold text-white mb-1">{job.businessName}</p>}
                      {job.businessAddress
                        ? <NavLinks address={job.businessAddress} label="negocio" />
                        : <p className="text-xs text-gray-500">Dirección no disponible</p>}
                    </div>
                    <div className="border-t border-white/5 pt-3">
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wide mb-1">
                        <MapPin size={10} className="inline mr-1" />Entregar en
                      </p>
                      <p className="text-sm text-gray-300">{job.deliveryAddress}</p>
                    </div>
                  </div>

                  {job.notes && (
                    <p className="text-xs text-gray-400 bg-white/5 rounded-lg px-3 py-2 mb-3 italic">"{job.notes}"</p>
                  )}

                  <div className="border-t border-white/10 pt-3 flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-400">{t.earningsTotal}</span>
                    <span className="font-bold text-white">{formatDOP(job.totalAmount + job.deliveryFee)}</span>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline"
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
                      {accept.isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                      {t.acceptJob}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
