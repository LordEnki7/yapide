import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { apiFetch } from "@/lib/apiFetch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Sparkles, Send, Loader2, CheckCircle2, Tag, Truck, Star, Bell, RotateCcw, Megaphone, QrCode, Download } from "lucide-react";

type ActionType = "delivery_window" | "banner" | "points_event" | "push" | "qr_code";

interface PromoAction {
  type: ActionType;
  label: string;
  data: Record<string, any>;
}

interface PromoPlan {
  summary: string;
  actions: PromoAction[];
}

interface ExecuteResult {
  type: string;
  id?: number;
  status: string;
}

const ACTION_META: Record<ActionType, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  delivery_window: { icon: Truck,    color: "text-green-400",  bg: "bg-green-500/15",  border: "border-green-500/30" },
  banner:          { icon: Megaphone,color: "text-blue-400",   bg: "bg-blue-500/15",   border: "border-blue-500/30" },
  points_event:    { icon: Star,     color: "text-yellow-400", bg: "bg-yellow-500/15", border: "border-yellow-500/30" },
  push:            { icon: Bell,     color: "text-purple-400", bg: "bg-purple-500/15", border: "border-purple-500/30" },
  qr_code:         { icon: QrCode,   color: "text-orange-400", bg: "bg-orange-500/15", border: "border-orange-500/30" },
};

const QR_API = (url: string, size = 220) =>
  `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(url)}&size=${size}x${size}&color=040f26&bgcolor=FFD700&margin=10&format=png`;

function downloadQR(qrUrl: string, label: string) {
  fetch(qrUrl).then(r => r.blob()).then(blob => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `yapide-qr-${label}.png`;
    a.click();
  });
}

const EXAMPLES = [
  "Free delivery every Friday night from 7 to 10 PM",
  "Double points all weekend starting this Saturday",
  "Send a push to inactive customers with a 'we miss you' message",
  "Run a triple points event tonight from 6 to 9 PM with a banner",
  "Generate a QR code for promo code VERANO25 with a matching banner",
  "Free delivery this Sunday only for Mother's Day",
];

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function ActionPreview({ action }: { action: PromoAction }) {
  const meta = ACTION_META[action.type] ?? ACTION_META.banner;
  const Icon = meta.icon;

  return (
    <div className={`rounded-2xl border ${meta.bg} ${meta.border} p-4 space-y-3`}>
      <div className="flex items-center gap-2">
        <Icon size={16} className={meta.color} />
        <span className={`text-xs font-black uppercase tracking-widest ${meta.color}`}>{action.label}</span>
      </div>

      {action.type === "banner" && (
        <div className="rounded-xl overflow-hidden">
          <div className="h-16 relative flex items-center px-4" style={{ backgroundColor: action.data.bgColor ?? "#0057B7" }}>
            <div>
              <p className="font-black text-white text-sm">{action.data.title}</p>
              {action.data.subtitle && <p className="text-white/70 text-xs">{action.data.subtitle}</p>}
            </div>
            {action.data.ctaText && (
              <span className="ml-auto text-xs bg-yellow-400 text-black font-bold px-2 py-1 rounded-lg flex-shrink-0">{action.data.ctaText}</span>
            )}
          </div>
        </div>
      )}

      {action.type === "delivery_window" && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-black/20 rounded-lg px-3 py-2">
            <p className="text-white/50 mb-0.5">Nombre</p>
            <p className="text-white font-bold">{action.data.name}</p>
          </div>
          <div className="bg-black/20 rounded-lg px-3 py-2">
            <p className="text-white/50 mb-0.5">Día</p>
            <p className="text-white font-bold">
              {action.data.specificDate ? action.data.specificDate
                : action.data.dayOfWeek !== null && action.data.dayOfWeek !== undefined
                ? DAYS[action.data.dayOfWeek]
                : "Todos los días"}
            </p>
          </div>
          <div className="bg-black/20 rounded-lg px-3 py-2 col-span-2">
            <p className="text-white/50 mb-0.5">Horario</p>
            <p className="text-white font-bold">{action.data.startTime} – {action.data.endTime}</p>
          </div>
        </div>
      )}

      {action.type === "points_event" && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-black/20 rounded-lg px-3 py-2">
            <p className="text-white/50 mb-0.5">Nombre</p>
            <p className="text-white font-bold">{action.data.name}</p>
          </div>
          <div className="bg-black/20 rounded-lg px-3 py-2">
            <p className="text-white/50 mb-0.5">Multiplicador</p>
            <p className="text-yellow-400 font-black text-lg">{action.data.multiplier}x</p>
          </div>
          <div className="bg-black/20 rounded-lg px-3 py-2">
            <p className="text-white/50 mb-0.5">Inicio</p>
            <p className="text-white font-bold">{action.data.startsAt ? new Date(action.data.startsAt).toLocaleString("es-DO", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</p>
          </div>
          <div className="bg-black/20 rounded-lg px-3 py-2">
            <p className="text-white/50 mb-0.5">Fin</p>
            <p className="text-white font-bold">{action.data.endsAt ? new Date(action.data.endsAt).toLocaleString("es-DO", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</p>
          </div>
        </div>
      )}

      {action.type === "push" && (
        <div className="bg-black/40 rounded-xl p-3 flex gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0057B7] flex items-center justify-center flex-shrink-0 text-sm">🛵</div>
          <div>
            <p className="font-bold text-white text-sm">{action.data.title}</p>
            <p className="text-white/60 text-xs mt-0.5">{action.data.body}</p>
            <p className="text-purple-400 text-[10px] mt-1 font-bold">Segmento: {action.data.segment === "all" ? "Todos" : action.data.segment === "inactive" ? "Inactivos" : "Nuevos"}</p>
          </div>
        </div>
      )}

      {action.type === "qr_code" && (() => {
        const fullUrl = `${window.location.origin}${action.data.targetPath}`;
        const qrImg = QR_API(fullUrl, 220);
        return (
          <div className="flex gap-4 items-start">
            <div className="bg-white rounded-xl p-2 flex-shrink-0 shadow-lg">
              <img src={qrImg} alt="QR Code preview" className="w-28 h-28 object-contain rounded-lg" />
            </div>
            <div className="flex-1 space-y-2 min-w-0">
              <div className="bg-black/20 rounded-lg px-3 py-2 text-xs">
                <p className="text-white/50 mb-0.5">Destino</p>
                <p className="text-orange-300 font-mono font-bold break-all">{action.data.targetPath}</p>
              </div>
              {action.data.description && (
                <div className="bg-black/20 rounded-lg px-3 py-2 text-xs">
                  <p className="text-white/50 mb-0.5">Descripción</p>
                  <p className="text-white font-medium">{action.data.description}</p>
                </div>
              )}
              <button
                onClick={() => downloadQR(qrImg, action.data.promoCode ?? "promo")}
                className="flex items-center gap-1.5 text-xs font-bold text-orange-400 bg-orange-500/15 border border-orange-500/30 px-3 py-1.5 rounded-lg hover:bg-orange-500/25 transition"
              >
                <Download size={12} /> Descargar QR
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default function AdminPromoAI() {
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const [interpreting, setInterpreting] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [plan, setPlan] = useState<PromoPlan | null>(null);
  const [results, setResults] = useState<ExecuteResult[] | null>(null);
  const [selectedActions, setSelectedActions] = useState<Set<number>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [input]);

  const interpret = async () => {
    if (!input.trim() || interpreting) return;
    setInterpreting(true);
    setPlan(null);
    setResults(null);
    try {
      const res = await apiFetch("/api/agents/promo/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input.trim() }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPlan(data);
      setSelectedActions(new Set(data.actions.map((_: any, i: number) => i)));
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setInterpreting(false);
    }
  };

  const execute = async () => {
    if (!plan || executing) return;
    const actionsToRun = plan.actions.filter((_, i) => selectedActions.has(i));
    if (actionsToRun.length === 0) { toast({ title: "Selecciona al menos una acción" }); return; }
    setExecuting(true);
    try {
      const res = await apiFetch("/api/agents/promo/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actions: actionsToRun }),
      });
      const data = await res.json();
      setResults(data.results);
      toast({ title: `¡Listo! ${data.results.length} promoción(es) creada(s)` });
    } catch (err: any) {
      toast({ title: "Error al ejecutar", description: err.message, variant: "destructive" });
    } finally {
      setExecuting(false);
    }
  };

  const reset = () => {
    setPlan(null);
    setResults(null);
    setInput("");
    setSelectedActions(new Set());
  };

  const toggleAction = (i: number) => {
    setSelectedActions(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#040f26] text-white flex flex-col max-w-[600px] mx-auto">
      {/* Header */}
      <div className="bg-[#040f26] border-b border-white/10 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/admin">
          <button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <div>
          <h1 className="text-xl font-black text-yellow-400 flex items-center gap-2">
            <Sparkles size={20} /> Agente de Promociones
          </h1>
          <p className="text-xs text-white/40">Describe la promo en inglés — el agente lo crea</p>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-5 overflow-y-auto pb-32">

        {/* Idle state — examples */}
        {!plan && !interpreting && (
          <div className="space-y-4">
            <div className="bg-[#0057B7]/20 border border-[#0057B7]/40 rounded-2xl p-4 space-y-2">
              <p className="text-sm font-bold text-[#0057B7] flex items-center gap-2"><Sparkles size={14} /> How it works</p>
              <p className="text-sm text-white/70">Type any promo idea in plain English below. The agent will understand it, translate it to Spanish, and set everything up — banners, delivery windows, points events, or push notifications.</p>
            </div>
            <div>
              <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Try saying...</p>
              <div className="space-y-2">
                {EXAMPLES.map(e => (
                  <button key={e} onClick={() => setInput(e)}
                    className="w-full text-left text-sm bg-white/5 border border-white/10 rounded-xl px-4 py-3 hover:bg-white/8 hover:border-yellow-400/30 transition text-white/70 hover:text-white">
                    "{e}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {interpreting && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-yellow-400/20 flex items-center justify-center">
              <Sparkles size={28} className="text-yellow-400 animate-pulse" />
            </div>
            <div className="text-center">
              <p className="font-bold text-white">Interpretando tu idea...</p>
              <p className="text-sm text-white/50 mt-1">Generando contenido en español</p>
            </div>
          </div>
        )}

        {/* Plan preview */}
        {plan && !results && (
          <div className="space-y-4">
            {/* What the AI understood */}
            <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
              <p className="text-xs text-white/40 uppercase tracking-widest font-bold mb-1">Entendí</p>
              <p className="text-white text-sm font-medium">"{plan.summary}"</p>
            </div>

            {/* Action cards */}
            <div>
              <p className="text-xs font-bold text-yellow-400/80 uppercase tracking-widest mb-2">
                {plan.actions.length} acción(es) a crear — selecciona las que quieres
              </p>
              <div className="space-y-3">
                {plan.actions.map((action, i) => (
                  <div key={i} className="relative">
                    <button
                      onClick={() => toggleAction(i)}
                      className={`absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition z-10 ${
                        selectedActions.has(i)
                          ? "bg-yellow-400 border-yellow-400"
                          : "bg-transparent border-white/30"
                      }`}
                    >
                      {selectedActions.has(i) && <span className="text-black text-xs font-black">✓</span>}
                    </button>
                    <div className={`transition ${!selectedActions.has(i) ? "opacity-50" : ""}`}>
                      <ActionPreview action={action} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <button onClick={reset}
                className="flex items-center gap-2 bg-white/8 border border-white/10 text-white/70 font-bold text-sm px-4 py-3 rounded-xl hover:bg-white/12 transition">
                <RotateCcw size={15} /> Reiniciar
              </button>
              <button
                onClick={execute}
                disabled={executing || selectedActions.size === 0}
                className="flex-1 flex items-center justify-center gap-2 bg-yellow-400 text-black font-black text-base py-3 rounded-xl hover:bg-yellow-300 transition disabled:opacity-50 shadow-[0_0_20px_rgba(255,215,0,0.25)]"
              >
                {executing ? <><Loader2 size={18} className="animate-spin" /> Creando...</> : <><Sparkles size={18} /> Confirmar y crear</>}
              </button>
            </div>
          </div>
        )}

        {/* Success state */}
        {results && (
          <div className="space-y-4">
            <div className="bg-green-500/15 border border-green-500/30 rounded-2xl p-6 text-center space-y-3">
              <CheckCircle2 size={48} className="mx-auto text-green-400" />
              <h2 className="text-xl font-black text-white">¡Promociones creadas!</h2>
              <p className="text-white/60 text-sm">{results.length} elemento(s) configurados y activos</p>
            </div>
            <div className="space-y-2">
              {results.map((r, i) => {
                const meta = ACTION_META[r.type as ActionType];
                const Icon = meta?.icon ?? Tag;
                const isOk = r.status === "created" || r.status === "sent" || r.status === "ready";

                if (r.type === "qr_code" && r.status === "ready") {
                  const fullUrl = `${window.location.origin}${(r as any).targetPath}`;
                  const qrImg = QR_API(fullUrl, 200);
                  return (
                    <div key={i} className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 flex gap-4 items-center">
                      <div className="bg-white rounded-xl p-1.5 flex-shrink-0">
                        <img src={qrImg} alt="QR" className="w-16 h-16 rounded-lg" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white">QR Code listo</p>
                        <p className="text-xs text-white/50 font-mono break-all">{(r as any).targetPath}</p>
                      </div>
                      <button onClick={() => downloadQR(qrImg, (r as any).promoCode ?? "promo")}
                        className="flex-shrink-0 bg-orange-500/20 border border-orange-500/30 rounded-lg p-2 hover:bg-orange-500/30 transition">
                        <Download size={16} className="text-orange-400" />
                      </button>
                    </div>
                  );
                }

                return (
                  <div key={i} className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${isOk ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"}`}>
                    <Icon size={16} className={meta?.color ?? "text-white/50"} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white capitalize">{r.type.replace(/_/g, " ")}</p>
                      <p className="text-xs text-white/50">{r.status}{r.id ? ` · ID #${r.id}` : ""}</p>
                    </div>
                    {isOk ? <CheckCircle2 size={16} className="text-green-400 flex-shrink-0" /> : <span className="text-red-400 text-xs">Error</span>}
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={reset} className="bg-white/8 border border-white/10 text-white font-bold py-3 rounded-xl hover:bg-white/12 transition text-sm">
                Nueva promo
              </button>
              <Link href="/admin">
                <button className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl hover:bg-yellow-300 transition text-sm">
                  Ir al panel →
                </button>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Input bar — fixed at bottom */}
      {!results && (
        <div className="fixed bottom-0 left-0 right-0 max-w-[600px] mx-auto px-4 pb-6 pt-3 bg-gradient-to-t from-[#040f26] via-[#040f26] to-transparent">
          <div className="bg-white/8 border border-white/15 rounded-2xl flex items-end gap-2 px-4 py-3 focus-within:border-yellow-400/50 transition">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (plan) reset(); else interpret(); } }}
              placeholder={plan ? "Describe another promo..." : "Describe your promo idea in English..."}
              rows={1}
              disabled={interpreting}
              className="flex-1 bg-transparent text-white text-sm placeholder:text-white/30 resize-none outline-none min-h-[24px]"
            />
            <button
              onClick={plan ? () => { reset(); setTimeout(interpret, 50); } : interpret}
              disabled={!input.trim() || interpreting}
              className="w-9 h-9 rounded-xl bg-yellow-400 flex items-center justify-center flex-shrink-0 disabled:opacity-40 hover:bg-yellow-300 transition"
            >
              {interpreting ? <Loader2 size={16} className="text-black animate-spin" /> : <Send size={16} className="text-black" />}
            </button>
          </div>
          <p className="text-[10px] text-white/25 text-center mt-2">Press Enter to send · Shift+Enter for new line</p>
        </div>
      )}
    </div>
  );
}
