import { useState, useEffect, useRef } from "react";
import { Send, MessageCircle, X } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";
import { getStoredUser } from "@/lib/auth";

interface ChatMessage {
  id: number;
  senderId: number;
  senderRole: string;
  body: string;
  createdAt: string;
}

interface ChatPanelProps {
  orderId: number;
  partnerRole: "driver" | "customer";
  partnerName?: string | null;
}

export default function ChatPanel({ orderId, partnerRole, partnerName }: ChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const user = getStoredUser();

  async function loadMessages() {
    try {
      const r = await apiFetch(`/api/orders/${orderId}/messages`);
      if (!r.ok) return;
      const data: ChatMessage[] = await r.json();
      setMessages(prev => {
        const newMsgs = data.filter(m => !prev.find(p => p.id === m.id));
        if (newMsgs.length > 0 && !open) setUnread(u => u + newMsgs.length);
        return data;
      });
    } catch {
      // silent
    }
  }

  useEffect(() => {
    loadMessages();
    pollRef.current = setInterval(loadMessages, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [orderId]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    }
  }, [open, messages.length]);

  async function send() {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const r = await apiFetch(`/api/orders/${orderId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: input.trim() }),
      });
      if (r.ok) {
        setInput("");
        await loadMessages();
      }
    } finally {
      setSending(false);
    }
  }

  const myRole = user?.role ?? "customer";
  const partnerLabel = partnerRole === "driver" ? (partnerName ?? "Driver") : (partnerName ?? "Cliente");

  return (
    <>
      {/* Floating chat button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-24 right-4 z-50 w-13 h-13 w-14 h-14 bg-[#0057B7] text-white rounded-full shadow-lg flex items-center justify-center transition hover:bg-blue-500 active:scale-95"
        aria-label="Chat"
      >
        {open ? <X size={22} /> : (
          <span className="relative">
            <MessageCircle size={22} />
            {unread > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-4 z-50 w-80 max-w-[calc(100vw-32px)] bg-[#0a0f2c] border border-white/15 rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ height: 380 }}>
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-[#0057B7]/20">
            <div className="flex items-center gap-2">
              <MessageCircle size={16} className="text-blue-300" />
              <span className="text-sm font-black text-white">{partnerLabel}</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white">
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
            {messages.length === 0 && (
              <p className="text-center text-xs text-white/40 py-8">Inicia la conversación con {partnerLabel}</p>
            )}
            {messages.map(m => {
              const isMe = m.senderRole === myRole;
              return (
                <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${isMe ? "bg-[#0057B7] text-white rounded-br-sm" : "bg-white/12 text-white rounded-bl-sm"}`}>
                    <p>{m.body}</p>
                    <p className={`text-[10px] mt-0.5 ${isMe ? "text-blue-200/70" : "text-white/40"}`}>
                      {new Date(m.createdAt).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-2 border-t border-white/10 flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Escribe un mensaje…"
              className="flex-1 bg-white/10 text-white text-sm px-3 py-2 rounded-xl border border-white/15 outline-none focus:border-blue-400 placeholder-white/30"
            />
            <button
              onClick={send}
              disabled={sending || !input.trim()}
              className="w-9 h-9 flex-shrink-0 bg-[#0057B7] text-white rounded-xl flex items-center justify-center disabled:opacity-40 hover:bg-blue-500 transition"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
