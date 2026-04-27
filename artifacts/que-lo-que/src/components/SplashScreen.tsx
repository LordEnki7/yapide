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
      {/* Full brand poster — glossy */}
      <div style={{ position: "relative", width: "clamp(260px, 78vw, 340px)", borderRadius: "18px", overflow: "hidden", boxShadow: "0 8px 48px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)" }}>
        <img
          src="/logo.png"
          alt="YaPide"
          style={{ width: "100%", display: "block" }}
        />
        {/* Gloss highlight */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(145deg, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0.12) 35%, rgba(255,255,255,0) 60%)",
          borderRadius: "18px",
          pointerEvents: "none",
        }} />
        {/* Edge sheen */}
        <div style={{
          position: "absolute",
          inset: 0,
          borderRadius: "18px",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(0,0,0,0.2)",
          pointerEvents: "none",
        }} />
      </div>

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
