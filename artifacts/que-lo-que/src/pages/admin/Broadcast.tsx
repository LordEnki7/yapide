import { useState } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, Users, UserCheck, UserX, CheckCircle2 } from "lucide-react";

const SEGMENTS = [
  { value: "all", label: "Todos los clientes", icon: Users, desc: "Envía a todos los que tienen la app instalada" },
  { value: "inactive", label: "Clientes inactivos", icon: UserX, desc: "Clientes que no han pedido en más de 30 días" },
  { value: "new", label: "Clientes nuevos", icon: UserCheck, desc: "Registrados en los últimos 7 días" },
];

const TEMPLATES = [
  { title: "🎉 ¡Oferta de hoy!", body: "Delivery gratis toda la noche. ¡Pide ahora en YaPide! 🛵" },
  { title: "😋 ¿Tienes hambre?", body: "Los mejores negocios de tu zona están esperando. ¡Pide en 5 minutos!" },
  { title: "⭐ ¡Te extrañamos!", body: "Vuelve y gana el doble de puntos en tu próximo pedido con YaPide." },
  { title: "🛵 Promo especial", body: "Código YAPIDE10 activo hoy — 10% de descuento en tu pedido. ¡Úsalo ya!" },
  { title: "🎁 Puntos dobles hoy", body: "¡Este fin de semana gana el doble de puntos en todos tus pedidos!" },
];

export default function AdminBroadcast() {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/customer");
  const [segment, setSegment] = useState("all");
  const [result, setResult] = useState<{ targeted: number; sent: number } | null>(null);

  const sendMutation = useMutation({
    mutationFn: () => apiFetch("/api/push/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, url, segment }),
    }).then(r => r.json()),
    onSuccess: (data) => {
      setResult(data);
      toast({ title: `¡Enviado! ${data.targeted} usuarios objetivo` });
    },
    onError: () => toast({ title: "Error al enviar", variant: "destructive" }),
  });

  const applyTemplate = (t: { title: string; body: string }) => {
    setTitle(t.title);
    setBody(t.body);
  };

  return (
    <div className="min-h-screen bg-[#040f26] text-white pb-10">
      <div className="bg-[#040f26] border-b border-white/10 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/admin"><button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10"><ArrowLeft size={18} /></button></Link>
        <h1 className="text-xl font-black text-yellow-400 flex items-center gap-2"><Send size={20} /> Push Masivo</h1>
      </div>

      <div className="px-4 py-4 space-y-5 max-w-2xl mx-auto">
        {result ? (
          <div className="bg-green-500/15 border border-green-500/30 rounded-2xl p-6 text-center space-y-3">
            <CheckCircle2 size={48} className="mx-auto text-green-400" />
            <h2 className="text-xl font-black text-white">¡Notificación enviada!</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-2xl font-black text-white">{result.targeted}</p>
                <p className="text-xs text-white/50">Usuarios objetivo</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-2xl font-black text-green-400">{result.sent}</p>
                <p className="text-xs text-white/50">Entregas confirmadas</p>
              </div>
            </div>
            <Button onClick={() => { setResult(null); setTitle(""); setBody(""); }} className="bg-yellow-400 text-black font-bold w-full hover:bg-yellow-300">
              Enviar otra notificación
            </Button>
          </div>
        ) : (
          <>
            {/* Segment selector */}
            <div>
              <p className="text-xs font-bold text-[#FFD700]/80 uppercase tracking-widest mb-2">Destinatarios</p>
              <div className="space-y-2">
                {SEGMENTS.map(s => {
                  const Icon = s.icon;
                  return (
                    <button key={s.value} onClick={() => setSegment(s.value)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition ${segment === s.value ? "bg-yellow-400/15 border-yellow-400/40" : "bg-white/5 border-white/10 hover:bg-white/8"}`}>
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${segment === s.value ? "bg-yellow-400/20" : "bg-white/10"}`}>
                        <Icon size={18} className={segment === s.value ? "text-yellow-400" : "text-white/60"} />
                      </div>
                      <div>
                        <p className={`font-bold text-sm ${segment === s.value ? "text-yellow-400" : "text-white"}`}>{s.label}</p>
                        <p className="text-xs text-white/50">{s.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Templates */}
            <div>
              <p className="text-xs font-bold text-[#FFD700]/80 uppercase tracking-widest mb-2">Plantillas rápidas</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {TEMPLATES.map(t => (
                  <button key={t.title} onClick={() => applyTemplate(t)}
                    className="flex-shrink-0 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-left hover:bg-white/10 transition max-w-[160px]">
                    <p className="text-xs font-bold text-yellow-400 truncate">{t.title}</p>
                    <p className="text-[10px] text-white/50 mt-0.5 line-clamp-2">{t.body}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Compose */}
            <div>
              <p className="text-xs font-bold text-[#FFD700]/80 uppercase tracking-widest mb-2">Mensaje</p>
              <div className="space-y-3">
                <Input placeholder="Título de la notificación *" value={title} onChange={e => setTitle(e.target.value)}
                  className="bg-white/8 border-white/10 text-white h-11 font-bold" />
                <textarea
                  placeholder="Cuerpo del mensaje *"
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={3}
                  className="w-full bg-white/8 border border-white/10 text-white rounded-xl px-3 py-3 text-sm placeholder:text-white/40 focus:outline-none focus:border-yellow-400 resize-none"
                />
                <Input placeholder="URL destino (ej: /customer/orders)" value={url} onChange={e => setUrl(e.target.value)}
                  className="bg-white/8 border-white/10 text-white h-10 text-sm" />
              </div>
            </div>

            {/* Preview */}
            {title && body && (
              <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
                <p className="text-xs font-bold text-[#FFD700]/80 uppercase tracking-widest mb-3">Vista previa</p>
                <div className="bg-black/60 rounded-xl p-3 flex gap-3 items-start">
                  <div className="w-10 h-10 rounded-xl bg-[#0057B7] flex items-center justify-center flex-shrink-0">
                    <img src="/logo.png" alt="" className="w-8 h-8 object-contain rounded" onError={e => (e.currentTarget.style.display = "none")} />
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{title}</p>
                    <p className="text-white/70 text-xs mt-0.5">{body}</p>
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending || !title || !body}
              className="w-full bg-yellow-400 text-black font-black text-lg h-14 hover:bg-yellow-300 shadow-[0_0_20px_rgba(255,215,0,0.2)]"
            >
              {sendMutation.isPending ? "Enviando..." : <span className="flex items-center gap-2"><Send size={18} /> Enviar notificación</span>}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
