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
      {/* Unified logo block — text on top, motorcycle flush below */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
        {/* Brand name */}
        <div style={{ textAlign: "center", lineHeight: 1 }}>
          <p style={{
            margin: 0,
            fontSize: "clamp(52px, 14vw, 72px)",
            fontWeight: 900,
            letterSpacing: "-2px",
            lineHeight: 1,
          }}>
            <span style={{ color: "#6be832" }}>Ya</span>
            <span style={{ color: "#ffffff" }}>Pide</span>
          </p>
          <p style={{
            margin: "6px 0 0",
            fontSize: "clamp(14px, 4vw, 20px)",
            fontWeight: 800,
            letterSpacing: "1px",
            color: "#ffffff",
          }}>
            ENTREGA <span style={{ color: "#FFD700" }}>RÁPIDA</span> Y ECONÓMICA
          </p>
        </div>

        {/* Motorcycle — overflow:hidden container shows only bottom 44% of PNG,
            eliminating the layout gap that clip-path left behind */}
        <div style={{
          width: "clamp(120px, 32vw, 150px)",
          aspectRatio: "1 / 0.44",
          overflow: "hidden",
          position: "relative",
          marginTop: "2px",
        }}>
          <img
            src="/logo.png"
            alt=""
            style={{
              width: "100%",
              position: "absolute",
              bottom: 0,
              left: 0,
              filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.45))",
            }}
          />
        </div>
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
