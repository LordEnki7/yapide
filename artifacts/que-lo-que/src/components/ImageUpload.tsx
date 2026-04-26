import { useRef, useState } from "react";
import { Camera, Loader2, CheckCircle } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";

interface Props {
  currentUrl?: string | null;
  onUploaded: (objectPath: string) => void;
  shape?: "circle" | "square";
  label?: string;
  size?: "xs" | "sm" | "md" | "lg";
}

const SIZES = {
  xs: "w-6 h-6",
  sm: "w-20 h-20",
  md: "w-28 h-28",
  lg: "w-36 h-36",
};

export default function ImageUpload({ currentUrl, onUploaded, shape = "square", label = "Subir imagen", size = "md" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file) return;
    setUploading(true);
    setSuccess(false);

    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);

    try {
      const metaRes = await apiFetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!metaRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await metaRes.json();

      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!uploadRes.ok) throw new Error("Upload failed");

      onUploaded(objectPath);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Upload error", err);
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const displayUrl = preview || currentUrl;
  const rounded = shape === "circle" ? "rounded-full" : "rounded-2xl";

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={`relative ${SIZES[size]} ${rounded} overflow-hidden bg-white/8 border-2 ${success ? "border-green-400" : "border-white/15 hover:border-yellow-400/50"} transition flex items-center justify-center group`}
      >
        {displayUrl ? (
          <img src={displayUrl} alt="Upload" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-gray-500">
            <Camera size={24} />
            <span className="text-[10px] font-bold">Foto</span>
          </div>
        )}

        {/* Overlay on hover */}
        {!uploading && (
          <div className={`absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${rounded}`}>
            <Camera size={20} className="text-white" />
          </div>
        )}

        {/* Uploading spinner */}
        {uploading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Loader2 size={22} className="text-yellow-400 animate-spin" />
          </div>
        )}

        {/* Success badge */}
        {success && (
          <div className="absolute bottom-1 right-1 bg-green-500 rounded-full p-0.5">
            <CheckCircle size={12} className="text-white" />
          </div>
        )}
      </button>

      {size !== "xs" && <p className="text-xs text-gray-500 font-bold">{uploading ? "Subiendo..." : label}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}
