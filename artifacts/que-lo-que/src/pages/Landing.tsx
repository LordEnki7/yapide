import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { setStoredUser } from "@/lib/auth";
import { UserRole } from "@workspace/api-client-react";
import { useLang } from "@/lib/lang";
import LangToggle from "@/components/LangToggle";

const logo = "/logo.png";

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
    <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-12">
        <div className="text-center space-y-6">
          <div className="flex justify-end">
            <LangToggle />
          </div>
          <img src={logo} alt="Que Lo Que Logo" className="w-56 mx-auto object-contain drop-shadow-[0_0_30px_rgba(255,215,0,0.3)]" />
          <p className="text-lg italic text-blue-200 mt-2">{t.tagline}</p>
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
