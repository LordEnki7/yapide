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
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#076BE5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        transition: "opacity 0.55s ease",
        opacity: phase === "hold" ? 1 : 0,
        pointerEvents: "none",
      }}
    >
      {/* Logo — constrained width, never cropped */}
      <img
        src="/logo.png?v=2"
        alt="YaPide"
        style={{
          width: "min(100vw, 430px)",
          height: "auto",
          display: "block",
          objectFit: "contain",
        }}
      />

      {/* Dots indicator */}
      <div style={{
        position: "absolute", bottom: "48px", left: 0, right: 0,
        display: "flex", gap: "8px", alignItems: "center",
        justifyContent: "center", opacity: 0.55,
      }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: i === 1 ? "20px" : "8px",
            height: "8px",
            borderRadius: "4px",
            background: "#FFD700",
            display: "inline-block",
          }} />
        ))}
      </div>
    </div>
  );
}
