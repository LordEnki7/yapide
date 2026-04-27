import { useEffect, useState } from "react";
import { useLang } from "@/lib/lang";

interface SplashScreenProps {
  onDone: () => void;
}

const STRIPE = "linear-gradient(90deg, transparent 0%, rgba(5,30,110,0.48) 9%, rgba(5,30,110,0.48) 91%, transparent 100%)";

export default function SplashScreen({ onDone }: SplashScreenProps) {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");
  const { lang } = useLang();

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
        overflow: "hidden",
        transition: "opacity 0.55s ease",
        opacity: phase === "hold" ? 1 : 0,
        pointerEvents: "none",
      }}
    >
      {/* Full-screen image — no box, no card */}
      <img
        src="/logo.png"
        alt="YaPide"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "top",
          display: "block",
        }}
      />

      {/* Gloss */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(145deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.04) 35%, transparent 58%)",
        pointerEvents: "none",
      }} />

      {/* Tagline stripes */}
      <div style={{
        position: "absolute", top: "9%", left: 0, right: 0,
        display: "flex", flexDirection: "column", gap: "3px",
        pointerEvents: "none",
      }}>
        <div style={{ background: STRIPE, padding: "7px 0", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.13)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <span style={{ color: "#fff", fontWeight: 900, letterSpacing: "0.12em", fontSize: "clamp(1.05rem, 5vw, 1.35rem)", textShadow: "0 2px 6px rgba(0,0,0,0.5)" }}>
            {lang === "es" ? "ENTREGA" : "FAST"}
          </span>
        </div>
        <div style={{ background: STRIPE, padding: "7px 0", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.13)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <span style={{ color: "#FFD700", fontWeight: 900, fontStyle: "italic", letterSpacing: "0.12em", fontSize: "clamp(1.3rem, 6.5vw, 1.7rem)", textShadow: "0 2px 6px rgba(0,0,0,0.5)" }}>
            {lang === "es" ? "RÁPIDA" : "RELIABLE"}
          </span>
        </div>
        <div style={{ background: STRIPE, padding: "7px 0", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.13)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <span style={{ color: "#fff", fontWeight: 900, letterSpacing: "0.12em", fontSize: "clamp(1.05rem, 5vw, 1.35rem)", textShadow: "0 2px 6px rgba(0,0,0,0.5)" }}>
            {lang === "es" ? "Y CONFIABLE" : "DELIVERY"}
          </span>
        </div>
      </div>

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
