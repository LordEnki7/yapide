import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Bell, Phone, CheckCircle2, AlertCircle, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Notification {
  id: number;
  orderId: number | null;
  channel: string;
  recipientPhone: string | null;
  recipientName: string | null;
  recipientRole: string;
  message: string;
  status: string;
  sent: boolean;
  createdAt: string;
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "ahora";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return d.toLocaleDateString("es-DO");
}

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "no_phone">("all");

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/notifications", { credentials: "include" });
      if (res.ok) setNotifications(await res.json());
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const filtered = notifications.filter(n => {
    if (filter === "pending") return n.status === "pending";
    if (filter === "no_phone") return n.status === "no_phone";
    return true;
  });

  const pending = notifications.filter(n => n.status === "pending").length;
  const noPhone = notifications.filter(n => n.status === "no_phone").length;

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-400/20 text-yellow-400 border-yellow-400/40",
    no_phone: "bg-gray-400/20 text-gray-400 border-gray-400/40",
    sent: "bg-green-400/20 text-green-400 border-green-400/40",
    failed: "bg-red-400/20 text-red-400 border-red-400/40",
  };

  const statusLabel: Record<string, string> = {
    pending: "Pendiente",
    no_phone: "Sin teléfono",
    sent: "Enviado",
    failed: "Falló",
  };

  return (
    <div className="min-h-screen bg-background text-white">
      <div className="bg-background border-b border-yellow-400/20 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/admin">
          <button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10 transition">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-yellow-400" />
          <h1 className="text-xl font-black text-yellow-400">Notificaciones WhatsApp</h1>
        </div>
        <button
          onClick={fetchNotifications}
          className="ml-auto w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10 transition"
        >
          <RefreshCw size={16} className={loading ? "animate-spin text-yellow-400" : "text-gray-400"} />
        </button>
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10 text-center">
            <p className="text-2xl font-black text-white">{notifications.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Total</p>
          </div>
          <div className="bg-yellow-400/5 rounded-2xl p-3 border border-yellow-400/20 text-center">
            <p className="text-2xl font-black text-yellow-400">{pending}</p>
            <p className="text-xs text-gray-400 mt-0.5">Pendientes</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10 text-center">
            <p className="text-2xl font-black text-gray-400">{noPhone}</p>
            <p className="text-xs text-gray-400 mt-0.5">Sin tel.</p>
          </div>
        </div>

        {/* Integration callout */}
        <div className="bg-green-400/8 border border-green-400/30 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">💬</span>
            <div>
              <p className="text-sm font-bold text-green-400 mb-1">Integración WhatsApp Business</p>
              <p className="text-xs text-gray-400 leading-relaxed">
                Estos mensajes están listos para enviar. Conecta <span className="text-white font-bold">WhatsApp Business API</span> (Meta) o <span className="text-white font-bold">Twilio</span> para automatizar el envío. Mientras tanto, los mensajes se registran aquí para envío manual.
              </p>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(["all", "pending", "no_phone"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                filter === f
                  ? "bg-yellow-400 text-black border-yellow-400"
                  : "bg-white/5 text-gray-400 border-white/10 hover:border-white/20"
              }`}
            >
              {f === "all" ? "Todos" : f === "pending" ? `Pendientes (${pending})` : `Sin tel. (${noPhone})`}
            </button>
          ))}
        </div>

        {/* Notification list */}
        {loading ? (
          <div className="text-center py-10">
            <RefreshCw size={24} className="animate-spin text-yellow-400 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Cargando...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-white font-bold mb-1">No hay notificaciones</p>
            <p className="text-gray-400 text-sm">Se registran automáticamente cuando cambia el estado de un pedido</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(n => (
              <div key={n.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-white/20 transition">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">💬</span>
                    <div>
                      <p className="text-sm font-bold text-white">{n.recipientName ?? "Sin nombre"}</p>
                      {n.recipientPhone ? (
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Phone size={10} />
                          +1 {n.recipientPhone}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <AlertCircle size={10} />
                          Sin número registrado
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <Badge className={`text-[10px] border ${statusColor[n.status] ?? "bg-white/10 text-gray-400 border-white/20"}`}>
                      {n.status === "sent" ? <CheckCircle2 size={10} className="mr-1 inline" /> : <Clock size={10} className="mr-1 inline" />}
                      {statusLabel[n.status] ?? n.status}
                    </Badge>
                    {n.orderId && (
                      <span className="text-[10px] text-gray-500">Pedido #{n.orderId}</span>
                    )}
                  </div>
                </div>

                <div className="bg-green-400/5 border border-green-400/15 rounded-xl px-3 py-2 mb-2">
                  <p className="text-xs text-gray-300 leading-relaxed">{n.message}</p>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">{timeAgo(n.createdAt)}</span>
                  {n.recipientPhone && (
                    <a
                      href={`https://wa.me/1${n.recipientPhone.replace(/\D/g, "")}?text=${encodeURIComponent(n.message)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-bold hover:bg-green-500/25 transition"
                    >
                      📱 Enviar
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
