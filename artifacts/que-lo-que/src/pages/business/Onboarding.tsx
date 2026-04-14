import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Store, MapPin, Phone, FileText, ChevronRight } from "lucide-react";

const logo = "/logo.png";

const CATEGORIES = [
  { value: "fast_food", label: "🍔 Fast Food" },
  { value: "pizza", label: "🍕 Pizza" },
  { value: "seafood", label: "🦐 Mariscos" },
  { value: "chicken", label: "🍗 Pollo" },
  { value: "bakery", label: "🥐 Panadería" },
  { value: "desserts", label: "🍰 Postres" },
  { value: "drinks", label: "🧃 Bebidas" },
  { value: "dominican", label: "🇩🇴 Comida Criolla" },
  { value: "chinese", label: "🍜 Comida China" },
  { value: "other", label: "🍽️ Otro" },
];

export default function BusinessOnboarding() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    description: "",
    category: "fast_food",
    deliveryTime: "30",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.address || !form.phone) {
      toast({ title: "Datos requeridos", description: "Completa nombre, dirección y teléfono", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/businesses", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          address: form.address.trim(),
          phone: form.phone.trim(),
          description: form.description.trim() || null,
          category: form.category,
          deliveryTime: parseInt(form.deliveryTime) || 30,
          isOpen: false,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Error al crear negocio");
      }
      toast({ title: "✅ ¡Negocio creado!", description: "Tu negocio está listo. Actívalo para empezar a recibir pedidos." });
      navigate("/business");
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
          <img src={logo} alt="Que Lo Que" className="w-20 mx-auto object-contain mb-3" />
          <div className="w-12 h-12 rounded-full bg-yellow-400/20 flex items-center justify-center mx-auto mb-3">
            <Store size={24} className="text-yellow-400" />
          </div>
          <h1 className="text-2xl font-black text-yellow-400 uppercase">Configura tu negocio</h1>
          <p className="text-gray-400 text-sm mt-1">Solo tomará 2 minutos 🚀</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-widest mb-1.5 block">
              <Store size={10} className="inline mr-1" />Nombre del negocio *
            </label>
            <Input
              placeholder="Ej: El Sabroso del Malecón"
              value={form.name}
              onChange={set("name")}
              className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400 h-12"
              required
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-widest mb-1.5 block">
              <MapPin size={10} className="inline mr-1" />Dirección *
            </label>
            <Input
              placeholder="Ej: C/ Duarte #42, La Romana"
              value={form.address}
              onChange={set("address")}
              className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400 h-12"
              required
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-widest mb-1.5 block">
              <Phone size={10} className="inline mr-1" />WhatsApp / Teléfono *
            </label>
            <Input
              type="tel"
              placeholder="Ej: 8091234567"
              value={form.phone}
              onChange={set("phone")}
              className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400 h-12"
              required
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-widest mb-1.5 block">Categoría</label>
            <select
              value={form.category}
              onChange={set("category") as any}
              className="w-full bg-white/8 border border-white/10 rounded-xl px-3 py-3 text-white text-sm focus:border-yellow-400/50 outline-none"
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-widest mb-1.5 block">Tiempo estimado de prep. (min)</label>
            <Input
              type="number"
              min="10"
              max="120"
              placeholder="30"
              value={form.deliveryTime}
              onChange={set("deliveryTime")}
              className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400 h-12"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-widest mb-1.5 block">
              <FileText size={10} className="inline mr-1" />Descripción (opcional)
            </label>
            <Textarea
              placeholder="Ej: Los mejores mangú de la ciudad, receta de abuela..."
              value={form.description}
              onChange={set("description")}
              className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400 min-h-[80px] resize-none"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-yellow-400 text-black font-black text-lg h-14 hover:bg-yellow-300 shadow-[0_0_20px_rgba(255,215,0,0.3)] mt-2"
            disabled={loading}
          >
            {loading ? "Creando negocio…" : <><ChevronRight size={18} className="mr-1" /> Empezar a vender</>}
          </Button>
        </form>
      </div>
    </div>
  );
}
