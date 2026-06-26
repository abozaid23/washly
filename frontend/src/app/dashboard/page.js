"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const T = {
  bg: "#030508",
  card: "rgba(8,12,16,0.95)",
  border: "rgba(176,196,216,0.12)",
  accent: "#b0c4d8",
  accentGlow: "rgba(176,196,216,0.15)",
  text: "#e0eaf5",
  sub: "#4a6070",
  success: "#4ade80",
  danger: "#f87171",
};

export default function Dashboard() {
  const [washes, setWashes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedRole = localStorage.getItem("role");
    if (!token) { router.push("/"); return; }
    setRole(savedRole);
    setTimeout(() => setVisible(true), 100);

    fetch("http://127.0.0.1:8000/washes/")
      .then((res) => res.json())
      .then((data) => { setWashes(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    router.push("/");
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: T.sub, letterSpacing: "2px", fontSize: "12px" }}>جاري التحميل...</p>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #030508 0%, #080d12 30%, #030508 70%, #050810 100%)",
        padding: "24px 20px 40px",
      }}>
        {/* Ambient glow */}
        <div style={{
          position: "fixed", top: "-100px", left: "50%", transform: "translateX(-50%)",
          width: "600px", height: "400px", borderRadius: "50%",
          background: `radial-gradient(circle, ${T.accentGlow} 0%, transparent 70%)`,
          pointerEvents: "none", zIndex: 0,
        }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: "600px", margin: "0 auto" }}>
          {/* Header */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: "32px",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(-10px)",
            transition: "all 0.6s ease",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <img src="/logo.svg" style={{ width: "32px", height: "32px" }} alt="washly" />
              <div>
                <h1 style={{ color: T.accent, fontSize: "18px", fontWeight: "800", margin: 0, letterSpacing: "3px" }}>washly</h1>
                <p style={{ color: T.sub, fontSize: "10px", margin: 0, letterSpacing: "1px" }}>المغاسل القريبة</p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {(role === "owner" || role === "super_admin") && (
                <button onClick={() => router.push("/owner")} style={{
                  background: "rgba(176,196,216,0.06)", color: T.accent,
                  border: `1px solid ${T.border}`, borderRadius: "10px",
                  padding: "7px 12px", fontSize: "12px", cursor: "pointer",
                }}>مغاسلي</button>
              )}
              {role === "super_admin" && (
                <button onClick={() => router.push("/admin")} style={{
                  background: "rgba(176,196,216,0.06)", color: T.accent,
                  border: `1px solid ${T.border}`, borderRadius: "10px",
                  padding: "7px 12px", fontSize: "12px", cursor: "pointer",
                }}>أدمن</button>
              )}
              <button onClick={() => router.push("/bookings")} style={{
                background: "rgba(176,196,216,0.06)", color: T.accent,
                border: `1px solid ${T.border}`, borderRadius: "10px",
                padding: "7px 12px", fontSize: "12px", cursor: "pointer",
              }}>حجوزاتي</button>
              <button onClick={() => router.push("/profile")} style={{
                background: "rgba(176,196,216,0.06)", color: T.accent,
                border: `1px solid ${T.border}`, borderRadius: "10px",
                padding: "7px 12px", fontSize: "12px", cursor: "pointer",
              }}>بروفايل</button>
              <button onClick={logout} style={{
                background: "rgba(248,113,113,0.08)", color: T.danger,
                border: `1px solid rgba(248,113,113,0.2)`, borderRadius: "10px",
                padding: "7px 12px", fontSize: "12px", cursor: "pointer",
              }}>خروج</button>
            </div>
          </div>

          {/* Wash Cards */}
          {washes.length === 0 && (
            <p style={{ color: T.sub, textAlign: "center", marginTop: "60px", fontSize: "13px" }}>لا توجد مغاسل متاحة</p>
          )}

          {washes.map((wash, i) => (
            <div
              key={wash.id}
              onClick={() => router.push(`/wash/${wash.id}`)}
              style={{
                background: T.card, borderRadius: "20px", padding: "20px",
                border: `1px solid ${T.border}`, marginBottom: "14px",
                cursor: "pointer",
                boxShadow: `0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 ${T.accent}08`,
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(20px)",
                transition: `all 0.6s cubic-bezier(0.16,1,0.3,1) ${0.1 + i * 0.08}s`,
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = `${T.accent}30`}
              onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ color: T.sub, fontSize: "10px", letterSpacing: "1px", margin: "0 0 6px" }}>
                    ⭐ مغسلة مميزة
                  </p>
                  <h2 style={{ color: T.text, fontSize: "17px", fontWeight: "700", margin: "0 0 5px" }}>{wash.name}</h2>
                  <p style={{ color: T.sub, fontSize: "13px", margin: "0 0 12px" }}>{wash.address}</p>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <div style={{
                      width: "6px", height: "6px", borderRadius: "50%",
                      background: wash.is_open_now ? T.success : T.sub,
                      boxShadow: wash.is_open_now ? `0 0 8px ${T.success}` : "none",
                    }} />
                    <span style={{ color: wash.is_open_now ? T.success : T.sub, fontSize: "12px" }}>
                      {wash.is_open_now ? "مفتوح الآن" : "مغلق"}
                    </span>
                  </div>
                </div>
                <div style={{
                  background: "rgba(176,196,216,0.06)", border: `1px solid ${T.border}`,
                  borderRadius: "12px", padding: "10px 12px", textAlign: "center",
                }}>
                  <p style={{ color: T.accent, fontSize: "20px", fontWeight: "800", margin: 0 }}>4.9</p>
                  <p style={{ color: T.sub, fontSize: "9px", margin: "3px 0 0" }}>★★★★★</p>
                </div>
              </div>
              <div style={{
                marginTop: "14px", paddingTop: "14px",
                borderTop: `1px solid ${T.border}`,
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ color: T.sub, fontSize: "11px" }}>{wash.opening_time} — {wash.closing_time}</span>
                <span style={{ color: T.accent, fontSize: "12px", opacity: 0.6 }}>احجز الآن ←</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}