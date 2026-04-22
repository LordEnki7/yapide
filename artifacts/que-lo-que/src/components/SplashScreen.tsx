import { useEffect, useState } from "react";

interface SplashScreenProps {
  onDone: () => void;
}

export default function SplashScreen({ onDone }: SplashScreenProps) {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 50);
    const t2 = setTimeout(() => setPhase("exit"), 2500);
    const t3 = setTimeout(() => onDone(), 3100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onDone]);

  const visible = phase !== "exit";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "linear-gradient(180deg, #0057b7 0%, #0048a8 15%, #003898 40%, #003898 60%, #0048a8 85%, #0057b7 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "24px",
        transition: "opacity 0.55s ease, transform 0.55s ease",
        opacity: phase === "enter" ? 0 : phase === "hold" ? 1 : 0,
        transform: phase === "enter" ? "scale(0.92)" : phase === "hold" ? "scale(1)" : "scale(1.04)",
        pointerEvents: "none",
      }}
    >
      <div style={{
        background: "rgba(0, 10, 50, 0.50)",
        borderRadius: "24px",
        padding: "20px 24px 16px",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 8px 40px rgba(0,0,40,0.5)",
      }}>
        <img
          src="/logo.png"
          alt="YaPide"
          style={{
            width: "clamp(180px, 55vw, 260px)",
            objectFit: "contain",
            display: "block",
            filter: "contrast(1.25) brightness(1.08)",
            imageRendering: "high-quality",
          }}
        />
      </div>

      <p
        style={{
          color: "#FFD700",
          fontSize: "clamp(14px, 3.5vw, 18px)",
          fontWeight: 600,
          letterSpacing: "0.04em",
          textAlign: "center",
          margin: 0,
          opacity: phase === "hold" ? 1 : 0,
          transition: "opacity 0.4s ease 0.2s",
        }}
      >
        Entrega rápida y económica.
      </p>

      <div
        style={{
          position: "absolute",
          bottom: "48px",
          display: "flex",
          gap: "8px",
          alignItems: "center",
          opacity: 0.45,
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: i === 1 ? "20px" : "8px",
              height: "8px",
              borderRadius: "4px",
              background: "#FFD700",
              display: "inline-block",
              transition: "all 0.3s ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}
