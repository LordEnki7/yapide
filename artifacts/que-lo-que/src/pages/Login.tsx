import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLoginUser } from "@workspace/api-client-react";
import { setStoredUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import logo from "@assets/4546fdbf-c360-4a5c-b528-0f447194854b_1775706126188.png";
import { useLang } from "@/lib/lang";
import LangToggle from "@/components/LangToggle";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: t.missingData, description: t.fillCredentials, variant: "destructive" });
      return;
    }
    loginUser.mutate({ data: { email, password } });
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
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
          <div className="text-center mb-8">
            <img src={logo} alt="Que Lo Que Logo" className="w-24 h-24 mx-auto object-contain mb-4" />
            <h1 className="text-3xl font-black text-yellow-400 uppercase">{t.loginTitle}</h1>
            <p className="text-gray-400 mt-1">{t.tagline}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="email"
              placeholder={t.emailPlaceholder}
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400 h-12"
              data-testid="input-email"
              autoComplete="email"
            />
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder={t.passwordPlaceholder}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400 h-12 pr-10"
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

          <div className="mt-6 bg-white/5 border border-white/10 rounded-xl p-4">
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
                  className="text-xs text-gray-300 bg-white/5 rounded-lg px-2 py-1.5 hover:bg-white/10 hover:text-yellow-400 transition text-left"
                >
                  {demo.label}: {demo.email.split("@")[0]}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">{t.demoPassword}</p>
          </div>

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
