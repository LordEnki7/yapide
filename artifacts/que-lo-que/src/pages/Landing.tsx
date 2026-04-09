import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import logo from "@assets/4546fdbf-c360-4a5c-b528-0f447194854b_1775706126188.png";
import { setStoredUser } from "@/lib/auth";
import { UserRole } from "@workspace/api-client-react";
import { useLang } from "@/lib/lang";
import LangToggle from "@/components/LangToggle";

export default function Landing() {
  const { t } = useLang();

  const demoLogin = (role: UserRole) => {
    setStoredUser({
      id: 1,
      name: `Demo ${role}`,
      email: `${role}@demo.com`,
      role,
      isBanned: false,
    });
    window.location.href = `/${role}`;
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-12">
        <div className="text-center space-y-6">
          <div className="flex justify-end">
            <LangToggle />
          </div>
          <img src={logo} alt="Que Lo Que Logo" className="w-48 h-48 mx-auto object-contain" />
          <h1 className="text-5xl font-black tracking-tighter uppercase text-primary">{t.appName}</h1>
          <p className="text-xl italic text-gray-400">{t.tagline}</p>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest text-center">{t.enterAs}</h2>
          <div className="grid grid-cols-1 gap-4">
            <Button
              size="lg"
              className="w-full text-lg font-bold bg-primary hover:bg-primary/90 text-black h-14"
              onClick={() => demoLogin(UserRole.customer)}
            >
              🍔 {t.customer}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full text-lg font-bold border-2 border-primary text-primary hover:bg-primary hover:text-black h-14"
              onClick={() => demoLogin(UserRole.driver)}
            >
              🛵 {t.driver}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full text-lg font-bold border-2 border-primary text-primary hover:bg-primary hover:text-black h-14"
              onClick={() => demoLogin(UserRole.business)}
            >
              🏪 {t.business}
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="w-full text-sm font-medium text-gray-400 hover:text-white"
              onClick={() => demoLogin(UserRole.admin)}
            >
              {t.adminLink}
            </Button>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-500">
            {t.haveAccount}{" "}
            <Link href="/login" className="text-primary font-bold hover:underline">
              {t.signIn}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
