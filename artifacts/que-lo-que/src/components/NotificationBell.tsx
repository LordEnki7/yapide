import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useToast } from "@/hooks/use-toast";

export default function NotificationBell() {
  const { state, subscribe, unsubscribe } = usePushNotifications();
  const { toast } = useToast();

  if (state === "unsupported") return null;

  const handleClick = async () => {
    if (state === "granted") {
      await unsubscribe();
      toast({ title: "Notificaciones desactivadas" });
    } else if (state === "denied") {
      toast({ title: "Notificaciones bloqueadas", description: "Actívalas en la configuración de tu navegador.", variant: "destructive" });
    } else if (state === "default") {
      await subscribe();
      if (Notification.permission === "granted") {
        toast({ title: "🔔 Notificaciones activadas", description: "Te avisaremos cuando haya novedades de tu pedido." });
      }
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={state === "loading"}
      className="relative w-9 h-9 rounded-full flex items-center justify-center transition hover:bg-white/10 focus:outline-none"
      aria-label="Notificaciones"
    >
      {state === "loading" && <Loader2 size={18} className="text-yellow-400 animate-spin" />}
      {state === "granted" && <BellRing size={18} className="text-yellow-400" />}
      {state === "default" && <Bell size={18} className="text-gray-400" />}
      {state === "denied" && <BellOff size={18} className="text-gray-500" />}
      {state === "granted" && (
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
      )}
    </button>
  );
}
