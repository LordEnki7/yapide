import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, ToggleLeft, ToggleRight, Image, Megaphone } from "lucide-react";

interface Banner {
  id: number; title: string; subtitle: string | null; imageUrl: string | null;
  bgColor: string; ctaText: string | null; ctaLink: string | null;
  isActive: boolean; sortOrder: number;
  startsAt: string | null; endsAt: string | null; createdAt: string;
}

const DEFAULT_COLORS = ["#0057B7","#040f26","#FFD700","#16a34a","#dc2626","#9333ea"];

export default function AdminBanners() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "", subtitle: "", imageUrl: "", bgColor: "#0057B7",
    ctaText: "", ctaLink: "", sortOrder: 0, startsAt: "", endsAt: "",
  });

  const { data: banners = [], isLoading } = useQuery<Banner[]>({
    queryKey: ["admin-banners"],
    queryFn: () => apiFetch("/api/banners").then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: () => apiFetch("/api/banners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        subtitle: form.subtitle || null,
        imageUrl: form.imageUrl || null,
        ctaText: form.ctaText || null,
        ctaLink: form.ctaLink || null,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
      }),
    }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-banners"] });
      setCreating(false);
      setForm({ title: "", subtitle: "", imageUrl: "", bgColor: "#0057B7", ctaText: "", ctaLink: "", sortOrder: 0, startsAt: "", endsAt: "" });
      toast({ title: "Banner creado" });
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiFetch(`/api/banners/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive }) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-banners"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/banners/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-banners"] }); toast({ title: "Banner eliminado" }); },
  });

  const f = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="min-h-screen bg-[#040f26] text-white pb-10">
      <div className="bg-[#040f26] border-b border-white/10 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/admin"><button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10"><ArrowLeft size={18} /></button></Link>
        <h1 className="text-xl font-black text-yellow-400 flex items-center gap-2"><Megaphone size={20} /> Banners Promocionales</h1>
        <button onClick={() => setCreating(!creating)} className="ml-auto flex items-center gap-2 bg-yellow-400 text-black font-bold text-sm px-4 py-2 rounded-xl hover:bg-yellow-300 transition">
          <Plus size={16} /> Crear
        </button>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
        {/* Create form */}
        {creating && (
          <div className="bg-white/8 border border-yellow-400/30 rounded-2xl p-4 space-y-3">
            <h2 className="font-bold text-yellow-400 text-sm uppercase tracking-widest">Nuevo Banner</h2>
            <Input placeholder="Título *" value={form.title} onChange={e => f("title", e.target.value)} className="bg-white/8 border-white/10 text-white h-10" />
            <Input placeholder="Subtítulo" value={form.subtitle} onChange={e => f("subtitle", e.target.value)} className="bg-white/8 border-white/10 text-white h-10" />
            <Input placeholder="URL de imagen (opcional)" value={form.imageUrl} onChange={e => f("imageUrl", e.target.value)} className="bg-white/8 border-white/10 text-white h-10" />
            <div>
              <p className="text-xs text-white/60 mb-2">Color de fondo</p>
              <div className="flex gap-2 flex-wrap">
                {DEFAULT_COLORS.map(c => (
                  <button key={c} onClick={() => f("bgColor", c)} className={`w-8 h-8 rounded-full border-2 transition ${form.bgColor === c ? "border-yellow-400 scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />
                ))}
                <input type="color" value={form.bgColor} onChange={e => f("bgColor", e.target.value)} className="w-8 h-8 rounded-full cursor-pointer border-0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Texto del botón" value={form.ctaText} onChange={e => f("ctaText", e.target.value)} className="bg-white/8 border-white/10 text-white h-10" />
              <Input placeholder="URL del botón" value={form.ctaLink} onChange={e => f("ctaLink", e.target.value)} className="bg-white/8 border-white/10 text-white h-10" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-white/60 mb-1">Inicio (opcional)</p>
                <Input type="datetime-local" value={form.startsAt} onChange={e => f("startsAt", e.target.value)} className="bg-white/8 border-white/10 text-white h-10 text-sm" />
              </div>
              <div>
                <p className="text-xs text-white/60 mb-1">Fin (opcional)</p>
                <Input type="datetime-local" value={form.endsAt} onChange={e => f("endsAt", e.target.value)} className="bg-white/8 border-white/10 text-white h-10 text-sm" />
              </div>
            </div>
            {/* Preview */}
            {form.title && (
              <div className="rounded-xl overflow-hidden h-24 relative flex items-center px-5" style={{ backgroundColor: form.bgColor }}>
                {form.imageUrl && <img src={form.imageUrl} alt="" className="absolute right-0 top-0 h-full w-24 object-cover opacity-40" />}
                <div className="relative z-10">
                  <p className="font-black text-white text-lg drop-shadow">{form.title}</p>
                  {form.subtitle && <p className="text-white/80 text-xs">{form.subtitle}</p>}
                  {form.ctaText && <span className="mt-1 inline-block text-xs bg-yellow-400 text-black font-bold px-2 py-0.5 rounded-full">{form.ctaText}</span>}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.title} className="bg-yellow-400 text-black font-bold hover:bg-yellow-300 flex-1">
                {createMutation.isPending ? "Creando..." : "Crear Banner"}
              </Button>
              <Button onClick={() => setCreating(false)} variant="ghost" className="text-white/60 hover:text-white">Cancelar</Button>
            </div>
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="text-center py-12 text-white/40">Cargando...</div>
        ) : banners.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            <Megaphone size={40} className="mx-auto mb-3 opacity-30" />
            <p>No hay banners. Crea uno para empezar.</p>
          </div>
        ) : (
          banners.map(b => {
            const expired = b.endsAt && new Date(b.endsAt) < new Date();
            return (
              <div key={b.id} className={`rounded-2xl overflow-hidden border ${b.isActive && !expired ? "border-white/10" : "border-white/5 opacity-60"}`}>
                <div className="h-20 relative flex items-center px-4" style={{ backgroundColor: b.bgColor }}>
                  {b.imageUrl && <img src={b.imageUrl} alt="" className="absolute right-0 top-0 h-full w-20 object-cover opacity-40" />}
                  <div className="relative z-10">
                    <p className="font-black text-white text-base drop-shadow">{b.title}</p>
                    {b.subtitle && <p className="text-white/80 text-xs">{b.subtitle}</p>}
                    {b.ctaText && <span className="text-xs bg-yellow-400 text-black font-bold px-2 py-0.5 rounded-full">{b.ctaText}</span>}
                  </div>
                </div>
                <div className="bg-white/5 px-4 py-3 flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${expired ? "bg-red-400/20 text-red-400 border-red-400/30" : b.isActive ? "bg-green-400/20 text-green-400 border-green-400/30" : "bg-white/10 text-white/50 border-white/20"}`}>
                    {expired ? "Expirado" : b.isActive ? "Activo" : "Inactivo"}
                  </span>
                  {b.endsAt && <span className="text-xs text-white/40">hasta {new Date(b.endsAt).toLocaleDateString("es-DO")}</span>}
                  <div className="ml-auto flex items-center gap-2">
                    <button onClick={() => toggleMutation.mutate({ id: b.id, isActive: !b.isActive })} title={b.isActive ? "Desactivar" : "Activar"}>
                      {b.isActive ? <ToggleRight size={22} className="text-green-400" /> : <ToggleLeft size={22} className="text-white/40" />}
                    </button>
                    <button onClick={() => { if (confirm(`¿Eliminar "${b.title}"?`)) deleteMutation.mutate(b.id); }} className="text-red-400 hover:text-red-300">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
