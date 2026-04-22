import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLoginUser } from "@workspace/api-client-react";
import { setStoredUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Eye, EyeOff, Smartphone, Mail, MessageCircle, KeyRound, CheckCircle } from "lucide-react";
import { useLang } from "@/lib/lang";
import LangToggle from "@/components/LangToggle";

const logo = "/logo.png";

type ForgotStep = "idle" | "enter-phone" | "enter-code" | "new-pin" | "done";

export default function Login() {
  const [tab, setTab] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot-PIN flow state
  const [forgotStep, setForgotStep] = useState<ForgotStep>("idle");
  const [forgotPhone, setForgotPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpDisplay, setOtpDisplay] = useState("");
  const [waLink, setWaLink] = useState("");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newPinConfirm, setNewPinConfirm] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

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
      toast({ title: "Número inválido", description: "Ingresa tu número completo (10 dígitos)", variant: "destructive" });
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

  const handleForgotSendCode = async () => {
    const digits = forgotPhone.replace(/\D/g, "");
    if (digits.length < 10) {
      toast({ title: "Número inválido", description: "Ingresa tu número de teléfono completo", variant: "destructive" });
      return;
    }
    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: digits }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setOtpCode(data.otpCode);
      setOtpDisplay(data.otpCode);
      setWaLink(data.waLink);
      setForgotStep("enter-code");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotVerifyCode = () => {
    if (enteredOtp.trim() !== otpCode) {
      toast({ title: "Código incorrecto", description: "Verifica el código enviado por WhatsApp", variant: "destructive" });
      return;
    }
    setForgotStep("new-pin");
  };

  const handleForgotResetPin = async () => {
    if (!/^\d{4,6}$/.test(newPin)) {
      toast({ title: "PIN inválido", description: "El PIN debe ser 4–6 dígitos", variant: "destructive" });
      return;
    }
    if (newPin !== newPinConfirm) {
      toast({ title: "PINs no coinciden", description: "Los dos PINs deben ser iguales", variant: "destructive" });
      return;
    }
    setForgotLoading(true);
    try {
      const digits = forgotPhone.replace(/\D/g, "");
      const res = await fetch("/api/auth/reset-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: digits, otp: enteredOtp, newPin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setForgotStep("done");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setForgotLoading(false);
    }
  };

  if (forgotStep !== "idle") {
    return (
      <div className="min-h-screen bg-background text-white flex flex-col">
        <div className="px-4 pt-6 flex items-center justify-between">
          <button
            onClick={() => { setForgotStep("idle"); setEnteredOtp(""); setNewPin(""); setNewPinConfirm(""); setOtpDisplay(""); }}
            className="flex items-center gap-2 text-white/60 hover:text-white transition"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">Volver</span>
          </button>
          <LangToggle />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-yellow-400/15 border border-yellow-400/30 flex items-center justify-center mx-auto mb-4">
                <KeyRound size={28} className="text-yellow-400" />
              </div>
              <h1 className="text-2xl font-black text-yellow-400 uppercase">Restablecer PIN</h1>
              <p className="text-white/60 text-sm mt-1">
                {forgotStep === "enter-phone" && "Ingresa tu número para recibir un código"}
                {forgotStep === "enter-code" && "Ingresa el código de verificación"}
                {forgotStep === "new-pin" && "Crea tu nuevo PIN"}
                {forgotStep === "done" && "¡PIN actualizado!"}
              </p>
            </div>

            {forgotStep === "enter-phone" && (
              <div className="space-y-4">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 text-sm font-bold">🇩🇴 +1</span>
                  <Input
                    type="tel"
                    placeholder="809-000-0000"
                    value={forgotPhone}
                    onChange={e => setForgotPhone(e.target.value)}
                    className="bg-white/8 border-white/10 text-white placeholder:text-white/40 focus:border-yellow-400 h-12 pl-14"
                    inputMode="numeric"
                    maxLength={12}
                  />
                </div>
                <Button
                  onClick={handleForgotSendCode}
                  disabled={forgotLoading}
                  className="w-full bg-yellow-400 text-black font-black text-lg h-12 hover:bg-yellow-300"
                >
                  {forgotLoading ? "Enviando..." : "Enviar código"}
                </Button>
              </div>
            )}

            {forgotStep === "enter-code" && (
              <div className="space-y-4">
                <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 text-center">
                  <MessageCircle size={24} className="text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-white/80 mb-1">Tu código de verificación:</p>
                  <p className="text-3xl font-black tracking-[0.3em] text-yellow-400">{otpDisplay}</p>
                  <p className="text-xs text-white/50 mt-2">Válido por 10 minutos</p>
                  {waLink && (
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-3 bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
                    >
                      <MessageCircle size={14} />
                      Envíate por WhatsApp
                    </a>
                  )}
                </div>
                <Input
                  type="text"
                  placeholder="Ingresa el código de 6 dígitos"
                  value={enteredOtp}
                  onChange={e => setEnteredOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="bg-white/8 border-white/10 text-white placeholder:text-white/40 focus:border-yellow-400 h-12 tracking-widest text-lg text-center"
                  inputMode="numeric"
                  maxLength={6}
                />
                <Button
                  onClick={handleForgotVerifyCode}
                  className="w-full bg-yellow-400 text-black font-black text-lg h-12 hover:bg-yellow-300"
                >
                  Verificar código
                </Button>
              </div>
            )}

            {forgotStep === "new-pin" && (
              <div className="space-y-4">
                <Input
                  type="password"
                  placeholder="Nuevo PIN (4–6 dígitos)"
                  value={newPin}
                  onChange={e => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="bg-white/8 border-white/10 text-white placeholder:text-white/40 focus:border-yellow-400 h-12 tracking-widest text-lg text-center"
                  inputMode="numeric"
                  maxLength={6}
                />
                <Input
                  type="password"
                  placeholder="Confirmar nuevo PIN"
                  value={newPinConfirm}
                  onChange={e => setNewPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className={`bg-white/8 border-white/10 text-white placeholder:text-white/40 focus:border-yellow-400 h-12 tracking-widest text-lg text-center ${
                    newPinConfirm && newPin !== newPinConfirm ? "border-red-400" : newPinConfirm && newPin === newPinConfirm ? "border-green-400" : ""
                  }`}
                  inputMode="numeric"
                  maxLength={6}
                />
                <Button
                  onClick={handleForgotResetPin}
                  disabled={forgotLoading}
                  className="w-full bg-yellow-400 text-black font-black text-lg h-12 hover:bg-yellow-300"
                >
                  {forgotLoading ? "Guardando..." : "Guardar nuevo PIN"}
                </Button>
              </div>
            )}

            {forgotStep === "done" && (
              <div className="text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto">
                  <CheckCircle size={40} className="text-green-400" />
                </div>
                <div>
                  <p className="text-white font-bold text-lg">¡PIN actualizado con éxito!</p>
                  <p className="text-white/60 text-sm mt-1">Ya puedes entrar con tu número y tu nuevo PIN</p>
                </div>
                <Button
                  onClick={() => { setForgotStep("idle"); setTab("phone"); }}
                  className="w-full bg-yellow-400 text-black font-black text-lg h-12 hover:bg-yellow-300"
                >
                  Ir a iniciar sesión
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      <div className="px-4 pt-6 flex items-center justify-between">
        <Link href="/">
          <button className="flex items-center gap-2 text-white/60 hover:text-white transition">
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
            <p className="text-white/70 mt-1">{t.tagline}</p>
          </div>

          <div className="flex bg-white/5 rounded-2xl p-1 mb-5 border border-white/10">
            <button
              onClick={() => setTab("email")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === "email" ? "bg-yellow-400 text-black shadow" : "text-white/60 hover:text-white"
              }`}
            >
              <Mail size={15} />
              Email
            </button>
            <button
              onClick={() => setTab("phone")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === "phone" ? "bg-yellow-400 text-black shadow" : "text-white/60 hover:text-white"
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
                className="bg-white/8 border-white/10 text-white placeholder:text-white/40 focus:border-yellow-400 h-12"
                data-testid="input-email"
                autoComplete="email"
              />
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={t.passwordPlaceholder}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="bg-white/8 border-white/10 text-white placeholder:text-white/40 focus:border-yellow-400 h-12 pr-10"
                  data-testid="input-password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition"
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
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 text-sm font-bold">🇩🇴 +1</span>
                <Input
                  type="tel"
                  placeholder="809-000-0000"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="bg-white/8 border-white/10 text-white placeholder:text-white/40 focus:border-yellow-400 h-12 pl-14"
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
                className="bg-white/8 border-white/10 text-white placeholder:text-white/40 focus:border-yellow-400 h-12 tracking-widest text-lg text-center"
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

              <button
                type="button"
                onClick={() => { setForgotPhone(phone); setForgotStep("enter-phone"); }}
                className="w-full text-center text-sm text-[#FFD700]/70 hover:text-yellow-400 transition py-1"
              >
                ¿Olvidaste tu PIN? Restablécelo aquí
              </button>
            </form>
          )}

          {tab === "email" && (
            <div className="mt-6 bg-white/8 border border-white/10 rounded-xl p-4">
              <p className="text-xs text-[#FFD700]/80 font-bold uppercase tracking-widest mb-2">{t.demoLabel}</p>
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
                    className="text-xs text-white/80 bg-white/8 rounded-lg px-2 py-1.5 hover:bg-white/10 hover:text-yellow-400 transition text-left"
                  >
                    {demo.label}: {demo.email.split("@")[0]}
                  </button>
                ))}
              </div>
              <p className="text-xs text-white/50 mt-2">{t.demoPassword}</p>
            </div>
          )}

          <p className="text-center text-sm text-white/70 mt-6">
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
