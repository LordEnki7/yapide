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
        borderRadius: "28px",
        width: "clamp(280px, 85vw, 380px)",
        overflow: "hidden",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "0 8px 40px rgba(0,0,40,0.6)",
        position: "relative",
      }}>
        {/* Full logo image — motorcycle shows cleanly at the bottom */}
        <img src="/logo.png" alt="YaPide" style={{ width: "100%", display: "block" }} />
        {/* HTML text overlaid on top portion — solid panel hides faint image text */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          background: "linear-gradient(180deg, #000c32 0%, #000c32 62%, rgba(0,12,50,0) 100%)",
          padding: "20px 20px 44px",
          textAlign: "center",
        }}>
          <p style={{ margin: 0, lineHeight: 1, fontSize: "clamp(34px, 9.5vw, 50px)", fontWeight: 900, letterSpacing: "-1px" }}>
            <span style={{ color: "#6be832" }}>Ya</span><span style={{ color: "#ffffff" }}>Pide</span>
          </p>
          <p style={{ margin: "5px 0 0", fontSize: "clamp(12px, 3.5vw, 17px)", fontWeight: 800, color: "#fff", letterSpacing: "0.5px" }}>
            ENTREGA <span style={{ color: "#FFD700" }}>RÁPIDA</span>
          </p>
          <p style={{ margin: "2px 0 0", fontSize: "clamp(12px, 3.5vw, 17px)", fontWeight: 800, color: "#fff", letterSpacing: "0.5px" }}>
            Y ECONÓMICA
          </p>
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
