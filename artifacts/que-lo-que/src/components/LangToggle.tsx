import { useLang } from "@/lib/lang";

export default function LangToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLang();

  return (
    <button
      onClick={() => setLang(lang === "es" ? "en" : "es")}
      className={`flex items-center gap-0 rounded-lg overflow-hidden border border-yellow-400/30 text-xs font-black transition-all hover:border-yellow-400/60 ${className}`}
      title={lang === "es" ? "Switch to English" : "Cambiar a Español"}
    >
      <span className={`px-2 py-1 transition-colors ${lang === "es" ? "bg-yellow-400 text-black" : "bg-transparent text-gray-400"}`}>
        ES
      </span>
      <span className={`px-2 py-1 transition-colors ${lang === "en" ? "bg-yellow-400 text-black" : "bg-transparent text-gray-400"}`}>
        EN
      </span>
    </button>
  );
}
