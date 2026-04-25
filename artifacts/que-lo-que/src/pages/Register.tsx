import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useRegisterUser } from "@workspace/api-client-react";
import { setStoredUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Eye, EyeOff, Mail, Smartphone, MessageCircle, CheckCircle, RefreshCw } from "lucide-react";
import { useLang } from "@/lib/lang";
import LangToggle from "@/components/LangToggle";

const logo = "/logo.png";

export default function Register() {
  const [tab, setTab] = useState<"email" | "phone">("email");

  // Email fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("customer");

  // Phone fields
  const [pName, setPName] = useState("");
  const [pPhone, setPPhone] = useState("");
  const [pPin, setPPin] = useState("");
  const [pPinConfirm, setPPinConfirm] = useState("");
  const [pRole, setPRole] = useState("customer");
  const [pLoading, setPLoading] = useState(false);

  // OTP verification state (after phone register)
  const [verifyStep, setVerifyStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpResending, setOtpResending] = useState(false);
  const [pendingNav, setPendingNav] = useState("");

  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useLang();

  // Pre-select role from ?role= query param (coming from Landing page)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get("role");
    if (r === "customer" || r === "driver" || r === "business") {
      setRole(r);
      setPRole(r);
    }
  }, []);

  const ROLES = [
    { value: "customer", emoji: "🍔", label: t.roleCustomerLabel, sub: t.roleCustomerSub },
    { value: "driver", emoji: "🛵", label: t.roleDriverLabel, sub: t.roleDriverSub },
    { value: "business", emoji: "🏪", label: t.roleBusinessLabel, sub: t.roleBusinessSub },
  ];

  const register = useRegisterUser({
    mutation: {
      onSuccess: (data) => {
        setStoredUser({
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
          isBanned: data.user.isBanned,
        });
        if (data.user.role === "business") navigate("/business/onboarding");
        else if (data.user.role === "driver") navigate("/driver/onboarding");
        else navigate(`/${data.user.role}`);
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.error ?? t.error;
        toast({ title: t.error, description: msg, variant: "destructive" });
      },
    },
  });

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast({ title: t.missingData, description: t.fillCredentials, variant: "destructive" });
      return;
    }
    register.mutate({ data: { name, email, password, role: role as any, phone: phone || undefined } });
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = pPhone.replace(/\D/g, "");
    if (pName.trim().length < 2) {
      toast({ title: "Nombre requerido", description: "Escribe tu nombre completo", variant: "destructive" });
      return;
    }
    if (digits.length < 10) {
      toast({ title: "Número inválido", description: "Ingresa un número válido (10 dígitos)", variant: "destructive" });
      return;
    }
    if (!/^\d{4,6}$/.test(pPin)) {
      toast({ title: "PIN inválido", description: "El PIN debe ser 4–6 dígitos", variant: "destructive" });
      return;
    }
    if (pPin !== pPinConfirm) {
      toast({ title: "PINs no coinciden", description: "Los dos PINs deben ser iguales", variant: "destructive" });
      return;
    }
    setPLoading(true);
    try {
      const res = await fetch("/api/auth/phone-register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: pName.trim(), phone: digits, pin: pPin, role: pRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al registrarse");
      setStoredUser({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        isBanned: data.user.isBanned,
      });
      setOtpCode(data.otpCode ?? "");
      const dest = data.user.role === "business"
        ? "/business/onboarding"
        : data.user.role === "driver"
        ? "/driver/onboarding"
        : `/${data.user.role}`;
      setPendingNav(dest);
      setVerifyStep(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message ?? t.error, variant: "destructive" });
    } finally {
      setPLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!enteredOtp || enteredOtp.length < 4) {
      toast({ title: "Código requerido", description: "Ingresa el código de 6 dígitos", variant: "destructive" });
      return;
    }
    setOtpVerifying(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: enteredOtp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Código incorrecto");
      navigate(pendingNav);
    } catch (err: any) {
      toast({ title: "Código incorrecto", description: err.message, variant: "destructive" });
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpResending(true);
    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setOtpCode(data.otpCode ?? "");
      toast({ title: "Código reenviado", description: "Se generó un nuevo código." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setOtpResending(false);
    }
  };

  if (verifyStep) {
    return (
      <div className="min-h-screen bg-background text-white flex flex-col">
        <div className="px-4 pt-6">
          <button
            onClick={() => navigate(pendingNav)}
            className="flex items-center gap-2 text-white/60 hover:text-white transition"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">Saltar por ahora</span>
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
                <Smartphone size={28} className="text-green-400" />
              </div>
              <h1 className="text-2xl font-black text-yellow-400 uppercase">Verificar teléfono</h1>
              <p className="text-white/60 text-sm mt-1">Confirma que el número es tuyo</p>
            </div>

            <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5 text-center mb-5">
              <p className="text-sm text-white/70 mb-2">Código enviado por WhatsApp</p>
              {import.meta.env.DEV && (
                <p className="text-xs text-yellow-400/70 font-mono mt-1">
                  🛠 Desarrollo: revisa la consola del servidor
                </p>
              )}
              <p className="text-xs text-white/40 mt-2">Ingresa el código que recibiste. Válido 10 minutos.</p>
            </div>

            <div className="space-y-4">
              <Input
                type="text"
                placeholder="Ingresa el código de 6 dígitos"
                value={enteredOtp}
                onChange={e => setEnteredOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="bg-white/8 border-white/10 text-white placeholder:text-white/40 focus:border-yellow-400 h-14 tracking-[0.3em] text-2xl font-black text-center"
                inputMode="numeric"
                maxLength={6}
                autoFocus
              />

              <Button
                onClick={handleVerifyOtp}
                disabled={otpVerifying || enteredOtp.length < 4}
                className="w-full bg-yellow-400 text-black font-black text-lg h-12 hover:bg-yellow-300 shadow-[0_0_20px_rgba(255,215,0,0.3)]"
              >
                {otpVerifying ? "Verificando..." : (
                  <span className="flex items-center gap-2">
                    <CheckCircle size={18} />
                    Verificar número
                  </span>
                )}
              </Button>

              <button
                onClick={handleResendOtp}
                disabled={otpResending}
                className="w-full flex items-center justify-center gap-2 text-sm text-white/60 hover:text-yellow-400 transition py-2"
              >
                <RefreshCw size={14} className={otpResending ? "animate-spin" : ""} />
                {otpResending ? "Reenviando..." : "Reenviar código"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      <div className="px-4 pt-6 flex items-center justify-between">
        <Link href="/login">
          <button className="flex items-center gap-2 text-white/60 hover:text-white transition">
            <ArrowLeft size={18} />
            <span className="text-sm">{t.back}</span>
          </button>
        </Link>
        <LangToggle />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <img src={logo} alt="YaPide" className="w-28 mx-auto object-contain mb-2" />
            <h1 className="text-2xl font-black text-yellow-400 uppercase">{t.createAccountTitle}</h1>
            <p className="text-white/70 text-sm mt-1">{t.joinTagline}</p>
          </div>

          <div className="flex bg-white/5 rounded-2xl p-1 mb-5 border border-white/10">
            <button
              onClick={() => setTab("email")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === "email" ? "bg-yellow-400 text-black shadow" : "text-white/60 hover:text-white"
              }`}
            >
              <Mail size={15} /> Email
            </button>
            <button
              onClick={() => setTab("phone")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === "phone" ? "bg-yellow-400 text-black shadow" : "text-white/60 hover:text-white"
              }`}
            >
              <Smartphone size={15} /> Teléfono + PIN
            </button>
          </div>

          {tab === "email" ? (
            <form onSubmit={handleEmailSubmit} className="space-y-3">
              <Input
                placeholder={t.fullNamePlaceholder}
                value={name}
                onChange={e => setName(e.target.value)}
                className="bg-white/8 border-white/10 text-white placeholder:text-white/40 focus:border-yellow-400 h-12"
                autoComplete="name"
              />
              <Input
                type="email"
                placeholder={t.emailPlaceholder}
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="bg-white/8 border-white/10 text-white placeholder:text-white/40 focus:border-yellow-400 h-12"
                autoComplete="email"
              />
              <Input
                type="tel"
                placeholder={t.phonePlaceholder}
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="bg-white/8 border-white/10 text-white placeholder:text-white/40 focus:border-yellow-400 h-12"
                autoComplete="tel"
              />
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={t.passwordPlaceholder}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="bg-white/8 border-white/10 text-white placeholder:text-white/40 focus:border-yellow-400 h-12 pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="pt-1">
                <p className="text-xs text-[#FFD700]/80 uppercase tracking-widest mb-2">{t.enterAs}</p>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map(r => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        role === r.value
                          ? "bg-yellow-400/15 border-yellow-400 text-yellow-400"
                          : "bg-white/5 border-white/10 text-white/70 hover:border-white/20"
                      }`}
                    >
                      <div className="text-base leading-none mb-1">{r.emoji}</div>
                      <div className="text-xs font-bold">{r.label}</div>
                      <div className="text-[10px] text-white/50 mt-0.5 leading-tight">{r.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-yellow-400 text-black font-black text-lg h-12 hover:bg-yellow-300 shadow-[0_0_20px_rgba(255,215,0,0.3)] mt-2"
                disabled={register.isPending}
              >
                {register.isPending ? t.creating : t.createAccount}
              </Button>
            </form>
          ) : (
            <form onSubmit={handlePhoneSubmit} className="space-y-3">
              <Input
                placeholder="Nombre completo"
                value={pName}
                onChange={e => setPName(e.target.value)}
                className="bg-white/8 border-white/10 text-white placeholder:text-white/40 focus:border-yellow-400 h-12"
                autoComplete="name"
              />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 text-sm font-bold">🇩🇴 +1</span>
                <Input
                  type="tel"
                  placeholder="809-000-0000"
                  value={pPhone}
                  onChange={e => setPPhone(e.target.value)}
                  className="bg-white/8 border-white/10 text-white placeholder:text-white/40 focus:border-yellow-400 h-12 pl-14"
                  autoComplete="tel"
                  inputMode="numeric"
                  maxLength={12}
                />
              </div>
              <Input
                type="password"
                placeholder="Crear PIN (4–6 dígitos)"
                value={pPin}
                onChange={e => setPPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="bg-white/8 border-white/10 text-white placeholder:text-white/40 focus:border-yellow-400 h-12 tracking-widest text-lg text-center"
                inputMode="numeric"
                maxLength={6}
              />
              <Input
                type="password"
                placeholder="Confirmar PIN"
                value={pPinConfirm}
                onChange={e => setPPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className={`bg-white/8 border-white/10 text-white placeholder:text-white/40 focus:border-yellow-400 h-12 tracking-widest text-lg text-center ${
                  pPinConfirm && pPin !== pPinConfirm ? "border-red-400" : pPinConfirm && pPin === pPinConfirm ? "border-green-400" : ""
                }`}
                inputMode="numeric"
                maxLength={6}
              />

              <div className="pt-1">
                <p className="text-xs text-[#FFD700]/80 uppercase tracking-widest mb-2">{t.enterAs}</p>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map(r => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setPRole(r.value)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        pRole === r.value
                          ? "bg-yellow-400/15 border-yellow-400 text-yellow-400"
                          : "bg-white/5 border-white/10 text-white/70 hover:border-white/20"
                      }`}
                    >
                      <div className="text-base leading-none mb-1">{r.emoji}</div>
                      <div className="text-xs font-bold">{r.label}</div>
                      <div className="text-[10px] text-white/50 mt-0.5 leading-tight">{r.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-yellow-400 text-black font-black text-lg h-12 hover:bg-yellow-300 shadow-[0_0_20px_rgba(255,215,0,0.3)] mt-2"
                disabled={pLoading}
              >
                {pLoading ? "Creando cuenta..." : "Crear cuenta con PIN"}
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-white/70 mt-6">
            {t.alreadyHaveAccount}{" "}
            <Link href="/login">
              <span className="text-yellow-400 font-bold hover:underline">{t.signIn}</span>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
