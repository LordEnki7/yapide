import { useEffect, useState, useRef } from "react";
import { formatDOP } from "@/lib/auth";
import { MapPin, Banknote, CreditCard, Store, X, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

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

  useEffect(() => {
    setSeconds(COUNTDOWN);
    mutedRef.current = false;
    setMuted(false);

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

  const pct = (seconds / COUNTDOWN) * 100;
  const urgent = seconds <= 10;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.85)" }}>
      <div className="w-full max-w-[430px] bg-[hsl(228,83%,9%)] rounded-t-3xl border-t-2 border-yellow-400/40 shadow-[0_-8px_40px_rgba(255,215,0,0.2)] p-5 pb-8 animate-in slide-in-from-bottom duration-300">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-yellow-400 uppercase tracking-widest font-bold">🛵 Nuevo pedido</p>
            <p className="text-2xl font-black text-white">
              {formatDOP(job.driverEarnings + (job.tip ?? 0))}
              <span className="text-base text-gray-400 font-normal ml-1">tu ganancia</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              title={muted ? "Activar voz" : "Silenciar"}
              className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/12 transition"
            >
              {muted
                ? <VolumeX size={16} className="text-gray-500" />
                : <Volume2 size={16} className="text-yellow-400" />
              }
            </button>
            <button
              onClick={() => onDecline(job.id)}
              className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/12 transition"
            >
              <X size={16} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Countdown ring */}
        <div className="flex justify-center mb-4">
          <div className="relative w-20 h-20">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
              <circle
                cx="40" cy="40" r="34" fill="none"
                stroke={urgent ? "#ef4444" : "#FFD700"}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={`${2 * Math.PI * 34 * (1 - pct / 100)}`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-2xl font-black ${urgent ? "text-red-400" : "text-yellow-400"}`}>{seconds}</span>
            </div>
          </div>
        </div>

        {/* Payment badge */}
        <div className="flex justify-center mb-4">
          <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${
            job.paymentMethod === "cash"
              ? "bg-green-400/15 text-green-400 border-green-400/40"
              : "bg-blue-400/15 text-blue-400 border-blue-400/40"
          }`}>
            {job.paymentMethod === "cash" ? <Banknote size={12} /> : <CreditCard size={12} />}
            {job.paymentMethod === "cash" ? "Efectivo" : "Tarjeta"} · {formatDOP(job.totalAmount + job.deliveryFee)}
          </span>
        </div>

        {/* Addresses */}
        <div className="bg-white/5 rounded-2xl p-4 space-y-3 mb-5">
          <div>
            <p className="text-[10px] text-yellow-400 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
              <Store size={10} /> Recoger en
            </p>
            <p className="text-sm font-bold text-white">{job.businessName}</p>
            {job.businessAddress && <p className="text-xs text-gray-400 mt-0.5">{job.businessAddress}</p>}
          </div>
          <div className="border-t border-white/5 pt-3">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
              <MapPin size={10} /> Entregar en
            </p>
            <p className="text-sm text-gray-300">{job.deliveryAddress}</p>
          </div>
          {job.notes && (
            <p className="text-xs text-gray-400 bg-white/5 rounded-xl px-3 py-2 italic border-t border-white/5 pt-3">
              "{job.notes}"
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 border-white/20 text-gray-400 hover:border-red-400/50 hover:text-red-400 font-bold h-12"
            onClick={() => onDecline(job.id)}
            disabled={declining || accepting}
          >
            Rechazar
          </Button>
          <Button
            className="flex-[2] bg-yellow-400 text-black font-black h-12 text-base hover:bg-yellow-300 shadow-[0_0_30px_rgba(255,215,0,0.4)] active:scale-95 transition-transform"
            onClick={() => onAccept(job.id)}
            disabled={accepting || declining}
          >
            {accepting ? "Aceptando..." : "✅ Aceptar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
