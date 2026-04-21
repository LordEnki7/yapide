import { useState } from "react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { getStoredUser, clearStoredUser, setStoredUser } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import LangToggle from "@/components/LangToggle";
import RoleSwitcher from "@/components/RoleSwitcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { User, Phone, Mail, LogOut, Edit2, Check, X, AlertTriangle } from "lucide-react";

export default function DriverProfile() {
  const { t } = useLang();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const storedUser = getStoredUser();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const { data: me, isLoading } = useGetMe({
    query: { queryKey: getGetMeQueryKey() }
  });

  const startEdit = () => {
    setName(me?.name ?? storedUser?.name ?? "");
    setPhone(me?.phone ?? "");
    setEditing(true);
  };

  const saveProfile = async () => {
    if (!name.trim() || name.trim().length < 2) {
      toast({ title: t.error, description: t.nameTooShort, variant: "destructive" });
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
      if (current) setStoredUser({ ...current, name: updated.name });
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      setEditing(false);
      toast({ title: t.success, description: t.profileUpdated });
    } catch {
      toast({ title: t.error, description: t.profileUpdateError, variant: "destructive" });
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
      toast({ title: t.deleteAccountError, variant: "destructive" });
      setDeletingAccount(false);
    }
  };

  const displayName = me?.name ?? storedUser?.name ?? "—";
  const displayEmail = me?.email ?? storedUser?.email ?? "—";
  const displayPhone = me?.phone ?? "—";

  return (
    <div className="min-h-screen bg-background text-white pb-24">
      <div className="bg-background border-b border-yellow-400/20 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-xl font-black text-yellow-400">{t.myProfile}</h1>
        <LangToggle />
      </div>

      <div className="px-4 py-6 space-y-4">

        {/* Avatar */}
        <div className="flex flex-col items-center gap-3 pb-2">
          <div className="w-20 h-20 rounded-full bg-yellow-400/20 border-2 border-yellow-400/40 flex items-center justify-center text-4xl">
            🛵
          </div>
          <p className="text-xl font-black text-white">{displayName}</p>
          <span className="text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-3 py-1 rounded-full font-bold uppercase tracking-widest">
            Driver
          </span>
        </div>

        {/* Info Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t.information}</h2>
            {!editing ? (
              <button onClick={startEdit} className="flex items-center gap-1 text-yellow-400 text-xs font-bold hover:text-yellow-300 transition">
                <Edit2 size={12} /> {t.edit}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-white transition">
                  <X size={16} />
                </button>
                <button onClick={saveProfile} disabled={saving} className="flex items-center gap-1 text-green-400 text-xs font-bold">
                  <Check size={14} /> {saving ? t.saving : t.save}
                </button>
              </div>
            )}
          </div>
          <div className="px-4 pb-4 space-y-3">
            {editing ? (
              <>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">{t.nameLabel}</label>
                  <Input value={name} onChange={e => setName(e.target.value)} className="bg-white/8 border-white/10 text-white focus:border-yellow-400 h-10" placeholder={t.namePlaceholder2} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">{t.phoneLabel}</label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} className="bg-white/8 border-white/10 text-white focus:border-yellow-400 h-10" placeholder="809-555-1234" type="tel" />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center flex-shrink-0">
                    <User size={14} className="text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t.nameLabel}</p>
                    <p className="text-sm font-bold">{isLoading ? "—" : displayName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center flex-shrink-0">
                    <Mail size={14} className="text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t.emailLabel}</p>
                    <p className="text-sm font-bold">{isLoading ? "—" : displayEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center flex-shrink-0">
                    <Phone size={14} className="text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t.phoneLabel}</p>
                    <p className="text-sm font-bold">{isLoading ? "—" : displayPhone}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Role Switcher */}
        <RoleSwitcher currentRole="driver" />

        {/* Logout */}
        <Button
          variant="outline"
          className="w-full border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300 font-bold gap-2 h-12"
          onClick={handleLogout}
        >
          <LogOut size={16} />
          {t.logout}
        </Button>

        {/* Delete account */}
        {!showDeleteAccount ? (
          <button
            onClick={() => setShowDeleteAccount(true)}
            className="w-full text-xs text-gray-600 hover:text-red-400 transition text-center py-2"
          >
            {t.deleteMyAccount}
          </button>
        ) : (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
              <p className="text-sm font-bold text-red-400">{t.deleteAccountConfirm}</p>
            </div>
            <p className="text-xs text-gray-400">{t.deleteAccountWarning}</p>
            <div className="flex gap-2">
              <Button
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold h-10 text-sm"
              >
                {deletingAccount ? t.deleting : t.yesDelete}
              </Button>
              <Button
                onClick={() => setShowDeleteAccount(false)}
                variant="outline"
                className="flex-1 border-white/20 text-gray-300 font-bold h-10 text-sm"
              >
                {t.cancel}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
