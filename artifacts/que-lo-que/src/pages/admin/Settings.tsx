import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Save, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/apiFetch";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface PlatformSettings {
  base_delivery_fee: number;
  delivery_fee_per_km: number;
  driver_commission_share: number;
  platform_markup: number;
  cash_warning_threshold: number;
  cash_limit: number;
}

const SETTING_META: Record<keyof PlatformSettings, { label: string; desc: string; unit: string; min: number; max: number; step: number }> = {
  base_delivery_fee:       { label: "Tarifa base de envío",        desc: "Monto fijo cobrado por cada entrega",           unit: "RD$", min: 0,    max: 1000, step: 10 },
  delivery_fee_per_km:     { label: "Tarifa por km adicional",     desc: "Se cobra por cada kilómetro de distancia",      unit: "RD$", min: 0,    max: 200,  step: 5  },
  driver_commission_share: { label: "% del envío para el driver",  desc: "Fracción de la tarifa de envío que va al driver", unit: "%",  min: 0,    max: 1,    step: 0.05 },
  platform_markup:         { label: "Margen de la plataforma",     desc: "Porcentaje que se agrega al subtotal",           unit: "%",  min: 0,    max: 0.5,  step: 0.01 },
  cash_warning_threshold:  { label: "Alerta de efectivo (warning)", desc: "Balance en efectivo que dispara la alerta WhatsApp al driver", unit: "RD$", min: 0, max: 50000, step: 500 },
  cash_limit:              { label: "Límite de efectivo (bloqueo)", desc: "Balance en efectivo que bloquea al driver",      unit: "RD$", min: 0, max: 100000, step: 500 },
};

export default function AdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Partial<Record<keyof PlatformSettings, string>>>({});
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery<PlatformSettings>({
    queryKey: ["/api/admin/settings"],
    queryFn: async () => {
      const r = await apiFetch("/api/admin/settings");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  useEffect(() => {
    if (data) {
      const init: typeof values = {};
      (Object.keys(SETTING_META) as (keyof PlatformSettings)[]).forEach(k => {
        const v = data[k];
        const meta = SETTING_META[k];
        init[k] = meta.unit === "%" ? String((v * 100).toFixed(0)) : String(v);
      });
      setValues(init);
    }
  }, [data]);

  async function save(key: keyof PlatformSettings) {
    const raw = values[key];
    if (raw === undefined) return;
    const meta = SETTING_META[key];
    let numeric = parseFloat(raw);
    if (isNaN(numeric)) { toast({ title: "Valor inválido", variant: "destructive" }); return; }
    if (meta.unit === "%") numeric = numeric / 100;

    setSaving(true);
    try {
      const r = await apiFetch(`/api/admin/settings/${key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: String(numeric) }),
      });
      if (!r.ok) throw new Error();
      toast({ title: "✅ Guardado", description: `${meta.label} actualizado` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-white pb-24">
      <div className="bg-background border-b border-yellow-400/20 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/admin">
          <button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10 transition">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <h1 className="text-xl font-black text-yellow-400">Configuración de la plataforma</h1>
      </div>

      <div className="px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-20 bg-white/8 rounded-xl" />)}
          </div>
        ) : (
          (Object.keys(SETTING_META) as (keyof PlatformSettings)[]).map(key => {
            const meta = SETTING_META[key];
            return (
              <div key={key} className="bg-white/8 border border-white/10 rounded-2xl p-4">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="font-bold text-white text-sm">{meta.label}</p>
                    <p className="text-xs text-gray-400">{meta.desc}</p>
                  </div>
                  <span className="text-xs text-yellow-400/60 font-mono ml-2">{meta.unit}</span>
                </div>
                <div className="flex gap-2 mt-2">
                  <Input
                    type="number"
                    value={values[key] ?? ""}
                    onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))}
                    className="bg-white/8 border-white/20 text-white flex-1"
                    step={meta.unit === "%" ? 1 : meta.step}
                    min={meta.unit === "%" ? 0 : meta.min}
                    max={meta.unit === "%" ? 100 : meta.max}
                  />
                  <Button
                    size="sm"
                    className="bg-yellow-500/80 hover:bg-yellow-400 text-black font-bold gap-1.5"
                    onClick={() => save(key)}
                    disabled={saving}
                  >
                    <Save size={13} />
                    Guardar
                  </Button>
                </div>
              </div>
            );
          })
        )}

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-300">
          <RefreshCw size={12} className="inline mr-1.5" />
          Los cambios se aplican inmediatamente en nuevos pedidos. Los pedidos en proceso no se ven afectados.
        </div>
      </div>
    </div>
  );
}
