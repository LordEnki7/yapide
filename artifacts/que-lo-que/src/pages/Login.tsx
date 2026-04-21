import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLoginUser } from "@workspace/api-client-react";
import { setStoredUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Eye, EyeOff, Smartphone, Mail } from "lucide-react";
import { useLang } from "@/lib/lang";
import LangToggle from "@/components/LangToggle";

const logo = "/logo.png";

export default function Login() {
  const [tab, setTab] = useState<"email" | "phone">("email");
  // Email tab
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // Phone tab
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useLang();

  const loginUser = useLoginUser({
    mutation: {
      onSuccess: (data) => {
        setStoredUser({
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
          isBanned: data.user.isBanned,
        });
        navigate(`/${data.user.role}`);
      },
      onError: () => {
        toast({ title: t.error, description: t.wrongCredentials, variant: "destructive" });
      },
    },
  });

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: t.missingData, description: t.fillCredentials, variant: "destructive" });
      return;
    }
    loginUser.mutate({ data: { email, password } });
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      toast({ title: "Número inválido", description: "Ingresa tu número de teléfono completo (10 dígitos)", variant: "destructive" });
      return;
    }
    if (!pin || !/^\d{4,6}$/.test(pin)) {
      toast({ title: "PIN inválido", description: "El PIN debe ser 4–6 dígitos", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/phone-login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: digits, pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al entrar");
      setStoredUser({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        isBanned: data.user.isBanned,
      });
      navigate(`/${data.user.role}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message ?? "Número o PIN incorrecto", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      <div className="px-4 pt-6 flex items-center justify-between">
        <Link href="/">
          <button className="flex items-center gap-2 text-gray-400 hover:text-white transition">
            <ArrowLeft size={18} />
            <span className="text-sm">{t.back}</span>
          </button>
        </Link>
        <LangToggle />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <img src={logo} alt="YaPide" className="w-36 mx-auto object-contain mb-2" />
            <h1 className="text-3xl font-black text-yellow-400 uppercase">{t.loginTitle}</h1>
            <p className="text-gray-400 mt-1">{t.tagline}</p>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-white/5 rounded-2xl p-1 mb-5 border border-white/10">
            <button
              onClick={() => setTab("email")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === "email"
                  ? "bg-yellow-400 text-black shadow"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Mail size={15} />
              Email
            </button>
            <button
              onClick={() => setTab("phone")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === "phone"
                  ? "bg-yellow-400 text-black shadow"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Smartphone size={15} />
              Teléfono + PIN
            </button>
          </div>

          {tab === "email" ? (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <Input
                type="email"
                placeholder={t.emailPlaceholder}
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400 h-12"
                data-testid="input-email"
                autoComplete="email"
              />
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={t.passwordPlaceholder}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400 h-12 pr-10"
                  data-testid="input-password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <Button
                type="submit"
                className="w-full bg-yellow-400 text-black font-black text-lg h-12 hover:bg-yellow-300 shadow-[0_0_20px_rgba(255,215,0,0.3)]"
                disabled={loginUser.isPending}
                data-testid="button-login"
              >
                {loginUser.isPending ? t.loggingIn : t.loginButton}
              </Button>
            </form>
          ) : (
            <form onSubmit={handlePhoneLogin} className="space-y-4">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">🇩🇴 +1</span>
                <Input
                  type="tel"
                  placeholder="809-000-0000"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400 h-12 pl-14"
                  autoComplete="tel"
                  inputMode="numeric"
                  maxLength={12}
                />
              </div>
              <Input
                type="password"
                placeholder="PIN (4–6 dígitos)"
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400 h-12 tracking-widest text-lg text-center"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
              />
              <Button
                type="submit"
                className="w-full bg-yellow-400 text-black font-black text-lg h-12 hover:bg-yellow-300 shadow-[0_0_20px_rgba(255,215,0,0.3)]"
                disabled={loading}
              >
                {loading ? "Entrando..." : "Entrar con PIN"}
              </Button>
            </form>
          )}

          {tab === "email" && (
            <div className="mt-6 bg-white/8 border border-white/10 rounded-xl p-4">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-2">{t.demoLabel}</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: t.customer, email: "customer@qlq.do" },
                  { label: t.driver, email: "driver@qlq.do" },
                  { label: t.business, email: "business@qlq.do" },
                  { label: "Admin", email: "admin@qlq.do" },
                ].map(demo => (
                  <button
                    key={demo.email}
                    onClick={() => { setEmail(demo.email); setPassword("password123"); }}
                    className="text-xs text-gray-300 bg-white/8 rounded-lg px-2 py-1.5 hover:bg-white/10 hover:text-yellow-400 transition text-left"
                  >
                    {demo.label}: {demo.email.split("@")[0]}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">{t.demoPassword}</p>
            </div>
          )}

          <p className="text-center text-sm text-gray-400 mt-6">
            {t.noAccount}{" "}
            <Link href="/register">
              <span className="text-yellow-400 font-bold hover:underline">{t.register}</span>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
