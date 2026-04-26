import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, ToggleLeft, ToggleRight, Star, Zap } from "lucide-react";

interface PointsEvent {
  id: number; name: string; multiplier: number;
  startsAt: string; endsAt: string; isActive: boolean; createdAt: string;
}

const PRESETS = [
  { label: "2x puntos", multiplier: 2 },
  { label: "3x puntos", multiplier: 3 },
  { label: "5x puntos", multiplier: 5 },
];

export default function AdminPointsEvents() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", multiplier: 2, startsAt: "", endsAt: "" });

  const { data: events = [], isLoading } = useQuery<PointsEvent[]>({
    queryKey: ["admin-points-events"],
    queryFn: () => apiFetch("/api/points-events").then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: () => apiFetch("/api/points-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, multiplier: form.multiplier, startsAt: form.startsAt, endsAt: form.endsAt }),
    }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-points-events"] });
      setCreating(false);
      setForm({ name: "", multiplier: 2, startsAt: "", endsAt: "" });
      toast({ title: "Evento creado" });
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiFetch(`/api/points-events/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive }) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-points-events"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/points-events/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-points-events"] }); toast({ title: "Evento eliminado" }); },
  });

  const f = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const now = new Date();
  const isLive = (e: PointsEvent) => e.isActive && new Date(e.startsAt) <= now && new Date(e.endsAt) >= now;
  const isUpcoming = (e: PointsEvent) => e.isActive && new Date(e.startsAt) > now;
  const isExpired = (e: PointsEvent) => new Date(e.endsAt) < now;

  return (
    <div className="min-h-screen bg-[#040f26] text-white pb-10">
      <div className="bg-[#040f26] border-b border-white/10 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/admin"><button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10"><ArrowLeft size={18} /></button></Link>
        <h1 className="text-xl font-black text-yellow-400 flex items-center gap-2"><Star size={20} /> Multiplicador de Puntos</h1>
        <button onClick={() => setCreating(!creating)} className="ml-auto flex items-center gap-2 bg-yellow-400 text-black font-bold text-sm px-4 py-2 rounded-xl hover:bg-yellow-300 transition">
          <Plus size={16} /> Crear
        </button>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
        <div className="bg-[#0057B7]/20 border border-[#0057B7]/40 rounded-xl px-4 py-3 text-sm text-white/70">
          💡 Durante un evento activo, los clientes ganan puntos multiplicados. Ej: si el multiplicador es <strong className="text-yellow-400">2x</strong>, un pedido que normalmente daría 10 pts dará 20 pts.
        </div>

        {creating && (
          <div className="bg-white/8 border border-yellow-400/30 rounded-2xl p-4 space-y-3">
            <h2 className="font-bold text-yellow-400 text-sm uppercase tracking-widest">Nuevo Evento</h2>
            <Input placeholder="Nombre ej: Fin de semana de puntos dobles" value={form.name} onChange={e => f("name", e.target.value)} className="bg-white/8 border-white/10 text-white h-10" />
            <div>
              <p className="text-xs text-white/60 mb-2">Multiplicador</p>
              <div className="flex gap-2 flex-wrap">
                {PRESETS.map(p => (
                  <button key={p.multiplier} onClick={() => f("multiplier", p.multiplier)}
                    className={`flex items-center gap-1 text-sm px-3 py-2 rounded-xl font-bold border transition ${form.multiplier === p.multiplier ? "bg-yellow-400 text-black border-yellow-400" : "bg-white/5 text-white/70 border-white/15 hover:bg-white/10"}`}>
                    <Zap size={14} /> {p.label}
                  </button>
                ))}
                <div className="flex items-center gap-2 bg-white/5 border border-white/15 rounded-xl px-3 py-2">
                  <span className="text-xs text-white/60">Custom:</span>
                  <input type="number" min="1.1" max="10" step="0.5" value={form.multiplier}
                    onChange={e => f("multiplier", parseFloat(e.target.value) || 2)}
                    className="w-16 bg-transparent text-white text-sm font-bold outline-none" />
                  <span className="text-white/60 text-xs">x</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-white/60 mb-1">Inicio *</p>
                <Input type="datetime-local" value={form.startsAt} onChange={e => f("startsAt", e.target.value)} className="bg-white/8 border-white/10 text-white h-10 text-sm" />
              </div>
              <div>
                <p className="text-xs text-white/60 mb-1">Fin *</p>
                <Input type="datetime-local" value={form.endsAt} onChange={e => f("endsAt", e.target.value)} className="bg-white/8 border-white/10 text-white h-10 text-sm" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.name || !form.startsAt || !form.endsAt} className="bg-yellow-400 text-black font-bold hover:bg-yellow-300 flex-1">
                {createMutation.isPending ? "Creando..." : "Crear Evento"}
              </Button>
              <Button onClick={() => setCreating(false)} variant="ghost" className="text-white/60 hover:text-white">Cancelar</Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-white/40">Cargando...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            <Star size={40} className="mx-auto mb-3 opacity-30" />
            <p>No hay eventos de puntos.</p>
          </div>
        ) : (
          events.map(e => {
            const live = isLive(e);
            const upcoming = isUpcoming(e);
            const expired = isExpired(e);
            return (
              <div key={e.id} className={`bg-white/8 border rounded-2xl px-4 py-4 flex items-center gap-3 ${live ? "border-yellow-400/40" : expired ? "border-white/5 opacity-60" : "border-white/10"}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-lg ${live ? "bg-yellow-400/20 text-yellow-400" : "bg-white/10 text-white/50"}`}>
                  {e.multiplier}x
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-white text-sm">{e.name}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${live ? "bg-green-400/20 text-green-400 border-green-400/30" : upcoming ? "bg-blue-400/20 text-blue-400 border-blue-400/30" : expired ? "bg-red-400/20 text-red-400 border-red-400/30" : "bg-white/10 text-white/40 border-white/20"}`}>
                      {live ? "En vivo" : upcoming ? "Próximo" : expired ? "Expirado" : "Inactivo"}
                    </span>
                  </div>
                  <p className="text-xs text-white/50 mt-0.5">
                    {new Date(e.startsAt).toLocaleDateString("es-DO", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} → {new Date(e.endsAt).toLocaleDateString("es-DO", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => toggleMutation.mutate({ id: e.id, isActive: !e.isActive })}>
                    {e.isActive ? <ToggleRight size={22} className="text-green-400" /> : <ToggleLeft size={22} className="text-white/40" />}
                  </button>
                  <button onClick={() => { if (confirm(`¿Eliminar "${e.name}"?`)) deleteMutation.mutate(e.id); }} className="text-red-400 hover:text-red-300">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
