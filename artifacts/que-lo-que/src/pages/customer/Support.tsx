import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Send, MessageCircle, Loader2 } from "lucide-react";
import { getStoredUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Message {
  role: "user" | "bot";
  text: string;
  orderInfo?: { id: number; status: string; statusLabel: string } | null;
  escalate?: boolean;
  ts: Date;
}

const QUICK_REPLIES = [
  "¿Dónde está mi pedido?",
  "¿Cuánto cuesta el delivery?",
  "¿Cómo cancelo un pedido?",
  "¿Cómo uso mis puntos?",
  "¿Cuánto tiempo demora?",
];

export default function CustomerSupport() {
  const user = getStoredUser();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      text: `¡Hola${user?.name ? `, ${user.name.split(" ")[0]}` : ""}! 👋 Soy el asistente de YaPide. ¿En qué te puedo ayudar hoy?`,
      ts: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [showOrderInput, setShowOrderInput] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { role: "user", text: text.trim(), ts: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages
        .filter(m => m.role === "user" || m.role === "bot")
        .slice(-6)
        .map(m => ({ role: m.role === "bot" ? "assistant" : "user", content: m.text }));

      const res = await fetch("/api/agents/support/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, orderId: orderId || undefined, userId: user?.id, history }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        role: "bot",
        text: data.answer,
        orderInfo: data.orderInfo,
        escalate: data.escalate,
        ts: new Date(),
      }]);
    } catch {
      setMessages(prev => [...prev, { role: "bot", text: "Ocurrió un error. Intenta de nuevo.", ts: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => sendMessage(input);

  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      {/* Header */}
      <div className="bg-background border-b border-yellow-400/20 px-4 py-4 flex items-center gap-3 flex-shrink-0">
        <Link href="/customer">
          <button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10 transition">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-9 h-9 rounded-full bg-yellow-400/20 flex items-center justify-center flex-shrink-0">
            <span className="text-lg">🤖</span>
          </div>
          <div>
            <p className="font-black text-white text-sm leading-tight">Asistente YaPide</p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-[10px] text-white/60">En línea · respuesta inmediata</span>
            </div>
          </div>
        </div>
        <a
          href="https://wa.me/18099999999?text=Necesito%20ayuda%20con%20YaPide"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-bold hover:bg-green-500/30 transition"
        >
          <MessageCircle size={12} />
          WhatsApp
        </a>
      </div>

      {/* Order ID context input */}
      <div className="px-4 py-2 border-b border-white/5 flex-shrink-0">
        {showOrderInput ? (
          <div className="flex items-center gap-2">
            <Input
              placeholder="Número de pedido (ej: 42)"
              value={orderId}
              onChange={e => setOrderId(e.target.value.replace(/\D/g, ""))}
              className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400 h-8 text-xs flex-1"
            />
            <button onClick={() => setShowOrderInput(false)} className="text-xs text-white/60 hover:text-white transition px-2">Listo</button>
          </div>
        ) : (
          <button
            onClick={() => setShowOrderInput(true)}
            className="text-xs text-yellow-400/70 hover:text-yellow-400 transition flex items-center gap-1.5"
          >
            📦 {orderId ? `Pedido #${orderId} seleccionado` : "Agregar número de pedido para consultar estado"}
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ paddingBottom: "120px" }}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2`}>
            {msg.role === "bot" && (
              <div className="w-7 h-7 rounded-full bg-yellow-400/20 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-sm">🤖</span>
              </div>
            )}
            <div className={`max-w-[78%] space-y-2`}>
              <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-yellow-400 text-black font-bold rounded-br-md"
                  : "bg-white/8 border border-white/10 text-white rounded-bl-md"
              }`}>
                {msg.text}
              </div>

              {msg.orderInfo && (
                <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
                  <p className="text-xs font-bold text-[#FFD700]/70 uppercase tracking-wider mb-1">Pedido #{msg.orderInfo.id}</p>
                  <p className="text-sm font-black text-white">{msg.orderInfo.statusLabel}</p>
                  <Link href={`/customer/orders/${msg.orderInfo.id}`}>
                    <button className="mt-2 text-xs text-yellow-400 font-bold hover:underline">Ver tracking completo →</button>
                  </Link>
                </div>
              )}

              {msg.escalate && msg.role === "bot" && (
                <a
                  href="https://wa.me/18099999999?text=Necesito%20ayuda%20con%20YaPide"
                  target="_blank"
                  rel="noreferrer"
                >
                  <div className="flex items-center gap-2 bg-green-400/10 border border-green-400/25 rounded-xl px-3 py-2.5 hover:bg-green-400/15 transition">
                    <MessageCircle size={14} className="text-green-400" />
                    <div>
                      <p className="text-xs font-bold text-green-400">Hablar con un agente</p>
                      <p className="text-[10px] text-white/60">Abrir WhatsApp</p>
                    </div>
                  </div>
                </a>
              )}

              <p className="text-[10px] text-white/40 px-1">
                {msg.ts.toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start gap-2">
            <div className="w-7 h-7 rounded-full bg-yellow-400/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm">🤖</span>
            </div>
            <div className="bg-white/8 border border-white/10 rounded-2xl rounded-bl-md px-4 py-3">
              <Loader2 size={14} className="animate-spin text-white/60" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies + input */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-white/10 px-4 pt-3 pb-4 space-y-2 z-20" style={{ maxWidth: "430px", margin: "0 auto", left: "50%", transform: "translateX(-50%)", width: "100%" }}>
        {messages.length <= 2 && (
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {QUICK_REPLIES.map(qr => (
              <button
                key={qr}
                onClick={() => sendMessage(qr)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full bg-white/8 border border-white/10 text-xs text-gray-300 hover:border-yellow-400/40 hover:text-yellow-400 transition font-bold"
              >
                {qr}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            placeholder="Escribe tu pregunta..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !loading && handleSend()}
            disabled={loading}
            className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400 flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-yellow-400 text-black font-black hover:bg-yellow-300 h-10 w-10 p-0 flex-shrink-0"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </Button>
        </div>
      </div>
    </div>
  );
}
