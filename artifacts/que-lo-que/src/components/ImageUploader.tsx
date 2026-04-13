import { useRef } from "react";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { useUpload } from "@workspace/object-storage-web";

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export default function ImageUploader({ value, onChange, label = "Foto del producto" }: ImageUploaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const { uploadFile, isUploading, progress } = useUpload({
    basePath: `${BASE}/api/storage`,
    onSuccess: (result) => {
      const servingUrl = `${BASE}/api/storage${result.objectPath}`;
      onChange(servingUrl);
    },
    onError: (err) => {
      console.error("Upload error:", err);
    },
  });

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    uploadFile(file);
  };

  const clearImage = () => {
    onChange("");
  };

  return (
    <div className="space-y-2">
      <label className="text-xs text-gray-400 uppercase tracking-widest">{label}</label>

      {value && (
        <div className="relative w-full h-40 rounded-xl overflow-hidden border border-white/10 bg-white/5">
          <img src={value} alt="Vista previa" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={clearImage}
            className="absolute top-2 right-2 w-7 h-7 bg-black/70 rounded-full flex items-center justify-center hover:bg-red-500/80 transition"
          >
            <X size={14} className="text-white" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={isUploading}
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center gap-2 p-4 bg-white/8 border border-white/10 rounded-xl hover:border-yellow-400/40 transition disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <Loader2 size={20} className="text-yellow-400 animate-spin" />
              <span className="text-xs text-gray-400">{progress}%</span>
            </>
          ) : (
            <>
              <Upload size={20} className="text-yellow-400" />
              <span className="text-xs text-gray-300">Galería</span>
            </>
          )}
        </button>

        <button
          type="button"
          disabled={isUploading}
          onClick={() => cameraRef.current?.click()}
          className="flex flex-col items-center gap-2 p-4 bg-white/8 border border-white/10 rounded-xl hover:border-yellow-400/40 transition disabled:opacity-50"
        >
          <Camera size={20} className="text-yellow-400" />
          <span className="text-xs text-gray-300">Cámara</span>
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => handleFile(e.target.files?.[0])}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={e => handleFile(e.target.files?.[0])}
        />
      </div>

      <p className="text-xs text-gray-600 text-center">o pega una URL</p>
      <input
        type="url"
        placeholder="https://..."
        value={value.startsWith("http") ? value : ""}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-white/8 border border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400 focus:outline-none rounded-lg px-3 py-2 text-sm transition"
      />
    </div>
  );
}
