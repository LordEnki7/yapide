import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { apiFetch } from "@/lib/apiFetch";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Calculator, Send, Loader2, TrendingUp, DollarSign,
  Truck, Building2, AlertTriangle, RefreshCw, FileText, ChevronDown, ChevronUp,
} from "lucide-react";

interface Snapshot {
  generatedAt: string;
  revenue: { today: number; week: number; month: number; total: number };
  gmv:     { today: number; week: number; month: number; total: number };
  cashFlow: {
    cashWithDrivers: number;
    cashAtOffice: number;
    pendingPayouts: number;
    lockedDriverCash: number;
    totalDiscrepancies: number;
  };
  orders: { total: number; delivered: number; today: number; week: number; month: number };
  topBusinesses: Array<{ businessId: number; name: string; commission: number }>;
  recentDeposits: Array<{ id: number; driverId: number; amount: number; discrepancy: number; createdAt: string }>;
  recentPayouts: Array<{ id: number; businessId: number; amount: number; status: string; method: string | null; createdAt: string }>;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

const fmt = (n: number) =>
  `RD$${Math.round(n).toLocaleString("es-DO")}`;

const QUICK_QUESTIONS = [
  "¿Cuánto efectivo está pendiente de depositar?",
  "¿Cuál es el margen de comisión este mes?",
  "¿Hay discrepancias en los depósitos de choferes?",
  "¿Qué negocios generan más comisión?",
  "Resume el estado financiero de esta semana",
  "¿Cuánto le debemos a los negocios?",
];

function KpiPill({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${color}`}>
      <p className="text-xs text-white/50 uppercase tracking-widest font-bold mb-1">{label}</p>
      <p className="text-xl font-black text-white">{value}</p>
      {sub && <p className="text-[11px] text-white/40 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AdminAccountant() {
  const { toast } = useToast();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loadingSnap, setLoadingSnap] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadSnapshot = async () => {
    setLoadingSnap(true);
    try {
      const res = await apiFetch("/api/agents/accountant/snapshot");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSnapshot(data);
    } catch (err: any) {
      toast({ title: "Error cargando snapshot", description: err.message, variant: "destructive" });
    } finally {
      setLoadingSnap(false);
    }
  };

  useEffect(() => { loadSnapshot(); }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const ask = async (q?: string) => {
    const question = (q ?? input).trim();
    if (!question || sending) return;
    setInput("");

    const newMessages: Message[] = [...messages, { role: "user", content: question }];
    setMessages(newMessages);
    setSending(true);

    try {
      const res = await apiFetch("/api/agents/accountant/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          snapshot,
          history: newMessages.slice(-8),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages(prev => [...prev, { role: "assistant", content: data.answer }]);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  };

  const generateReport = () => {
    if (!snapshot) return;
    const lines: string[] = [
      "=== REPORTE FINANCIERO YAPIDE ===",
      `Generado: ${new Date(snapshot.generatedAt).toLocaleString("es-DO")}`,
      "",
      "--- INGRESOS (COMISIÓN) ---",
      `Hoy:   ${fmt(snapshot.revenue.today)}`,
      `Semana: ${fmt(snapshot.revenue.week)}`,
      `Mes:    ${fmt(snapshot.revenue.month)}`,
      `Total:  ${fmt(snapshot.revenue.total)}`,
      "",
      "--- GMV (VALOR BRUTO) ---",
      `Hoy:   ${fmt(snapshot.gmv.today)}`,
      `Semana: ${fmt(snapshot.gmv.week)}`,
      `Mes:    ${fmt(snapshot.gmv.month)}`,
      `Total:  ${fmt(snapshot.gmv.total)}`,
      "",
      "--- FLUJO DE CAJA ---",
      `Con choferes (no depositado):  ${fmt(snapshot.cashFlow.cashWithDrivers)}`,
      `En oficina (por pagar negocios): ${fmt(snapshot.cashFlow.cashAtOffice)}`,
      `Pagos pendientes a negocios:    ${fmt(snapshot.cashFlow.pendingPayouts)}`,
      `Balance choferes:               ${fmt(snapshot.cashFlow.lockedDriverCash)}`,
      `Total discrepancias:            ${fmt(snapshot.cashFlow.totalDiscrepancies)}`,
      "",
      "--- PEDIDOS ---",
      `Total: ${snapshot.orders.total} | Entregados: ${snapshot.orders.delivered}`,
      `Hoy: ${snapshot.orders.today} | Semana: ${snapshot.orders.week} | Mes: ${snapshot.orders.month}`,
      "",
      "--- TOP 5 NEGOCIOS (COMISIÓN MES) ---",
      ...snapshot.topBusinesses.map((b, i) => `${i + 1}. ${b.name}: ${fmt(b.commission)}`),
      "",
      "--- CONVERSACIÓN CON CONTADORBOT ---",
      ...messages.map(m => `[${m.role === "user" ? "ADMIN" : "BOT"}] ${m.content}`),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `yapide-reporte-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    toast({ title: "Reporte generado", description: "El archivo .txt fue descargado" });
  };

  const margin = snapshot
    ? snapshot.gmv.month > 0
      ? ((snapshot.revenue.month / snapshot.gmv.month) * 100).toFixed(1)
      : "0.0"
    : null;

  return (
    <div className="min-h-screen bg-[#040f26] text-white flex flex-col max-w-[600px] mx-auto">
      {/* Header */}
      <div className="bg-[#040f26] border-b border-white/10 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/admin">
          <button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black text-yellow-400 flex items-center gap-2">
            <Calculator size={20} /> Contador IA
          </h1>
          <p className="text-xs text-white/40">Analiza las finanzas y responde preguntas contables</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadSnapshot}
            disabled={loadingSnap}
            className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10 disabled:opacity-40"
            title="Actualizar datos"
          >
            <RefreshCw size={15} className={loadingSnap ? "animate-spin" : ""} />
          </button>
          <button
            onClick={generateReport}
            disabled={!snapshot}
            className="flex items-center gap-1.5 bg-[#0057B7]/20 border border-[#0057B7]/40 text-blue-300 font-bold text-xs px-3 py-2 rounded-xl hover:bg-[#0057B7]/30 transition disabled:opacity-40"
          >
            <FileText size={13} /> Reporte
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4 overflow-y-auto pb-36">

        {/* KPI Snapshot */}
        {loadingSnap && !snapshot && (
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-2xl bg-white/8 animate-pulse" />)}
          </div>
        )}

        {snapshot && (
          <>
            {/* Revenue + GMV top row */}
            <div className="grid grid-cols-2 gap-3">
              <KpiPill
                label="Comisión (mes)"
                value={fmt(snapshot.revenue.month)}
                sub={`Hoy: ${fmt(snapshot.revenue.today)}`}
                color="bg-yellow-500/10 border-yellow-500/25"
              />
              <KpiPill
                label="GMV (mes)"
                value={fmt(snapshot.gmv.month)}
                sub={`Margen: ${margin}%`}
                color="bg-blue-500/10 border-blue-500/25"
              />
              <KpiPill
                label="Con choferes"
                value={fmt(snapshot.cashFlow.cashWithDrivers)}
                sub="Sin depositar"
                color={snapshot.cashFlow.cashWithDrivers > 5000 ? "bg-orange-500/15 border-orange-500/30" : "bg-white/5 border-white/10"}
              />
              <KpiPill
                label="En oficina"
                value={fmt(snapshot.cashFlow.cashAtOffice)}
                sub="Listo para pagar"
                color="bg-green-500/10 border-green-500/25"
              />
            </div>

            {/* Alert row */}
            {(snapshot.cashFlow.totalDiscrepancies > 0 || snapshot.cashFlow.pendingPayouts > 0) && (
              <div className="space-y-2">
                {snapshot.cashFlow.totalDiscrepancies > 0 && (
                  <div className="bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 flex items-center gap-3">
                    <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-red-300">Discrepancias detectadas</p>
                      <p className="text-xs text-white/50">{fmt(snapshot.cashFlow.totalDiscrepancies)} en diferencias de depósitos</p>
                    </div>
                  </div>
                )}
                {snapshot.cashFlow.pendingPayouts > 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/25 rounded-xl px-4 py-3 flex items-center gap-3">
                    <Building2 size={16} className="text-yellow-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-yellow-300">Pagos pendientes a negocios</p>
                      <p className="text-xs text-white/50">{fmt(snapshot.cashFlow.pendingPayouts)} por liquidar</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Collapsible top businesses + recent transactions */}
            <button
              onClick={() => setShowDetails(d => !d)}
              className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white/70 hover:bg-white/8 transition"
            >
              <span>Detalles — Top negocios · Depósitos · Pagos</span>
              {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showDetails && (
              <div className="space-y-4">
                {/* Top businesses */}
                {snapshot.topBusinesses.length > 0 && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                    <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                      <TrendingUp size={13} className="text-yellow-400" />
                      <p className="text-xs font-bold text-white/50 uppercase tracking-widest">Top negocios (comisión mes)</p>
                    </div>
                    <div className="divide-y divide-white/5">
                      {snapshot.topBusinesses.map((b, i) => (
                        <div key={b.businessId} className="px-4 py-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-black text-white/25 w-4">#{i+1}</span>
                            <span className="text-sm text-white truncate">{b.name}</span>
                          </div>
                          <span className="text-sm font-black text-yellow-400 flex-shrink-0">{fmt(b.commission)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent deposits */}
                {snapshot.recentDeposits.length > 0 && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                    <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                      <Truck size={13} className="text-green-400" />
                      <p className="text-xs font-bold text-white/50 uppercase tracking-widest">Últimos depósitos choferes</p>
                    </div>
                    <div className="divide-y divide-white/5">
                      {snapshot.recentDeposits.slice(0, 5).map(d => (
                        <div key={d.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm text-white">Chofer #{d.driverId}</p>
                            <p className="text-[11px] text-white/40">{new Date(d.createdAt).toLocaleDateString("es-DO")}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-black text-green-400">{fmt(d.amount)}</p>
                            {d.discrepancy !== 0 && (
                              <p className={`text-[11px] font-bold ${d.discrepancy < 0 ? "text-red-400" : "text-yellow-400"}`}>
                                {d.discrepancy > 0 ? "+" : ""}{fmt(d.discrepancy)} diff
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent payouts */}
                {snapshot.recentPayouts.length > 0 && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                    <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                      <DollarSign size={13} className="text-blue-400" />
                      <p className="text-xs font-bold text-white/50 uppercase tracking-widest">Últimos pagos a negocios</p>
                    </div>
                    <div className="divide-y divide-white/5">
                      {snapshot.recentPayouts.slice(0, 5).map(p => (
                        <div key={p.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm text-white">Negocio #{p.businessId}</p>
                            <p className="text-[11px] text-white/40">{p.method ?? "—"} · {new Date(p.createdAt).toLocaleDateString("es-DO")}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-black text-blue-300">{fmt(p.amount)}</p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.status === "paid" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                              {p.status === "paid" ? "pagado" : "pendiente"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Divider */}
        <div className="border-t border-white/10 pt-2">
          <p className="text-xs font-bold text-white/30 uppercase tracking-widest text-center">ContadorBot — Pregúntale algo</p>
        </div>

        {/* Quick questions — show when no messages */}
        {messages.length === 0 && (
          <div className="space-y-2">
            {QUICK_QUESTIONS.map(q => (
              <button
                key={q}
                onClick={() => ask(q)}
                disabled={sending || !snapshot}
                className="w-full text-left text-sm bg-white/5 border border-white/10 rounded-xl px-4 py-3 hover:bg-white/8 hover:border-yellow-400/30 transition text-white/70 hover:text-white disabled:opacity-40"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Chat messages */}
        {messages.length > 0 && (
          <div className="space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-yellow-400/20 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                    <Calculator size={13} className="text-yellow-400" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#0057B7] text-white rounded-br-sm"
                      : "bg-white/8 border border-white/10 text-white/90 rounded-bl-sm"
                  }`}
                >
                  {msg.content.split("\n").map((line, j) => (
                    <span key={j}>{line}{j < msg.content.split("\n").length - 1 && <br />}</span>
                  ))}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="w-7 h-7 rounded-full bg-yellow-400/20 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                  <Calculator size={13} className="text-yellow-400" />
                </div>
                <div className="bg-white/8 border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                  <Loader2 size={14} className="text-yellow-400 animate-spin" />
                  <span className="text-sm text-white/50">Analizando...</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[600px] mx-auto px-4 pb-6 pt-3 bg-gradient-to-t from-[#040f26] via-[#040f26] to-transparent">
        <div className="bg-white/8 border border-white/15 rounded-2xl flex items-end gap-2 px-4 py-3 focus-within:border-yellow-400/50 transition">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }}
            placeholder={snapshot ? "Haz una pregunta contable..." : "Cargando datos..."}
            rows={1}
            disabled={sending || !snapshot}
            className="flex-1 bg-transparent text-white text-sm placeholder:text-white/30 resize-none outline-none min-h-[24px]"
          />
          <button
            onClick={() => ask()}
            disabled={!input.trim() || sending || !snapshot}
            className="w-9 h-9 rounded-xl bg-yellow-400 flex items-center justify-center flex-shrink-0 disabled:opacity-40 hover:bg-yellow-300 transition"
          >
            {sending ? <Loader2 size={16} className="text-black animate-spin" /> : <Send size={16} className="text-black" />}
          </button>
        </div>
        <p className="text-[10px] text-white/25 text-center mt-2">Enter para enviar · Shift+Enter nueva línea</p>
      </div>
    </div>
  );
}
