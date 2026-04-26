import { useEffect, useState, useRef } from "react";
import { formatDOP } from "@/lib/auth";
import { MapPin, Banknote, CreditCard, Store, X, Volume2, VolumeX } from "lucide-react";

interface Job {
  id: number;
  totalAmount: number;
  deliveryFee: number;
  driverEarnings: number;
  tip: number;
  paymentMethod: string;
  businessName?: string | null;
  businessAddress?: string | null;
  deliveryAddress: string;
  notes?: string | null;
}

interface Props {
  job: Job;
  onAccept: (id: number) => void;
  onDecline: (id: number) => void;
  accepting?: boolean;
  declining?: boolean;
}

const COUNTDOWN = 30;

function playAlertBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [
      { freq: 880, t: 0, dur: 0.1 },
      { freq: 1100, t: 0.13, dur: 0.1 },
      { freq: 880, t: 0.26, dur: 0.1 },
      { freq: 1320, t: 0.39, dur: 0.22 },
    ];
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = n.freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + n.t);
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + n.t + 0.02);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + n.t + n.dur);
      osc.start(ctx.currentTime + n.t);
      osc.stop(ctx.currentTime + n.t + n.dur + 0.05);
    }
  } catch { /* audio not supported */ }
}

function speakJob(job: Job) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const earnings = new Intl.NumberFormat("es-DO", {
    style: "currency", currency: "DOP", maximumFractionDigits: 0
  }).format(job.driverEarnings + (job.tip ?? 0));
  const txt = `Nueva entrega. Recoger en ${job.businessName ?? "el negocio"}. Ganancia: ${earnings}. Tienes ${COUNTDOWN} segundos.`;
  const u = new SpeechSynthesisUtterance(txt);
  u.lang = "es-DO";
  u.rate = 1.05;
  u.volume = 1;
  const voices = window.speechSynthesis.getVoices();
  const es = voices.find(v => v.lang.startsWith("es")) ?? null;
  if (es) u.voice = es;
  window.speechSynthesis.speak(u);
}

export default function JobAlertModal({ job, onAccept, onDecline, accepting, declining }: Props) {
  const [seconds, setSeconds] = useState(COUNTDOWN);
  const [muted, setMuted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mutedRef = useRef(false);

  // Swipe state
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    setSeconds(COUNTDOWN);
    mutedRef.current = false;
    setMuted(false);
    setTriggered(false);
    setDragX(0);

    playAlertBeep();
    const speakTimer = setTimeout(() => {
      if (!mutedRef.current) speakJob(job);
    }, 700);

    timerRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          onDecline(job.id);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(speakTimer);
      clearInterval(timerRef.current!);
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, [job.id]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    mutedRef.current = next;
    if (next && "speechSynthesis" in window) window.speechSynthesis.cancel();
  };

  const getTrackWidth = () => trackRef.current?.offsetWidth ?? 300;

  const handleDragStart = (clientX: number) => {
    if (triggered || accepting || declining) return;
    startXRef.current = clientX;
    setDragging(true);
  };

  const handleDragMove = (clientX: number) => {
    if (!dragging || triggered) return;
    const tw = getTrackWidth();
    const delta = clientX - startXRef.current;
    const clamped = Math.max(-tw * 0.46, Math.min(tw * 0.46, delta));
    setDragX(clamped);
  };

  const handleDragEnd = () => {
    if (!dragging || triggered) return;
    setDragging(false);
    const tw = getTrackWidth();
    if (dragX > tw * 0.33) {
      setTriggered(true);
      clearInterval(timerRef.current!);
      onAccept(job.id);
    } else if (dragX < -tw * 0.33) {
      setTriggered(true);
      clearInterval(timerRef.current!);
      onDecline(job.id);
    } else {
      setDragX(0);
    }
  };

  const pct = (seconds / COUNTDOWN) * 100;
  const urgent = seconds <= 10;
  const tw = getTrackWidth();
  const swipePct = tw > 0 ? dragX / (tw * 0.46) : 0;
  const isAccepting = swipePct > 0.2;
  const isDeclining = swipePct < -0.2;

  const trackBg = isAccepting
    ? `rgba(74,222,128,${Math.min(0.35, Math.abs(swipePct) * 0.4)})`
    : isDeclining
    ? `rgba(248,113,113,${Math.min(0.35, Math.abs(swipePct) * 0.4)})`
    : "rgba(255,255,255,0.05)";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.85)" }}>
      <div className="w-full max-w-[430px] bg-[hsl(228,83%,9%)] rounded-t-3xl border-t-2 border-yellow-400/40 shadow-[0_-8px_40px_rgba(255,215,0,0.2)] p-5 pb-8 animate-in slide-in-from-bottom duration-300">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-yellow-400 uppercase tracking-widest font-bold">🛵 Nuevo pedido</p>
            <p className="text-3xl font-black text-white">
              {formatDOP(job.driverEarnings + (job.tip ?? 0))}
            </p>
            <p className="text-sm text-white/60">tu ganancia{job.tip > 0 ? ` (incl. RD$${job.tip} propina)` : ""}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleMute} className="w-10 h-10 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/12 transition">
              {muted ? <VolumeX size={18} className="text-white/60" /> : <Volume2 size={18} className="text-yellow-400" />}
            </button>
            {/* Countdown ring */}
            <div className="relative w-14 h-14">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="23" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
                <circle
                  cx="28" cy="28" r="23" fill="none"
                  stroke={urgent ? "#ef4444" : "#FFD700"}
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 23}`}
                  strokeDashoffset={`${2 * Math.PI * 23 * (1 - pct / 100)}`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-lg font-black ${urgent ? "text-red-400" : "text-yellow-400"}`}>{seconds}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment badge */}
        <div className="flex justify-start mb-3">
          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-bold ${
            job.paymentMethod === "cash"
              ? "bg-green-400/15 text-green-400 border-green-400/40"
              : "bg-blue-400/15 text-blue-400 border-blue-400/40"
          }`}>
            {job.paymentMethod === "cash" ? <Banknote size={14} /> : <CreditCard size={14} />}
            {job.paymentMethod === "cash" ? "Efectivo" : "Tarjeta"} · {formatDOP(job.totalAmount + job.deliveryFee)}
          </span>
        </div>

        {/* Addresses */}
        <div className="bg-white/5 rounded-2xl p-4 space-y-3 mb-5">
          <div className="flex items-start gap-2">
            <Store size={14} className="text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] text-yellow-400 font-bold uppercase tracking-widest mb-0.5">Recoger en</p>
              <p className="text-base font-bold text-white">{job.businessName}</p>
              {job.businessAddress && <p className="text-xs text-white/60 mt-0.5">{job.businessAddress}</p>}
            </div>
          </div>
          <div className="border-t border-white/8 pt-3 flex items-start gap-2">
            <MapPin size={14} className="text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] text-green-400 font-bold uppercase tracking-widest mb-0.5">Entregar en</p>
              <p className="text-base text-white">{job.deliveryAddress}</p>
            </div>
          </div>
          {job.notes && (
            <p className="text-xs text-white/70 bg-white/5 rounded-xl px-3 py-2 italic">"{job.notes}"</p>
          )}
        </div>

        {/* Swipe-to-accept track */}
        <div
          ref={trackRef}
          className="relative h-20 rounded-2xl overflow-hidden select-none touch-none"
          style={{
            background: trackBg,
            border: isAccepting ? "2px solid rgba(74,222,128,0.5)" : isDeclining ? "2px solid rgba(248,113,113,0.5)" : "2px solid rgba(255,255,255,0.12)",
            transition: dragging ? "none" : "border-color 0.2s, background 0.2s",
          }}
          onTouchStart={e => handleDragStart(e.touches[0].clientX)}
          onTouchMove={e => handleDragMove(e.touches[0].clientX)}
          onTouchEnd={handleDragEnd}
          onMouseDown={e => handleDragStart(e.clientX)}
          onMouseMove={e => dragging && handleDragMove(e.clientX)}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
        >
          {/* Left hint */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <X size={16} className="text-red-400/70" />
            <span className="text-xs font-bold text-red-400/70">Rechazar</span>
          </div>
          {/* Right hint */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <span className="text-xs font-bold text-green-400/70">Aceptar</span>
            <span className="text-green-400/70 text-base">✓</span>
          </div>

          {/* Draggable thumb */}
          <div
            className="absolute top-1/2 left-1/2 -translate-y-1/2 h-14 w-32 rounded-xl flex items-center justify-center gap-2 font-black text-sm shadow-lg"
            style={{
              transform: `translateX(calc(-50% + ${dragX}px)) translateY(-50%)`,
              transition: dragging ? "none" : "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)",
              background: isAccepting ? "#4ade80" : isDeclining ? "#f87171" : "#FFD700",
              color: isAccepting ? "#000" : isDeclining ? "#fff" : "#000",
            }}
          >
            {triggered || accepting ? (
              <span className="animate-pulse">...</span>
            ) : isAccepting ? (
              <>✅ Aceptar</>
            ) : isDeclining ? (
              <>✕ Rechazar</>
            ) : (
              <><span className="opacity-60">⟵</span> Desliza <span className="opacity-60">⟶</span></>
            )}
          </div>
        </div>
        <p className="text-center text-xs text-white/40 mt-2">Desliza a la derecha para aceptar · izquierda para rechazar</p>
      </div>
    </div>
  );
}
