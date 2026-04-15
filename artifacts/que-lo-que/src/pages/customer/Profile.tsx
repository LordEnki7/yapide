import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { getStoredUser, clearStoredUser } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import LangToggle from "@/components/LangToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import RoleSwitcher from "@/components/RoleSwitcher";
import { ArrowLeft, User, Phone, Mail, MapPin, LogOut, Edit2, Check, X, Trash2, Star, AlertTriangle } from "lucide-react";

interface SavedAddress {
  id: number;
  label: string;
  address: string;
  isDefault: boolean;
}

export default function CustomerProfile() {
  const { t } = useLang();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const storedUser = getStoredUser();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    fetch("/api/customer/addresses", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(setAddresses)
      .catch(() => {});
  }, []);

  const handleDeleteAddress = async (id: number) => {
    setDeletingId(id);
    try {
      await fetch(`/api/customer/addresses/${id}`, { method: "DELETE", credentials: "include" });
      setAddresses(prev => prev.filter(a => a.id !== id));
      toast({ title: "Dirección eliminada" });
    } catch {
      toast({ title: t.error, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (addr: SavedAddress) => {
    try {
      await fetch("/api/customer/addresses", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: addr.label, address: addr.address, isDefault: true }),
      });
      const updated = await fetch("/api/customer/addresses", { credentials: "include" }).then(r => r.json());
      setAddresses(updated);
      toast({ title: `"${addr.label}" marcada como predeterminada` });
    } catch {}
  };

  const { data: me, isLoading } = useGetMe({
    query: { queryKey: getGetMeQueryKey() }
  });

  const startEdit = () => {
    setName(me?.name ?? storedUser?.name ?? "");
    setPhone(me?.phone ?? "");
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveProfile = async () => {
    if (!name.trim() || name.trim().length < 2) {
      toast({ title: "Error", description: "El nombre debe tener al menos 2 caracteres", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() || undefined }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      const current = getStoredUser();
      if (current) {
        const { setStoredUser } = await import("@/lib/auth");
        setStoredUser({ ...current, name: updated.name });
      }
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      setEditing(false);
      toast({ title: "¡Listo!", description: "Perfil actualizado" });
    } catch {
      toast({ title: "Error", description: "No se pudo actualizar el perfil", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    clearStoredUser();
    window.location.href = "/";
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await fetch("/api/auth/me", { method: "DELETE", credentials: "include" });
      clearStoredUser();
      window.location.href = "/";
    } catch {
      toast({ title: "Error al eliminar cuenta", variant: "destructive" });
      setDeletingAccount(false);
    }
  };

  const displayName = me?.name ?? storedUser?.name ?? "—";
  const displayEmail = me?.email ?? storedUser?.email ?? "—";
  const displayPhone = me?.phone ?? "—";

  return (
    <div className="min-h-screen bg-background text-white pb-24">
      <div className="bg-background border-b border-yellow-400/20 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/customer">
          <button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10 transition">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <h1 className="text-xl font-black text-yellow-400">Mi Perfil</h1>
        <div className="ml-auto">
          <LangToggle />
        </div>
      </div>

      <div className="px-4 py-6 space-y-4">

        {/* Avatar + Name */}
        <div className="flex flex-col items-center gap-3 pb-4">
          <div className="w-20 h-20 rounded-full bg-yellow-400/20 border-2 border-yellow-400/40 flex items-center justify-center text-4xl">
            👤
          </div>
          {isLoading ? (
            <Skeleton className="h-6 w-32 bg-white/8" />
          ) : (
            <p className="text-xl font-black text-white">{displayName}</p>
          )}
          <span className="text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-3 py-1 rounded-full font-bold uppercase tracking-widest">
            {storedUser?.role ?? "cliente"}
          </span>
        </div>

        {/* Info Card */}
        <div className="bg-white/8 border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Información</h2>
            {!editing ? (
              <button onClick={startEdit} className="flex items-center gap-1 text-yellow-400 text-xs font-bold hover:text-yellow-300 transition">
                <Edit2 size={12} /> Editar
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={cancelEdit} className="text-gray-400 hover:text-white transition">
                  <X size={16} />
                </button>
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="flex items-center gap-1 text-green-400 text-xs font-bold hover:text-green-300 transition"
                >
                  <Check size={14} /> {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            )}
          </div>

          <div className="px-4 pb-4 space-y-3">
            {editing ? (
              <>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Nombre</label>
                  <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="bg-white/8 border-white/10 text-white focus:border-yellow-400 h-10"
                    placeholder="Tu nombre"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Teléfono</label>
                  <Input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="bg-white/8 border-white/10 text-white focus:border-yellow-400 h-10"
                    placeholder="Ej: 809-555-1234"
                    type="tel"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center flex-shrink-0">
                    <User size={14} className="text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Nombre</p>
                    <p className="text-sm font-bold text-white">{isLoading ? "—" : displayName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center flex-shrink-0">
                    <Mail size={14} className="text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Correo</p>
                    <p className="text-sm font-bold text-white">{isLoading ? "—" : displayEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center flex-shrink-0">
                    <Phone size={14} className="text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Teléfono</p>
                    <p className="text-sm font-bold text-white">{isLoading ? "—" : displayPhone}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Quick links */}
        <div className="bg-white/8 border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5">
          <Link href="/customer/orders">
            <div className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition cursor-pointer">
              <span className="text-sm font-bold text-white">📦 Mis pedidos</span>
              <span className="text-gray-500 text-xs">→</span>
            </div>
          </Link>
          <Link href="/customer/points">
            <div className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition cursor-pointer">
              <span className="text-sm font-bold text-white">⭐ Mis puntos</span>
              <span className="text-gray-500 text-xs">→</span>
            </div>
          </Link>
          <Link href="/customer/support">
            <div className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition cursor-pointer">
              <span className="text-sm font-bold text-white">🤖 Asistente / Soporte</span>
              <span className="text-gray-500 text-xs">→</span>
            </div>
          </Link>
        </div>

        {/* Saved Addresses */}
        {addresses.length > 0 && (
          <div className="bg-white/8 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-4 pt-4 pb-2 flex items-center gap-2">
              <MapPin size={14} className="text-yellow-400" />
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Mis direcciones</h2>
            </div>
            <div className="divide-y divide-white/5">
              {addresses.map((addr) => (
                <div key={addr.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white">{addr.label}</p>
                      {addr.isDefault && (
                        <span className="text-[10px] bg-yellow-400/15 text-yellow-400 border border-yellow-400/30 px-1.5 py-0.5 rounded-full font-bold">predeterminada</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{addr.address}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {!addr.isDefault && (
                      <button
                        onClick={() => handleSetDefault(addr)}
                        className="w-7 h-7 rounded-lg bg-yellow-400/10 flex items-center justify-center hover:bg-yellow-400/20 transition"
                        title="Marcar como predeterminada"
                      >
                        <Star size={12} className="text-yellow-400" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteAddress(addr.id)}
                      disabled={deletingId === addr.id}
                      className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 transition"
                    >
                      <Trash2 size={12} className="text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Role Switcher */}
        <RoleSwitcher currentRole="customer" />

        {/* Logout */}
        <Button
          variant="outline"
          className="w-full border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300 font-bold gap-2 h-12"
          onClick={handleLogout}
        >
          <LogOut size={16} />
          Cerrar sesión
        </Button>

        {/* Delete account */}
        {!showDeleteAccount ? (
          <button
            onClick={() => setShowDeleteAccount(true)}
            className="w-full text-xs text-gray-600 hover:text-red-400 transition text-center py-2"
          >
            Eliminar mi cuenta
          </button>
        ) : (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
              <p className="text-sm font-bold text-red-400">¿Eliminar cuenta permanentemente?</p>
            </div>
            <p className="text-xs text-gray-400">Esta acción no se puede deshacer. Se eliminarán todos tus datos.</p>
            <div className="flex gap-2">
              <Button
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold h-10 text-sm"
              >
                {deletingAccount ? "Eliminando..." : "Sí, eliminar"}
              </Button>
              <Button
                onClick={() => setShowDeleteAccount(false)}
                variant="outline"
                className="flex-1 border-white/20 text-gray-300 font-bold h-10 text-sm"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
