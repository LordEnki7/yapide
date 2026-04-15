import { useLang } from "@/lib/lang";

export default function LangToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLang();

  return (
    <div
      className={`flex items-center gap-0 rounded-lg overflow-hidden border border-yellow-400/30 text-xs font-black ${className}`}
    >
      <button
        onClick={() => setLang("es")}
        className={`px-2 py-1 transition-colors ${
          lang === "es"
            ? "bg-yellow-400 text-black"
            : "bg-transparent text-gray-400 hover:text-gray-200"
        }`}
        title="Cambiar a Español"
      >
        ES
      </button>
      <button
        onClick={() => setLang("en")}
        className={`px-2 py-1 transition-colors ${
          lang === "en"
            ? "bg-yellow-400 text-black"
            : "bg-transparent text-gray-400 hover:text-gray-200"
        }`}
        title="Switch to English"
      >
        EN
      </button>
    </div>
  );
}
