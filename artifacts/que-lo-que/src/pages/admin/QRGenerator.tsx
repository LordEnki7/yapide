import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, QrCode, Download, Copy, ExternalLink, Tag, Store, Gift, Smartphone } from "lucide-react";

interface Business { id: number; name: string; category: string; }
interface PromoCode { id: number; code: string; isActive: boolean; }

const QR_API = (data: string, size = 300) =>
  `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data)}&size=${size}x${size}&color=040f26&bgcolor=FFD700&margin=10&format=png`;

const PRESETS = [
  { key: "app", label: "Descargar la app", icon: Smartphone, desc: "Enlace de registro general" },
  { key: "promo", label: "Código promo", icon: Tag, desc: "Landing page con código activo" },
  { key: "business", label: "Un negocio", icon: Store, desc: "Directo a un negocio específico" },
  { key: "referral", label: "Enlace de referido", icon: Gift, desc: "Link con mi código de referido" },
  { key: "custom", label: "URL personalizada", icon: ExternalLink, desc: "Cualquier enlace" },
];

export default function AdminQRGenerator() {
  const { toast } = useToast();
  const [preset, setPreset] = useState("app");
  const [selectedBiz, setSelectedBiz] = useState<number | null>(null);
  const [selectedPromo, setSelectedPromo] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [qrSize, setQrSize] = useState(300);
  const [qrUrl, setQrUrl] = useState("");
  const [myReferralCode, setMyReferralCode] = useState("");
  const imgRef = useRef<HTMLImageElement>(null);

  const appBase = typeof window !== "undefined" ? window.location.origin : "https://yapide.app";

  const { data: businesses = [] } = useQuery<Business[]>({
    queryKey: ["businesses-list"],
    queryFn: () => apiFetch("/api/businesses").then(r => r.json()).then((d: any) => d.businesses ?? d),
  });

  const { data: promoCodes = [] } = useQuery<PromoCode[]>({
    queryKey: ["promo-codes"],
    queryFn: () => apiFetch("/api/promo-codes").then(r => r.json()),
  });

  useEffect(() => {
    fetch("/api/referrals/me", { credentials: "include" }).then(r => r.ok ? r.json() : null).then(d => { if (d?.code) setMyReferralCode(d.code); }).catch(() => {});
  }, []);

  const getTargetUrl = () => {
    switch (preset) {
      case "app": return `${appBase}/register`;
      case "promo": return selectedPromo ? `${appBase}/promo/${selectedPromo}` : "";
      case "business": return selectedBiz ? `${appBase}/customer/business/${selectedBiz}` : "";
      case "referral": return myReferralCode ? `${appBase}/register?ref=${myReferralCode}` : "";
      case "custom": return customUrl;
      default: return "";
    }
  };

  const targetUrl = getTargetUrl();

  useEffect(() => {
    if (targetUrl) setQrUrl(QR_API(targetUrl, qrSize));
  }, [targetUrl, qrSize]);

  const downloadQR = async () => {
    if (!qrUrl) return;
    try {
      const res = await fetch(qrUrl);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `yapide-qr-${preset}.png`;
      a.click();
      toast({ title: "QR descargado ✓" });
    } catch {
      toast({ title: "Error al descargar", variant: "destructive" });
    }
  };

  const copyUrl = () => {
    if (!targetUrl) return;
    navigator.clipboard.writeText(targetUrl);
    toast({ title: "URL copiada ✓" });
  };

  return (
    <div className="min-h-screen bg-[#040f26] text-white pb-10">
      <div className="bg-[#040f26] border-b border-white/10 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/admin"><button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10"><ArrowLeft size={18} /></button></Link>
        <h1 className="text-xl font-black text-yellow-400 flex items-center gap-2"><QrCode size={20} /> Generador de QR</h1>
      </div>

      <div className="px-4 py-4 max-w-2xl mx-auto space-y-5">
        <div className="bg-[#0057B7]/20 border border-[#0057B7]/40 rounded-xl px-4 py-3 text-sm text-white/70">
          📲 Genera códigos QR para poner en flyers, tarjetas, redes sociales o tiendas. Escanear el QR lleva al usuario directamente a YaPide.
        </div>

        {/* Preset selector */}
        <div>
          <p className="text-xs font-bold text-[#FFD700]/80 uppercase tracking-widest mb-2">¿Qué tipo de QR?</p>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map(p => {
              const Icon = p.icon;
              return (
                <button key={p.key} onClick={() => setPreset(p.key)}
                  className={`flex items-start gap-2 px-3 py-3 rounded-xl border text-left transition ${preset === p.key ? "bg-yellow-400/15 border-yellow-400/40" : "bg-white/5 border-white/10 hover:bg-white/8"}`}>
                  <Icon size={16} className={preset === p.key ? "text-yellow-400 mt-0.5 flex-shrink-0" : "text-white/50 mt-0.5 flex-shrink-0"} />
                  <div>
                    <p className={`font-bold text-xs ${preset === p.key ? "text-yellow-400" : "text-white"}`}>{p.label}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">{p.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Options per preset */}
        {preset === "promo" && (
          <div>
            <p className="text-xs font-bold text-[#FFD700]/80 uppercase tracking-widest mb-2">Selecciona un código</p>
            <div className="flex flex-wrap gap-2">
              {promoCodes.filter(p => p.isActive).map(p => (
                <button key={p.id} onClick={() => setSelectedPromo(p.code)}
                  className={`text-sm font-mono font-bold px-3 py-2 rounded-xl border transition ${selectedPromo === p.code ? "bg-yellow-400 text-black border-yellow-400" : "bg-white/5 text-white border-white/10 hover:bg-white/10"}`}>
                  {p.code}
                </button>
              ))}
              {promoCodes.filter(p => p.isActive).length === 0 && <p className="text-white/40 text-sm">No hay códigos activos</p>}
            </div>
          </div>
        )}

        {preset === "business" && (
          <div>
            <p className="text-xs font-bold text-[#FFD700]/80 uppercase tracking-widest mb-2">Selecciona un negocio</p>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {(businesses as Business[]).map(b => (
                <button key={b.id} onClick={() => setSelectedBiz(b.id)}
                  className={`text-xs font-bold px-3 py-2 rounded-xl border text-left transition ${selectedBiz === b.id ? "bg-yellow-400 text-black border-yellow-400" : "bg-white/5 text-white border-white/10 hover:bg-white/10"}`}>
                  {b.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {preset === "referral" && !myReferralCode && (
          <div className="text-yellow-400 text-sm">Iniciaste sesión con una cuenta sin código de referido</div>
        )}

        {preset === "custom" && (
          <Input placeholder="https://..." value={customUrl} onChange={e => setCustomUrl(e.target.value)}
            className="bg-white/8 border-white/10 text-white h-11" />
        )}

        {/* Size selector */}
        <div>
          <p className="text-xs font-bold text-[#FFD700]/80 uppercase tracking-widest mb-2">Tamaño</p>
          <div className="flex gap-2">
            {[200,300,500,1000].map(s => (
              <button key={s} onClick={() => setQrSize(s)}
                className={`text-xs px-3 py-2 rounded-xl border font-bold transition ${qrSize === s ? "bg-yellow-400 text-black border-yellow-400" : "bg-white/5 text-white/60 border-white/15 hover:bg-white/10"}`}>
                {s}px
              </button>
            ))}
          </div>
        </div>

        {/* QR preview */}
        {qrUrl && targetUrl ? (
          <div className="bg-white/8 border border-white/10 rounded-2xl p-5 flex flex-col items-center gap-4">
            <div className="bg-white rounded-2xl p-3 shadow-lg">
              <img ref={imgRef} src={qrUrl} alt="QR Code" className="w-48 h-48 object-contain rounded-xl" />
            </div>
            <div className="w-full space-y-2">
              <p className="text-xs text-white/50 text-center break-all px-2">{targetUrl}</p>
              <div className="flex gap-2">
                <Button onClick={downloadQR} className="flex-1 bg-yellow-400 text-black font-bold hover:bg-yellow-300">
                  <Download size={16} className="mr-2" /> Descargar PNG
                </Button>
                <Button onClick={copyUrl} variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  <Copy size={16} />
                </Button>
                <a href={targetUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                    <ExternalLink size={16} />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-10 flex flex-col items-center gap-3 text-white/30">
            <QrCode size={60} />
            <p className="text-sm">Selecciona las opciones para generar el QR</p>
          </div>
        )}

        {/* Tips */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
          <p className="text-xs font-bold text-[#FFD700]/80 uppercase tracking-widest">💡 Ideas para usar tus QR</p>
          <ul className="text-xs text-white/50 space-y-1.5">
            <li>• Imprimir en flyers/volantes y repartir en el área</li>
            <li>• Pegar en la vitrina del negocio</li>
            <li>• Compartir en WhatsApp, Instagram o Facebook</li>
            <li>• Incluir en tarjetas de presentación</li>
            <li>• Proyectar en pantallas durante eventos o ferias</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
