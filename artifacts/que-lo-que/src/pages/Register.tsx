import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useRegisterUser } from "@workspace/api-client-react";
import { setStoredUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useLang } from "@/lib/lang";
import LangToggle from "@/components/LangToggle";

const logo = "/logo.png";

const ROLES = [
  { value: "customer", label: "🍔 Cliente", sub: "Pide comida y más" },
  { value: "driver", label: "🛵 Coro / Driver", sub: "Reparte y gana" },
  { value: "business", label: "🏪 Negocio", sub: "Vende tu menú" },
];

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("customer");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useLang();

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
        if (data.user.role === "business") {
          navigate("/business/onboarding");
        } else if (data.user.role === "driver") {
          navigate("/driver/onboarding");
        } else {
          navigate(`/${data.user.role}`);
        }
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.error ?? t.error;
        toast({ title: t.error, description: msg, variant: "destructive" });
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast({ title: t.missingData, description: t.fillCredentials, variant: "destructive" });
      return;
    }
    register.mutate({ data: { name, email, password, role: role as any, phone: phone || undefined } });
  };

  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      <div className="px-4 pt-6 flex items-center justify-between">
        <Link href="/login">
          <button className="flex items-center gap-2 text-gray-400 hover:text-white transition">
            <ArrowLeft size={18} />
            <span className="text-sm">{t.back}</span>
          </button>
        </Link>
        <LangToggle />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <img src={logo} alt="Que Lo Que" className="w-28 mx-auto object-contain mb-2" />
            <h1 className="text-2xl font-black text-yellow-400 uppercase">Crear cuenta</h1>
            <p className="text-gray-400 text-sm mt-1">Únete a Que Lo Que</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              placeholder="Tu nombre completo"
              value={name}
              onChange={e => setName(e.target.value)}
              className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400 h-12"
              autoComplete="name"
            />
            <Input
              type="email"
              placeholder={t.emailPlaceholder}
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400 h-12"
              autoComplete="email"
            />
            <Input
              type="tel"
              placeholder="Teléfono (opcional)"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400 h-12"
              autoComplete="tel"
            />
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder={t.passwordPlaceholder}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400 h-12 pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="pt-1">
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Entrar como</p>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      role === r.value
                        ? "bg-yellow-400/15 border-yellow-400 text-yellow-400"
                        : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
                    }`}
                  >
                    <div className="text-base leading-none mb-1">{r.label.split(" ")[0]}</div>
                    <div className="text-xs font-bold">{r.label.split(" ").slice(1).join(" ")}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">{r.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-yellow-400 text-black font-black text-lg h-12 hover:bg-yellow-300 shadow-[0_0_20px_rgba(255,215,0,0.3)] mt-2"
              disabled={register.isPending}
            >
              {register.isPending ? "Creando cuenta..." : "Crear cuenta"}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-6">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login">
              <span className="text-yellow-400 font-bold hover:underline">{t.signIn}</span>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
