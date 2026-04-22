import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Bike, Car, Truck, ChevronRight } from "lucide-react";

const logo = "/logo.png";

const VEHICLE_TYPES = [
  { value: "motorcycle", label: "🛵 Motor / Moto", icon: Bike },
  { value: "car", label: "🚗 Carro", icon: Car },
  { value: "bicycle", label: "🚲 Bicicleta", icon: Bike },
  { value: "truck", label: "🚐 Jeepeta / Camión", icon: Truck },
];

export default function DriverOnboarding() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [vehicleType, setVehicleType] = useState("motorcycle");
  const [vehiclePlate, setVehiclePlate] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/drivers/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleType,
          vehiclePlate: vehiclePlate.trim().toUpperCase() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err.error === "Already registered as driver") {
          navigate("/driver");
          return;
        }
        throw new Error(err.error ?? "Error al registrarse");
      }
      toast({ title: "✅ ¡Perfil de driver creado!", description: "Ya puedes empezar a recibir deliveries 🛵" });
      navigate("/driver");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      <div className="flex-1 overflow-y-auto px-6 py-8 max-w-md mx-auto w-full">
        <div className="text-center mb-8">
          <img src={logo} alt="YaPide" className="w-20 mx-auto object-contain mb-3" />
          <div className="w-12 h-12 rounded-full bg-yellow-400/20 flex items-center justify-center mx-auto mb-3">
            <Bike size={24} className="text-yellow-400" />
          </div>
          <h1 className="text-2xl font-black text-yellow-400 uppercase">Configura tu perfil</h1>
          <p className="text-white/70 text-sm mt-1">Cuéntanos cómo vas a hacer los deliveries 🛵</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <p className="text-xs text-[#FFD700]/70 uppercase tracking-widest mb-3">Tipo de vehículo</p>
            <div className="grid grid-cols-2 gap-3">
              {VEHICLE_TYPES.map(v => {
                const Icon = v.icon;
                return (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => setVehicleType(v.value)}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      vehicleType === v.value
                        ? "bg-yellow-400/15 border-yellow-400 text-yellow-400"
                        : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
                    }`}
                  >
                    <span className="text-2xl block mb-1">{v.label.split(" ")[0]}</span>
                    <span className="text-xs font-bold block">{v.label.split(" ").slice(1).join(" ")}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs text-[#FFD700]/70 uppercase tracking-widest mb-1.5 block">Placa del vehículo (opcional)</label>
            <Input
              placeholder="Ej: A123456"
              value={vehiclePlate}
              onChange={e => setVehiclePlate(e.target.value.toUpperCase())}
              className="bg-white/8 border-white/10 text-white placeholder:text-white/40 focus:border-yellow-400 h-12 font-mono tracking-widest"
              maxLength={10}
            />
          </div>

          <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-black text-yellow-400 uppercase tracking-wide">💰 ¿Cuánto ganas?</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-white/70">
                <span>Tarifa base por delivery</span>
                <span className="font-bold text-white">RD$75</span>
              </div>
              <div className="flex justify-between text-xs text-white/70">
                <span>Propinas (100% para ti)</span>
                <span className="font-bold text-green-400">+ propina</span>
              </div>
              <div className="flex justify-between text-xs text-white/70">
                <span>Bonus por 10 deliveries</span>
                <span className="font-bold text-yellow-400">RD$300</span>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-yellow-400 text-black font-black text-lg h-14 hover:bg-yellow-300 shadow-[0_0_20px_rgba(255,215,0,0.3)]"
            disabled={loading}
          >
            {loading ? "Creando perfil…" : <><ChevronRight size={18} className="mr-1" /> Empezar a ganar</>}
          </Button>
        </form>
      </div>
    </div>
  );
}
