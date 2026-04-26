import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { Link } from "wouter";
import { ArrowLeft, Plus, Pencil, Trash2, Shield, ShieldCheck, Crown, Eye, EyeOff, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ALL_PERMISSIONS, PERMISSION_LABELS, type Permission, type AdminRole } from "@/lib/adminPermissions";

interface StaffMember {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  adminRole: AdminRole;
  adminPermissions: Permission[];
  createdAt: string;
}

interface MyInfo {
  adminRole: AdminRole;
}

const ROLE_CONFIG: Record<AdminRole, { label: string; color: string; icon: React.ReactNode; desc: string }> = {
  owner: { label: "Owner", color: "bg-yellow-400/20 text-yellow-400 border-yellow-400/40", icon: <Crown size={12} />, desc: "Acceso total. Solo puede existir uno." },
  master: { label: "Master", color: "bg-purple-400/20 text-purple-400 border-purple-400/40", icon: <ShieldCheck size={12} />, desc: "Acceso total igual que el dueño. Tu socio." },
  staff: { label: "Staff", color: "bg-blue-400/20 text-blue-400 border-blue-400/40", icon: <Shield size={12} />, desc: "Acceso limitado a los permisos asignados." },
};

export default function AdminStaff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [myInfo, setMyInfo] = useState<MyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
  const { toast } = useToast();

  // Form state
  const [fName, setFName] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fPassword, setFPassword] = useState("");
  const [fShowPw, setFShowPw] = useState(false);
  const [fRole, setFRole] = useState<"master" | "staff">("staff");
  const [fPerms, setFPerms] = useState<Permission[]>(["dashboard"]);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const [staffRes, meRes] = await Promise.all([
        fetch("/api/admin/staff", { credentials: "include" }),
        fetch("/api/admin/staff/me", { credentials: "include" }),
      ]);
      if (staffRes.ok) setStaff(await staffRes.json());
      if (meRes.ok) setMyInfo(await meRes.json());
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStaff(); }, []);

  const openCreate = () => {
    setEditTarget(null);
    setFName(""); setFEmail(""); setFPassword("");
    setFRole("staff"); setFPerms(["dashboard"]);
    setShowForm(true);
  };

  const openEdit = (member: StaffMember) => {
    setEditTarget(member);
    setFName(member.name);
    setFEmail(member.email);
    setFPassword("");
    setFRole(member.adminRole === "owner" ? "master" : member.adminRole as "master" | "staff");
    setFPerms(member.adminPermissions ?? ["dashboard"]);
    setShowForm(true);
  };

  const togglePerm = (p: Permission) => {
    setFPerms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const handleSave = async () => {
    if (!fName.trim() || fName.trim().length < 2) { toast({ title: "Nombre requerido", variant: "destructive" }); return; }
    if (!editTarget && (!fEmail.trim())) { toast({ title: "Email requerido", variant: "destructive" }); return; }
    if (!editTarget && fPassword.length < 8) { toast({ title: "Contraseña mínimo 8 caracteres", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const body: any = { name: fName.trim(), adminRole: fRole, permissions: fPerms };
      if (fPassword.length >= 8) body.password = fPassword;
      if (!editTarget) { body.email = fEmail.trim(); body.password = fPassword; }

      const url = editTarget ? `/api/admin/staff/${editTarget.id}` : "/api/admin/staff";
      const method = editTarget ? "PATCH" : "POST";
      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      toast({ title: editTarget ? "Actualizado" : "Creado", description: `${data.name} fue ${editTarget ? "actualizado" : "agregado"} exitosamente` });
      setShowForm(false);
      fetchStaff();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await apiFetch(`/api/admin/staff/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      toast({ title: "Eliminado", description: "Cuenta de staff removida" });
      setDeleteId(null);
      fetchStaff();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const canManage = myInfo?.adminRole === "owner" || myInfo?.adminRole === "master";

  return (
    <div className="min-h-screen bg-background text-white">
      <div className="bg-background border-b border-yellow-400/20 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/admin">
          <button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10 transition">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-yellow-400" />
          <h1 className="text-xl font-black text-yellow-400">Gestión de Staff</h1>
        </div>
        {canManage && (
          <Button
            onClick={openCreate}
            className="ml-auto bg-yellow-400 text-black font-black h-9 px-3 text-sm hover:bg-yellow-300"
          >
            <Plus size={15} className="mr-1" /> Agregar
          </Button>
        )}
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* Role legend */}
        <div className="space-y-2">
          {(Object.entries(ROLE_CONFIG) as [AdminRole, typeof ROLE_CONFIG[AdminRole]][])
            .filter(([r]) => r !== "owner")
            .map(([role, cfg]) => (
              <div key={role} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
                <Badge className={`border ${cfg.color} flex items-center gap-1`}>
                  {cfg.icon} {cfg.label}
                </Badge>
                <p className="text-xs text-gray-400">{cfg.desc}</p>
              </div>
            ))}
        </div>

        {/* Staff list */}
        {loading ? (
          <div className="text-center py-10 text-gray-400 text-sm">Cargando...</div>
        ) : staff.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-white font-bold mb-1">No hay staff todavía</p>
            <p className="text-gray-400 text-sm">Agrega a tus colaboradores y asígnales permisos</p>
          </div>
        ) : (
          <div className="space-y-3">
            {staff.map(member => {
              const cfg = ROLE_CONFIG[member.adminRole] ?? ROLE_CONFIG.staff;
              return (
                <div key={member.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-white">{member.name}</p>
                        <Badge className={`border text-[10px] flex items-center gap-1 ${cfg.color}`}>
                          {cfg.icon} {cfg.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400">{member.email}</p>
                      {member.phone && <p className="text-xs text-gray-500">📱 {member.phone}</p>}
                    </div>
                    {canManage && member.adminRole !== "owner" && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => openEdit(member)}
                          className="w-8 h-8 rounded-xl bg-white/8 flex items-center justify-center hover:bg-white/12 transition"
                        >
                          <Pencil size={13} className="text-gray-400" />
                        </button>
                        {deleteId === member.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(member.id)}
                              className="w-8 h-8 rounded-xl bg-red-500/20 flex items-center justify-center hover:bg-red-500/30 transition"
                            >
                              <Check size={13} className="text-red-400" />
                            </button>
                            <button
                              onClick={() => setDeleteId(null)}
                              className="w-8 h-8 rounded-xl bg-white/8 flex items-center justify-center hover:bg-white/12 transition"
                            >
                              <X size={13} className="text-gray-400" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteId(member.id)}
                            className="w-8 h-8 rounded-xl bg-white/8 flex items-center justify-center hover:bg-red-500/20 transition"
                          >
                            <Trash2 size={13} className="text-gray-400" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Permissions */}
                  {member.adminRole === "staff" && (
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_PERMISSIONS.map(p => {
                        const has = member.adminPermissions?.includes(p);
                        const info = PERMISSION_LABELS[p];
                        return (
                          <span
                            key={p}
                            className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                              has
                                ? "bg-green-400/15 text-green-400 border-green-400/30"
                                : "bg-white/5 text-gray-600 border-white/10"
                            }`}
                          >
                            {info.icon} {info.label}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {member.adminRole === "master" && (
                    <p className="text-xs text-purple-400 font-bold">✓ Acceso completo a toda la plataforma</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Create / Edit Modal ─── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.85)" }}>
          <div className="w-full max-w-[430px] bg-[hsl(228,83%,9%)] rounded-t-3xl border-t-2 border-yellow-400/30 shadow-2xl p-5 pb-8 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-white">
                {editTarget ? `Editar: ${editTarget.name}` : "Nuevo miembro de staff"}
              </h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center">
                <X size={16} className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-3">
              <Input
                placeholder="Nombre completo"
                value={fName}
                onChange={e => setFName(e.target.value)}
                className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400 h-11"
              />
              {!editTarget && (
                <Input
                  type="email"
                  placeholder="Email"
                  value={fEmail}
                  onChange={e => setFEmail(e.target.value)}
                  className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400 h-11"
                />
              )}
              <div className="relative">
                <Input
                  type={fShowPw ? "text" : "password"}
                  placeholder={editTarget ? "Nueva contraseña (dejar en blanco para no cambiar)" : "Contraseña (mín. 8 caracteres)"}
                  value={fPassword}
                  onChange={e => setFPassword(e.target.value)}
                  className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400 h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setFShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {fShowPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Role picker — only owner can grant master */}
              {myInfo?.adminRole === "owner" && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Tipo de acceso</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["master", "staff"] as const).map(r => {
                      const cfg = ROLE_CONFIG[r];
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setFRole(r)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            fRole === r
                              ? "bg-yellow-400/15 border-yellow-400"
                              : "bg-white/5 border-white/10 hover:border-white/20"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <Badge className={`border text-[10px] ${cfg.color}`}>{cfg.icon} {cfg.label}</Badge>
                          </div>
                          <p className="text-[10px] text-gray-400 leading-tight">{cfg.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Permission checkboxes — only shown for staff role */}
              {fRole === "staff" && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Permisos</p>
                  <div className="space-y-2">
                    {ALL_PERMISSIONS.map(p => {
                      const info = PERMISSION_LABELS[p];
                      const checked = fPerms.includes(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => togglePerm(p)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                            checked
                              ? "bg-green-400/10 border-green-400/30"
                              : "bg-white/5 border-white/10 hover:border-white/20"
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                            checked ? "bg-green-400 border-green-400" : "border-white/20"
                          }`}>
                            {checked && <Check size={12} className="text-black" />}
                          </div>
                          <span className="text-base flex-shrink-0">{info.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold ${checked ? "text-white" : "text-gray-400"}`}>{info.label}</p>
                            <p className="text-[10px] text-gray-500 leading-tight">{info.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-yellow-400 text-black font-black h-12 hover:bg-yellow-300 shadow-[0_0_20px_rgba(255,215,0,0.3)] mt-2"
              >
                {saving ? "Guardando..." : editTarget ? "Guardar cambios" : "Crear cuenta"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
