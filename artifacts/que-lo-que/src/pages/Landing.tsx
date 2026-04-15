import { useState } from "react";
import { Button } from "@/components/ui/button";
import { setStoredUser } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import LangToggle from "@/components/LangToggle";

const logo = "/logo.png";
const API = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

export default function Landing() {
  const { t } = useLang();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const demoLogin = async (role: "customer" | "driver" | "business" | "admin") => {
    setLoading(role);
    setError(null);
    try {
      await fetch(`${API}/api/demo/seed`, { method: "POST", credentials: "include" });

      const res = await fetch(`${API}/api/demo/login?role=${role}`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Demo login failed");
      }

      const { user } = await res.json();
      setStoredUser(user);
      window.location.href = `/${role === "business" ? "business" : role === "driver" ? "driver" : role === "admin" ? "admin" : "customer"}`;
    } catch (err: any) {
      setError(err.message ?? "Error connecting to server");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-10">
        <div className="text-center space-y-4">
          <div className="flex justify-end">
            <LangToggle />
          </div>
          <img
            src={logo}
            alt="YaPide"
            className="w-56 mx-auto object-contain drop-shadow-[0_0_30px_rgba(255,215,0,0.3)]"
          />
          <p className="text-lg italic text-blue-200">{t.tagline}</p>
        </div>

        <div className="space-y-3">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest text-center">
            {t.enterAs}
          </h2>

          <Button
            size="lg"
            className="w-full text-lg font-bold bg-primary hover:bg-primary/90 text-black h-14"
            disabled={!!loading}
            onClick={() => demoLogin("customer")}
          >
            {loading === "customer" ? "⏳ Entrando..." : "🍔 " + t.customer}
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="w-full text-lg font-bold border-2 border-primary text-primary hover:bg-primary hover:text-black h-14"
            disabled={!!loading}
            onClick={() => demoLogin("driver")}
          >
            {loading === "driver" ? "⏳ Entrando..." : "🛵 " + t.driver}
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="w-full text-lg font-bold border-2 border-primary text-primary hover:bg-primary hover:text-black h-14"
            disabled={!!loading}
            onClick={() => demoLogin("business")}
          >
            {loading === "business" ? "⏳ Entrando..." : "🏪 " + t.business}
          </Button>

          <Button
            size="lg"
            variant="ghost"
            className="w-full text-sm font-medium text-gray-400 hover:text-white"
            disabled={!!loading}
            onClick={() => demoLogin("admin")}
          >
            {loading === "admin" ? "⏳ Entrando..." : t.adminLink}
          </Button>
        </div>

        {error && (
          <p className="text-center text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            ⚠️ {error}
          </p>
        )}

        <div className="text-center">
          <p className="text-xs text-gray-600 mb-2">
            {t.haveAccount ?? "¿Ya tienes cuenta?"}{" "}
            <a href="/login" className="text-primary font-bold hover:underline">
              {t.signIn ?? "Iniciar sesión"}
            </a>
          </p>
          <p className="text-xs text-gray-700">
            Demo: datos ficticios, sin registro requerido
          </p>
        </div>
      </div>
    </div>
  );
}
