import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, ToggleLeft, ToggleRight, Truck } from "lucide-react";

interface DeliveryWindow {
  id: number; name: string; dayOfWeek: number | null; specificDate: string | null;
  startTime: string; endTime: string; isActive: boolean; createdAt: string;
}

const DAYS = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

export default function AdminDeliveryWindows() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "", dayOfWeek: "" as string, specificDate: "", startTime: "18:00", endTime: "21:00",
  });

  const { data: windows = [], isLoading } = useQuery<DeliveryWindow[]>({
    queryKey: ["admin-delivery-windows"],
    queryFn: () => apiFetch("/api/delivery-windows").then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: () => apiFetch("/api/delivery-windows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        dayOfWeek: form.dayOfWeek !== "" ? Number(form.dayOfWeek) : null,
        specificDate: form.specificDate || null,
        startTime: form.startTime,
        endTime: form.endTime,
      }),
    }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-delivery-windows"] });
      setCreating(false);
      setForm({ name: "", dayOfWeek: "", specificDate: "", startTime: "18:00", endTime: "21:00" });
      toast({ title: "Ventana creada" });
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiFetch(`/api/delivery-windows/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive }) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-delivery-windows"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/delivery-windows/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-delivery-windows"] }); toast({ title: "Ventana eliminada" }); },
  });

  const f = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="min-h-screen bg-[#040f26] text-white pb-10">
      <div className="bg-[#040f26] border-b border-white/10 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/admin"><button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10"><ArrowLeft size={18} /></button></Link>
        <h1 className="text-xl font-black text-yellow-400 flex items-center gap-2"><Truck size={20} /> Delivery Gratis</h1>
        <button onClick={() => setCreating(!creating)} className="ml-auto flex items-center gap-2 bg-yellow-400 text-black font-bold text-sm px-4 py-2 rounded-xl hover:bg-yellow-300 transition">
          <Plus size={16} /> Crear
        </button>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
        <div className="bg-[#0057B7]/20 border border-[#0057B7]/40 rounded-xl px-4 py-3 text-sm text-white/70">
          💡 Cuando una ventana esté activa, todos los pedidos creados en ese horario tendrán <strong className="text-white">delivery gratis</strong> automáticamente.
        </div>

        {creating && (
          <div className="bg-white/8 border border-yellow-400/30 rounded-2xl p-4 space-y-3">
            <h2 className="font-bold text-yellow-400 text-sm uppercase tracking-widest">Nueva Ventana</h2>
            <Input placeholder="Nombre ej: Viernes de delivery gratis" value={form.name} onChange={e => f("name", e.target.value)} className="bg-white/8 border-white/10 text-white h-10" />
            <div>
              <p className="text-xs text-white/60 mb-2">Día de la semana (deja vacío = todos los días)</p>
              <div className="flex flex-wrap gap-1">
                {["Todos",...DAYS].map((d, i) => (
                  <button key={d} onClick={() => f("dayOfWeek", i === 0 ? "" : String(i - 1))}
                    className={`text-xs px-3 py-1.5 rounded-full border font-bold transition ${
                      (i === 0 && form.dayOfWeek === "") || form.dayOfWeek === String(i - 1)
                        ? "bg-yellow-400 text-black border-yellow-400"
                        : "bg-white/5 text-white/60 border-white/15 hover:bg-white/10"
                    }`}>{d}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-white/60 mb-1">O fecha específica (opcional, sobrescribe día)</p>
              <Input type="date" value={form.specificDate} onChange={e => f("specificDate", e.target.value)} className="bg-white/8 border-white/10 text-white h-10" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-white/60 mb-1">Hora inicio</p>
                <Input type="time" value={form.startTime} onChange={e => f("startTime", e.target.value)} className="bg-white/8 border-white/10 text-white h-10" />
              </div>
              <div>
                <p className="text-xs text-white/60 mb-1">Hora fin</p>
                <Input type="time" value={form.endTime} onChange={e => f("endTime", e.target.value)} className="bg-white/8 border-white/10 text-white h-10" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.name} className="bg-yellow-400 text-black font-bold hover:bg-yellow-300 flex-1">
                {createMutation.isPending ? "Creando..." : "Crear Ventana"}
              </Button>
              <Button onClick={() => setCreating(false)} variant="ghost" className="text-white/60 hover:text-white">Cancelar</Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-white/40">Cargando...</div>
        ) : windows.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            <Truck size={40} className="mx-auto mb-3 opacity-30" />
            <p>No hay ventanas de delivery gratis.</p>
          </div>
        ) : (
          windows.map(w => (
            <div key={w.id} className={`bg-white/8 border rounded-2xl px-4 py-4 flex items-center gap-3 ${w.isActive ? "border-white/10" : "border-white/5 opacity-60"}`}>
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Truck size={18} className="text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm">{w.name}</p>
                <p className="text-xs text-white/50 mt-0.5">
                  {w.specificDate ? `📅 ${w.specificDate}` : w.dayOfWeek !== null ? `📆 ${DAYS[w.dayOfWeek]}` : "📆 Todos los días"}
                  {" · "}⏰ {w.startTime} – {w.endTime}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => toggleMutation.mutate({ id: w.id, isActive: !w.isActive })}>
                  {w.isActive ? <ToggleRight size={22} className="text-green-400" /> : <ToggleLeft size={22} className="text-white/40" />}
                </button>
                <button onClick={() => { if (confirm(`¿Eliminar "${w.name}"?`)) deleteMutation.mutate(w.id); }} className="text-red-400 hover:text-red-300">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
