import { useLang } from "@/lib/lang";

export default function LangToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLang();

  return (
    <div className={`flex items-center rounded-lg border border-yellow-400/30 text-sm font-bold tracking-wide ${className}`}>
      <button
        onClick={() => setLang("es")}
        className={`px-3 py-1 rounded-l-lg transition-colors ${
          lang === "es"
            ? "bg-yellow-400 text-black"
            : "bg-transparent text-white/60 hover:text-white"
        }`}
        title="Cambiar a Español"
      >
        ES
      </button>
      <button
        onClick={() => setLang("en")}
        className={`px-3 py-1 rounded-r-lg transition-colors ${
          lang === "en"
            ? "bg-yellow-400 text-black"
            : "bg-transparent text-white/60 hover:text-white"
        }`}
        title="Switch to English"
      >
        EN
      </button>
    </div>
  );
}
