import { useState } from "react";
import { Link } from "wouter";
import { useAdminListBusinesses, getAdminListBusinessesQueryKey, useAdminToggleBusiness } from "@workspace/api-client-react";
import { useLang } from "@/lib/lang";
import LangToggle from "@/components/LangToggle";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Star, Plus, X, Pencil, UtensilsCrossed, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORY_OPTIONS = ["food", "supermarket", "liquor", "pharmacy", "other"];

interface BizForm {
  name: string;
  description: string;
  address: string;
  phone: string;
  category: string;
  imageUrl: string;
}

const DEFAULT_FORM: BizForm = {
  name: "", description: "", address: "", phone: "", category: "food", imageUrl: "",
};

export default function AdminBusinesses() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLang();

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<BizForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");

  const { data: businesses, isLoading } = useAdminListBusinesses({
    query: { queryKey: getAdminListBusinessesQueryKey() }
  });

  const toggleBusiness = useAdminToggleBusiness({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getAdminListBusinessesQueryKey() });
        toast({ title: t.success });
      },
      onError: () => toast({ title: t.error, variant: "destructive" }),
    }
  });

  const handleCreate = async () => {
    if (!form.name || !form.category || !form.address) {
      toast({ title: "Nombre, categoría y dirección son requeridos", variant: "destructive" });
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/businesses", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast({ title: "✅ Negocio creado" });
      setShowCreate(false);
      setForm(DEFAULT_FORM);
      queryClient.invalidateQueries({ queryKey: getAdminListBusinessesQueryKey() });
    } else {
      toast({ title: t.error, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    const res = await fetch(`/api/admin/businesses/${editingId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast({ title: "✅ Negocio actualizado" });
      setEditingId(null);
      setForm(DEFAULT_FORM);
      queryClient.invalidateQueries({ queryKey: getAdminListBusinessesQueryKey() });
    } else {
      toast({ title: t.error, variant: "destructive" });
    }
    setSaving(false);
  };

  const openEdit = (biz: any) => {
    setEditingId(biz.id);
    setForm({
      name: biz.name ?? "",
      description: biz.description ?? "",
      address: biz.address ?? "",
      phone: biz.phone ?? "",
      category: biz.category ?? "food",
      imageUrl: biz.imageUrl ?? "",
    });
    setShowCreate(true);
  };

  const filtered = (businesses ?? []).filter(biz => {
    const matchSearch = !search ||
      biz.name.toLowerCase().includes(search.toLowerCase()) ||
      (biz.address && biz.address.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = filterActive === "all" ||
      (filterActive === "active" && biz.isActive) ||
      (filterActive === "inactive" && !biz.isActive);
    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="bg-black border-b border-yellow-400/20 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/admin">
          <button className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <h1 className="text-xl font-black text-yellow-400">{t.businesses}</h1>
        <div className="ml-auto flex items-center gap-2">
          <LangToggle />
          <Button
            size="sm"
            onClick={() => { setShowCreate(true); setEditingId(null); setForm(DEFAULT_FORM); }}
            className="bg-yellow-400 text-black font-bold hover:bg-yellow-300 gap-1 h-8"
          >
            <Plus size={14} />
            Nuevo
          </Button>
        </div>
      </div>

      {showCreate && (
        <div className="mx-4 mt-4 bg-white/5 border border-yellow-400/30 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-yellow-400">
              {editingId ? "Editar negocio" : "Nuevo negocio"}
            </h2>
            <button onClick={() => { setShowCreate(false); setEditingId(null); setForm(DEFAULT_FORM); }}>
              <X size={18} className="text-gray-400 hover:text-white" />
            </button>
          </div>
          <div className="space-y-3">
            <Input
              placeholder="Nombre del negocio *"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400"
            />
            <Textarea
              placeholder="Descripción (opcional)"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400 resize-none"
              rows={2}
            />
            <Input
              placeholder="Dirección *"
              value={form.address}
              onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Teléfono"
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400"
              />
              <select
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="bg-[#1a1a1a] border border-white/10 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-yellow-400"
              >
                {CATEGORY_OPTIONS.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <Input
              placeholder="URL de imagen (opcional)"
              value={form.imageUrl}
              onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400"
            />
            <Button
              className="w-full bg-yellow-400 text-black font-black hover:bg-yellow-300"
              onClick={editingId ? handleEdit : handleCreate}
              disabled={saving}
            >
              {editingId ? "Guardar cambios" : "Crear negocio"}
            </Button>
          </div>
        </div>
      )}

      <div className="px-4 py-4 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Buscar negocios..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400"
          />
        </div>

        <div className="flex gap-2">
          {(["all", "active", "inactive"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterActive(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${filterActive === f ? "border-yellow-400 bg-yellow-400/20 text-yellow-400" : "border-white/10 bg-white/5 text-gray-400"}`}
            >
              {f === "all" ? "Todos" : f === "active" ? "Activos" : "Inactivos"}
              {f === "all" && businesses ? ` (${businesses.length})` : ""}
              {f === "active" && businesses ? ` (${businesses.filter(b => b.isActive).length})` : ""}
              {f === "inactive" && businesses ? ` (${businesses.filter(b => !b.isActive).length})` : ""}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 bg-white/5 rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((biz) => (
              <div key={biz.id} data-testid={`business-${biz.id}`} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  {biz.imageUrl ? (
                    <img src={biz.imageUrl} alt={biz.name} className="w-14 h-14 object-cover rounded-xl flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-yellow-400/10 flex items-center justify-center flex-shrink-0">
                      <UtensilsCrossed size={20} className="text-yellow-400/50" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-black text-white truncate">{biz.name}</p>
                      <Badge className={`border text-xs flex-shrink-0 ${biz.isActive ? "bg-green-400/20 text-green-400 border-green-400/40" : "bg-gray-500/20 text-gray-400 border-gray-500/40"}`}>
                        {biz.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{biz.address}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1 text-yellow-400">
                        <Star size={12} fill="currentColor" />
                        <span className="text-xs font-bold">{biz.rating?.toFixed(1) ?? "—"}</span>
                      </div>
                      <Badge className="text-xs bg-white/5 text-gray-400 border-white/10">{biz.category}</Badge>
                      <span className="text-xs text-gray-600">{biz.totalOrders ?? 0} pedidos</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <button
                    onClick={() => openEdit(biz)}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-300 hover:bg-white/10 transition"
                  >
                    <Pencil size={12} />
                    Editar
                  </button>
                  <Link href={`/admin/businesses/${biz.id}/menu`}>
                    <button className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-yellow-400/10 border border-yellow-400/30 text-xs font-bold text-yellow-400 hover:bg-yellow-400/20 transition">
                      <UtensilsCrossed size={12} />
                      Menú
                    </button>
                  </Link>
                  <Button
                    size="sm"
                    className={`font-bold text-xs h-auto py-2 ${biz.isActive ? "bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/30" : "bg-green-500/20 hover:bg-green-500/40 text-green-400 border border-green-500/30"}`}
                    onClick={() => toggleBusiness.mutate({ businessId: biz.id })}
                    disabled={toggleBusiness.isPending}
                    variant="ghost"
                  >
                    {biz.isActive ? "Desactivar" : "Activar"}
                  </Button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-16">
                <p className="text-3xl mb-2">🏪</p>
                <p className="text-gray-400 text-sm">No se encontraron negocios</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
