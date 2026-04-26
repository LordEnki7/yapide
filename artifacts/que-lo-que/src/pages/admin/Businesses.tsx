import { useState } from "react";
import { Link } from "wouter";
import { useAdminListBusinesses, getAdminListBusinessesQueryKey, useAdminToggleBusiness } from "@workspace/api-client-react";
import { useAdminLang } from "@/lib/lang";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Star, Plus, X, Pencil, UtensilsCrossed, Search, Check, XCircle, Clock } from "lucide-react";
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

type FilterTab = "all" | "active" | "inactive" | "pending";

function ApprovalBadge({ status }: { status: string | null | undefined }) {
  if (status === "approved") return null;
  if (status === "rejected") return (
    <Badge className="text-xs bg-red-500/20 text-red-400 border-red-500/40 gap-1">
      <XCircle size={10} />
      Rechazado
    </Badge>
  );
  return (
    <Badge className="text-xs bg-orange-500/20 text-orange-400 border-orange-500/40 gap-1">
      <Clock size={10} />
      Pendiente
    </Badge>
  );
}

export default function AdminBusinesses() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useAdminLang();

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<BizForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [approvingId, setApprovingId] = useState<number | null>(null);

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

  const handleApprove = async (bizId: number, status: "approved" | "rejected") => {
    setApprovingId(bizId);
    try {
      const res = await fetch(`/api/admin/businesses/${bizId}/approve`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast({ title: status === "approved" ? "✅ Negocio aprobado" : "❌ Negocio rechazado" });
        queryClient.invalidateQueries({ queryKey: getAdminListBusinessesQueryKey() });
      } else {
        toast({ title: t.error, variant: "destructive" });
      }
    } catch {
      toast({ title: t.error, variant: "destructive" });
    } finally {
      setApprovingId(null);
    }
  };

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

  const pendingCount = (businesses ?? []).filter(b => !b.approvalStatus || b.approvalStatus === "pending").length;

  const filtered = (businesses ?? []).filter(biz => {
    const matchSearch = !search ||
      biz.name.toLowerCase().includes(search.toLowerCase()) ||
      (biz.address && biz.address.toLowerCase().includes(search.toLowerCase()));
    const isPending = !biz.approvalStatus || biz.approvalStatus === "pending";
    const matchTab =
      filterTab === "all" ||
      (filterTab === "active" && biz.isActive) ||
      (filterTab === "inactive" && !biz.isActive) ||
      (filterTab === "pending" && isPending);
    return matchSearch && matchTab;
  });

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "Todos", count: businesses?.length ?? 0 },
    { key: "pending", label: "Pendientes", count: pendingCount },
    { key: "active", label: "Activos", count: businesses?.filter(b => b.isActive).length ?? 0 },
    { key: "inactive", label: "Inactivos", count: businesses?.filter(b => !b.isActive).length ?? 0 },
  ];

  return (
    <div className="min-h-screen bg-background text-white pb-24">
      <div className="bg-background border-b border-yellow-400/20 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/admin">
          <button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10 transition">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <h1 className="text-xl font-black text-yellow-400">{t.businesses}</h1>
        {pendingCount > 0 && (
          <span className="bg-orange-500 text-white text-xs font-black px-2 py-0.5 rounded-full">
            {pendingCount}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
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
        <div className="mx-4 mt-4 bg-white/8 border border-yellow-400/30 rounded-2xl p-4">
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
              className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400"
            />
            <Textarea
              placeholder="Descripción (opcional)"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400 resize-none"
              rows={2}
            />
            <Input
              placeholder="Dirección *"
              value={form.address}
              onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
              className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Teléfono"
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400"
              />
              <select
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="bg-secondary border border-white/10 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-yellow-400"
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
              className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400"
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
            className="pl-9 bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterTab(tab.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                filterTab === tab.key
                  ? tab.key === "pending"
                    ? "border-orange-400 bg-orange-400/20 text-orange-400"
                    : "border-yellow-400 bg-yellow-400/20 text-yellow-400"
                  : "border-white/10 bg-white/8 text-gray-400"
              }`}
            >
              {tab.label}
              {businesses ? ` (${tab.count})` : ""}
              {tab.key === "pending" && tab.count > 0 && filterTab !== "pending" && (
                <span className="ml-1 w-1.5 h-1.5 bg-orange-400 rounded-full inline-block" />
              )}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 bg-white/8 rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((biz) => {
              const isPending = !biz.approvalStatus || biz.approvalStatus === "pending";
              return (
                <div
                  key={biz.id}
                  data-testid={`business-${biz.id}`}
                  className={`bg-white/8 border rounded-2xl p-4 ${isPending ? "border-orange-400/30" : "border-white/10"}`}
                >
                  <div className="flex items-start gap-3">
                    {biz.imageUrl ? (
                      <img src={biz.imageUrl} alt={biz.name} className="w-14 h-14 object-cover rounded-xl flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-yellow-400/10 flex items-center justify-center flex-shrink-0">
                        <UtensilsCrossed size={20} className="text-yellow-400/50" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-black text-white truncate">{biz.name}</p>
                        <ApprovalBadge status={biz.approvalStatus} />
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
                        <Badge className="text-xs bg-white/8 text-gray-400 border-white/10">{biz.category}</Badge>
                        <span className="text-xs text-gray-600">{biz.totalOrders ?? 0} pedidos</span>
                      </div>
                    </div>
                  </div>

                  {isPending && (
                    <div className="mt-3 flex gap-2">
                      <Button
                        className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/40 font-bold text-xs h-9 gap-1.5"
                        variant="ghost"
                        onClick={() => handleApprove(biz.id, "approved")}
                        disabled={approvingId === biz.id}
                      >
                        <Check size={13} />
                        Aprobar
                      </Button>
                      <Button
                        className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 font-bold text-xs h-9 gap-1.5"
                        variant="ghost"
                        onClick={() => handleApprove(biz.id, "rejected")}
                        disabled={approvingId === biz.id}
                      >
                        <XCircle size={13} />
                        Rechazar
                      </Button>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <button
                      onClick={() => openEdit(biz)}
                      className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/8 border border-white/10 text-xs font-bold text-gray-300 hover:bg-white/10 transition"
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
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-16">
                <p className="text-3xl mb-2">{filterTab === "pending" ? "⏳" : "🏪"}</p>
                <p className="text-gray-400 text-sm">
                  {filterTab === "pending" ? "No hay negocios pendientes" : "No se encontraron negocios"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
