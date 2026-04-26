import { useState, useEffect, useRef } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { Link } from "wouter";
import { useGetAvailableJobs, getGetAvailableJobsQueryKey, useAcceptJob, useDeclineJob, useUpdateOrderStatus, getListOrdersQueryKey } from "@workspace/api-client-react";
import { formatDOP } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import LangToggle from "@/components/LangToggle";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Banknote, CreditCard, Clock, Navigation, Camera, CheckCircle2, Package, Loader2, Store, MessageCircle, MapPinned, ShieldCheck, AlertTriangle, NotebookPen, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import JobAlertModal from "@/components/JobAlertModal";
import ChatPanel from "@/components/ChatPanel";

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
  requiresAgeCheck?: boolean;
  ageVerified?: boolean;
  verificationPin?: string;
  isFirstTimeBuyer?: boolean;
}

interface LocationNote {
  id: number;
  note: string;
  createdAt: string;
}

function NavLinks({ address, label }: { address: string; label: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2 text-sm text-white/80">
        <MapPin size={14} className="text-yellow-400 flex-shrink-0 mt-0.5" />
        <span className="flex-1">{address}</span>
      </div>
      <div className="flex gap-2">
        <a
          href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold hover:bg-blue-500/20 transition"
        >
          <Navigation size={11} /> Maps
        </a>
        <a
          href={`https://waze.com/ul?q=${encodeURIComponent(address)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold hover:bg-cyan-500/20 transition"
        >
          <Navigation size={11} /> Waze
        </a>
        <span className="text-xs text-white/50 self-center">{label}</span>
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
  const [arrivedIds, setArrivedIds] = useState<Set<number>>(new Set());
  const [alertJob, setAlertJob] = useState<any | null>(null);
  const [pinModal, setPinModal] = useState<{ orderId: number } | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [reportModal, setReportModal] = useState<{ orderId: number } | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportNotes, setReportNotes] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const fileRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const [ageVerifiedIds, setAgeVerifiedIds] = useState<Set<number>>(new Set());
  const seenJobIds = useRef<Set<number>>(new Set());
  const pendingNoteRef = useRef<{ orderId: number; address: string } | null>(null);
  const [locationNotes, setLocationNotes] = useState<{ [address: string]: LocationNote[] }>({});
  const [noteModal, setNoteModal] = useState<{ orderId: number; address: string } | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteSubmitting, setNoteSubmitting] = useState(false);

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

  const fetchLocationNotes = async (address: string) => {
    if (!address || locationNotes[address]) return;
    try {
      const res = await fetch(`/api/driver/location-notes?address=${encodeURIComponent(address)}`, { credentials: "include" });
      if (res.ok) {
        const notes: LocationNote[] = await res.json();
        setLocationNotes(prev => ({ ...prev, [address]: notes }));
      }
    } catch {}
  };

  useEffect(() => {
    fetchActiveOrders();
    const interval = setInterval(fetchActiveOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    activeOrders.filter(o => o.status === "picked_up").forEach(o => {
      fetchLocationNotes(o.deliveryAddress);
    });
  }, [activeOrders]);

  // Show alert modal for new jobs (first unseen job)
  useEffect(() => {
    if (!jobs || jobs.length === 0) return;
    if (alertJob) return; // already showing one
    const unseen = (jobs as any[]).find(j => !seenJobIds.current.has(j.id));
    if (unseen) {
      seenJobIds.current.add(unseen.id);
      setAlertJob(unseen);
    }
  }, [jobs]);

  // GPS tracking when on active picked_up delivery
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    const hasActivePickedUp = activeOrders.some(o => o.status === "picked_up");
    if (!hasActivePickedUp) return;

    const sendLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          apiFetch("/api/drivers/me/location", {
            method: "PATCH",
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
        if (pendingNoteRef.current) {
          setNoteModal(pendingNoteRef.current);
          setNoteText("");
          pendingNoteRef.current = null;
        }
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.error ?? t.error;
        toast({ title: "❌ Error", description: msg, variant: "destructive" });
        setPinModal(null);
        pendingNoteRef.current = null;
      },
    }
  });

  const accept = useAcceptJob({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAvailableJobsQueryKey() });
        fetchActiveOrders();
        setAlertJob(null);
        toast({ title: t.jobAccepted, description: t.goPickUp });
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.error ?? t.error;
        toast({ title: "Error", description: msg, variant: "destructive" });
        setAlertJob(null);
      },
    }
  });

  const decline = useDeclineJob({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAvailableJobsQueryKey() });
        setAlertJob(null);
      },
    }
  });

  const markAgeVerified = useMutation({
    mutationFn: async (orderId: number) => {
      const r = await apiFetch(`/api/orders/${orderId}/age-verified`, { method: "PATCH" });
      if (!r.ok) throw new Error("Failed to verify age");
      return r.json();
    },
    onSuccess: (_data, orderId) => {
      setAgeVerifiedIds(prev => { const next = new Set(prev); next.add(orderId); return next; });
      toast({ title: "✅ Edad verificada" });
    },
    onError: () => toast({ title: "Error al verificar edad", variant: "destructive" }),
  });

  const handleMarkPickedUp = (orderId: number) => {
    setArrivedIds(prev => { const next = new Set(prev); next.delete(orderId); return next; });
    updateStatus.mutate({ orderId, data: { status: "picked_up" } });
  };

  const handleMarkDelivered = async (orderId: number, verificationPin: string) => {
    const photo = deliveryPhoto[orderId];
    setUploadingId(orderId);
    let deliveryPhotoPath: string | undefined;

    if (photo) {
      try {
        const urlRes = await apiFetch("/api/storage/uploads/request-url", {
          method: "POST",
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

    updateStatus.mutate({ orderId, data: { status: "delivered", deliveryPhotoPath, verificationPin } as any });
    setUploadingId(null);
  };

  return (
    <div className="min-h-screen bg-background text-white">
      {/* Alert modal for new job */}
      {alertJob && (
        <JobAlertModal
          job={alertJob}
          onAccept={(id) => accept.mutate({ orderId: id })}
          onDecline={(id) => { decline.mutate({ orderId: id }); setAlertJob(null); }}
          accepting={accept.isPending}
          declining={decline.isPending}
        />
      )}

      <div className="bg-background border-b border-yellow-400/20 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/driver">
          <button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10 transition">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <h1 className="text-xl font-black text-yellow-400">{t.availableJobs}</h1>
        <div className="ml-auto flex items-center gap-2">
          <LangToggle />
          {jobs && (jobs as any[]).length > 0 && (
            <Badge className="bg-yellow-400 text-black font-bold">{(jobs as any[]).length}</Badge>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">

        {/* ─── ACTIVE ORDERS ─── */}
        {!activeLoading && activeOrders.length > 0 && (
          <div>
            <p className="text-xs text-yellow-400 uppercase tracking-widest font-bold mb-3">🛵 En curso</p>
            <div className="space-y-4">
              {activeOrders.map((order) => {
                const arrived = arrivedIds.has(order.id);
                return (
                  <div key={order.id} className="bg-yellow-400/5 border border-yellow-400/40 rounded-2xl p-4 shadow-[0_0_20px_rgba(255,215,0,0.1)]">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-xs text-[#FFD700]/70 uppercase tracking-widest mb-1">#{order.id}</p>
                        <p className="font-black text-xl text-yellow-400">{formatDOP(order.driverEarnings + (order.tip ?? 0))}</p>
                        <p className="text-xs text-white/60">tu ganancia{order.tip > 0 ? ` + RD$${order.tip} propina` : ""}</p>
                        {order.isFirstTimeBuyer && (
                          <div className="flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-lg bg-green-400/15 border border-green-400/30 w-fit">
                            <Sparkles size={11} className="text-green-400" />
                            <span className="text-xs font-black text-green-400">¡Primer pedido del cliente!</span>
                          </div>
                        )}
                      </div>
                      <Badge className={`border ${order.status === "accepted" ? "bg-blue-400/20 text-blue-400 border-blue-400/40" : "bg-purple-400/20 text-purple-400 border-purple-400/40"}`}>
                        {order.status === "accepted"
                          ? <><Store size={12} className="mr-1 inline" />{arrived ? "Esperando pedido" : "Ve a recoger"}</>
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
                            : <p className="text-sm text-white/70">{order.businessName}</p>}
                        </div>
                        <div className="border-t border-white/5 pt-3">
                          <p className="text-xs text-[#FFD700]/70 font-bold uppercase tracking-wide mb-1">
                            <MapPinned size={10} className="inline mr-1" />Paso 2 — Entregar luego en
                          </p>
                          <p className="text-sm text-white/60">{order.deliveryAddress}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 mb-3">
                        <div>
                          <p className="text-xs text-yellow-400 font-bold uppercase tracking-wide mb-1">🏠 Paso 2 — Entregar ahora en</p>
                          <NavLinks address={order.deliveryAddress} label="destino" />
                        </div>
                        {locationNotes[order.deliveryAddress]?.length > 0 && (
                          <div className="rounded-xl bg-amber-400/10 border border-amber-400/30 px-3 py-2.5 space-y-1.5">
                            <div className="flex items-center gap-1.5 mb-1">
                              <NotebookPen size={11} className="text-amber-400" />
                              <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Notas de otros motoristas</span>
                            </div>
                            {locationNotes[order.deliveryAddress].map(n => (
                              <p key={n.id} className="text-xs text-amber-200/90 italic">• {n.note}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {order.notes && (
                      <p className="text-xs text-gray-400 bg-white/5 rounded-lg px-3 py-2 mb-3 italic">"{order.notes}"</p>
                    )}

                    {/* Photo upload for delivery */}
                    {order.status === "picked_up" && (
                      <div className="mb-3">
                        <p className="text-xs text-white/60 mb-2 font-bold">📸 Foto de entrega (opcional)</p>
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
                            <span className="text-xs text-green-400 font-bold">✓ Lista</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* WhatsApp customer contact */}
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

                    {/* ─── QUICK-ACTION BAR ─── */}
                    {order.status === "accepted" ? (
                      <div className="space-y-2">
                        {!arrived ? (
                          <Button
                            className="w-full h-20 rounded-2xl bg-orange-500 hover:bg-orange-400 text-white font-black text-xl shadow-[0_0_30px_rgba(249,115,22,0.5)] active:scale-[0.97] transition-transform"
                            onClick={() => setArrivedIds(prev => new Set(prev).add(order.id))}
                          >
                            📍 Llegué al negocio
                          </Button>
                        ) : (
                          <Button
                            className="w-full h-20 rounded-2xl bg-blue-500 hover:bg-blue-400 text-white font-black text-xl shadow-[0_0_30px_rgba(59,130,246,0.5)] active:scale-[0.97] transition-transform"
                            onClick={() => handleMarkPickedUp(order.id)}
                            disabled={updateStatus.isPending}
                          >
                            <Package size={22} className="mr-2" />
                            ✅ Ya recogí el pedido
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Age verification — required for liquor store orders */}
                        {order.requiresAgeCheck && !ageVerifiedIds.has(order.id) && !order.ageVerified && (
                          <button
                            className="w-full h-14 rounded-2xl border-2 border-blue-400/60 bg-blue-400/10 text-blue-400 font-black text-sm flex items-center justify-center gap-2 hover:bg-blue-400/20 transition active:scale-95"
                            onClick={() => markAgeVerified.mutate(order.id)}
                            disabled={markAgeVerified.isPending}
                          >
                            {markAgeVerified.isPending
                              ? <Loader2 size={16} className="animate-spin" />
                              : <ShieldCheck size={18} />
                            }
                            🪪 Verifiqué la cédula del cliente
                          </button>
                        )}
                        {order.requiresAgeCheck && (ageVerifiedIds.has(order.id) || order.ageVerified) && (
                          <div className="w-full h-8 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center justify-center gap-1.5 text-green-400 text-xs font-bold">
                            <CheckCircle2 size={13} /> Cédula verificada ✓
                          </div>
                        )}
                        <Button
                          className="w-full h-20 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xl shadow-[0_0_40px_rgba(255,215,0,0.6)] active:scale-[0.97] transition-transform disabled:opacity-40"
                          onClick={() => { setPinInput(""); setPinModal({ orderId: order.id }); }}
                          disabled={
                            updateStatus.isPending ||
                            uploadingId === order.id ||
                            (order.requiresAgeCheck && !ageVerifiedIds.has(order.id) && !order.ageVerified)
                          }
                        >
                          {uploadingId === order.id
                            ? <Loader2 size={22} className="mr-2 animate-spin" />
                            : <ShieldCheck size={22} className="mr-2" />
                          }
                          🎉 Marcar como entregado
                        </Button>
                      </div>
                    )}
                    <button
                      onClick={() => { setReportModal({ orderId: order.id }); setReportReason(""); setReportNotes(""); }}
                      className="w-full mt-2 flex items-center justify-center gap-2 py-2 rounded-xl text-xs text-white/40 hover:text-red-400 hover:bg-red-400/5 transition border border-transparent hover:border-red-400/20"
                    >
                      <AlertTriangle size={12} />
                      Reportar problema con este pedido
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── AVAILABLE JOBS ─── */}
        <div>
          {activeOrders.length > 0 && (
            <p className="text-xs text-[#FFD700]/70 uppercase tracking-widest font-bold mb-3">Nuevos trabajos</p>
          )}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-52 bg-white/8 rounded-2xl" />)}
            </div>
          ) : (jobs as any[])?.length === 0 && activeOrders.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-5xl mb-3">😴</p>
              <p className="text-xl font-black text-white mb-2">{t.noJobs}</p>
              <p className="text-white/60">{t.noJobsMsg}</p>
            </div>
          ) : (jobs as any[])?.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white/60 text-sm">No hay nuevos pedidos disponibles ahora mismo</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(jobs as any[])?.map((job) => (
                <div key={job.id} data-testid={`job-card-${job.id}`} className="bg-white/8 border border-yellow-400/20 rounded-2xl p-4 shadow-[0_0_20px_rgba(255,215,0,0.05)]">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-[#FFD700]/70 mb-1 uppercase tracking-widest">#{job.id}</p>
                      <p className="font-black text-xl text-yellow-400">{formatDOP(job.driverEarnings + (job.tip ?? 0))}</p>
                      <p className="text-xs text-white/60">{t.yourEarning}{job.tip > 0 ? ` + RD$${job.tip} propina` : ""}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={`border ${job.paymentMethod === "cash" ? "bg-green-400/20 text-green-400 border-green-400/40" : "bg-blue-400/20 text-blue-400 border-blue-400/40"}`}>
                        {job.paymentMethod === "cash" ? <Banknote size={12} className="mr-1 inline" /> : <CreditCard size={12} className="mr-1 inline" />}
                        {job.paymentMethod === "cash" ? t.cash : t.card}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-white/60">
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
                        : <p className="text-xs text-white/40">Dirección no disponible</p>}
                    </div>
                    <div className="border-t border-white/5 pt-3">
                      <p className="text-xs text-[#FFD700]/70 font-bold uppercase tracking-wide mb-1">
                        <MapPin size={10} className="inline mr-1" />Entregar en
                      </p>
                      <p className="text-sm text-white/80">{job.deliveryAddress}</p>
                    </div>
                  </div>

                  {job.notes && (
                    <p className="text-xs text-gray-400 bg-white/5 rounded-lg px-3 py-2 mb-3 italic">"{job.notes}"</p>
                  )}

                  <div className="border-t border-white/10 pt-3 flex items-center justify-between mb-3">
                    <span className="text-sm text-white/70">{t.earningsTotal}</span>
                    <span className="font-bold text-white">{formatDOP(job.totalAmount + job.deliveryFee)}</span>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 border-white/20 text-white/50 hover:border-red-400/50 hover:text-red-400 font-bold"
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

      {/* PIN Verification Modal */}
      {pinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6">
          <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100 text-center">
              <div className="w-14 h-14 rounded-full bg-yellow-50 border-2 border-yellow-400/30 flex items-center justify-center mx-auto mb-3">
                <ShieldCheck size={26} className="text-yellow-500" />
              </div>
              <h2 className="text-lg font-black text-gray-900">Verificación de entrega</h2>
              <p className="text-sm text-gray-500 mt-1">Pídele al cliente su PIN de 4 dígitos y escríbelo aquí</p>
            </div>
            <div className="px-6 py-5">
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                placeholder="_ _ _ _"
                value={pinInput}
                onChange={e => setPinInput(e.target.value.slice(0, 4))}
                className="w-full text-center text-4xl font-black tracking-[0.4em] border-2 border-gray-200 rounded-xl py-4 outline-none focus:border-yellow-400 transition text-gray-900 bg-gray-50 placeholder:text-gray-300"
                autoFocus
              />
            </div>
            <div className="flex border-t border-gray-100">
              <button
                onClick={() => { setPinModal(null); setPinInput(""); }}
                className="flex-1 py-4 text-base font-bold text-gray-500 hover:bg-gray-50 transition border-r border-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (pinInput.length !== 4) {
                    toast({ title: "PIN incompleto", description: "El PIN debe tener 4 dígitos", variant: "destructive" });
                    return;
                  }
                  const order = activeOrders.find(o => o.id === pinModal.orderId);
                  if (order) pendingNoteRef.current = { orderId: order.id, address: order.deliveryAddress };
                  handleMarkDelivered(pinModal.orderId, pinInput);
                  setPinModal(null);
                  setPinInput("");
                }}
                disabled={updateStatus.isPending || uploadingId === pinModal.orderId}
                className="flex-1 py-4 text-base font-bold text-yellow-500 hover:bg-yellow-50 transition disabled:opacity-50"
              >
                {updateStatus.isPending ? <Loader2 size={18} className="animate-spin mx-auto" /> : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Problem Report Modal */}
      {reportModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setReportModal(null)} />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-t-3xl p-6 pb-8 space-y-4">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <div>
                <h2 className="text-base font-black text-gray-900">Reportar problema</h2>
                <p className="text-xs text-gray-500">Pedido #{reportModal.orderId}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">¿Cuál es el problema?</p>
              <div className="space-y-2">
                {[
                  { key: "customer_not_home", label: "El cliente no está en casa" },
                  { key: "wrong_address", label: "Dirección incorrecta o no existe" },
                  { key: "customer_not_answering", label: "El cliente no contesta" },
                  { key: "order_issue", label: "Problema con el pedido del negocio" },
                  { key: "safety", label: "Problema de seguridad" },
                  { key: "other", label: "Otro" },
                ].map(r => (
                  <button
                    key={r.key}
                    onClick={() => setReportReason(r.key)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition ${
                      reportReason === r.key
                        ? "bg-red-500 text-white"
                        : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Notas adicionales (opcional)</p>
              <textarea
                value={reportNotes}
                onChange={e => setReportNotes(e.target.value)}
                placeholder="Explica qué pasó..."
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 resize-none focus:outline-none focus:border-red-400"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setReportModal(null)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-bold text-sm"
              >
                Cancelar
              </button>
              <button
                disabled={!reportReason || reportLoading}
                onClick={async () => {
                  if (!reportReason || reportLoading) return;
                  setReportLoading(true);
                  try {
                    const res = await apiFetch(`/api/orders/${reportModal.orderId}/report-problem`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ reason: reportReason, notes: reportNotes || undefined }),
                    });
                    if (res.ok) {
                      toast({ title: "✅ Reporte enviado", description: "El equipo de YaPide fue notificado." });
                      setReportModal(null);
                    } else {
                      const err = await res.json().catch(() => ({}));
                      toast({ title: "Error", description: err.error ?? "No se pudo enviar", variant: "destructive" });
                    }
                  } finally {
                    setReportLoading(false);
                  }
                }}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {reportLoading ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
                Enviar reporte
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Location Note Modal — shown after delivery */}
      {noteModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setNoteModal(null)} />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-t-3xl p-6 pb-10 space-y-4">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                <NotebookPen size={20} className="text-amber-500" />
              </div>
              <div>
                <h2 className="text-base font-black text-gray-900">¿Fue difícil encontrar?</h2>
                <p className="text-xs text-gray-500">Deja una nota para el próximo motorista</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl px-3 py-2">
              <p className="text-xs text-gray-400 truncate"><MapPin size={10} className="inline mr-1 text-yellow-500" />{noteModal.address}</p>
            </div>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder='Ej: "El portón está cerrado, tocar 2 veces" o "Parquear en la esquina"'
              rows={3}
              maxLength={200}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 resize-none focus:outline-none focus:border-amber-400 transition"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setNoteModal(null)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-bold text-sm"
              >
                Saltar
              </button>
              <button
                disabled={!noteText.trim() || noteSubmitting}
                onClick={async () => {
                  if (!noteText.trim() || noteSubmitting) return;
                  setNoteSubmitting(true);
                  try {
                    await apiFetch("/api/driver/location-notes", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ addressText: noteModal.address, note: noteText.trim(), orderId: noteModal.orderId }),
                    });
                    toast({ title: "✅ Nota guardada", description: "Gracias, ayudas al próximo motorista." });
                    setNoteModal(null);
                  } catch {
                    toast({ title: "Error", description: "No se pudo guardar la nota", variant: "destructive" });
                  } finally {
                    setNoteSubmitting(false);
                  }
                }}
                className="flex-[2] py-3 rounded-xl bg-amber-400 text-black font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {noteSubmitting ? <Loader2 size={14} className="animate-spin" /> : <NotebookPen size={14} />}
                Guardar nota
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat for most active delivery order */}
      {(() => {
        const active = activeOrders.find(o => o.status === "picked_up" || o.status === "accepted");
        if (!active) return null;
        return (
          <ChatPanel
            orderId={active.id}
            partnerRole="customer"
            partnerName={(active as any).customerName ?? null}
          />
        );
      })()}
    </div>
  );
}
