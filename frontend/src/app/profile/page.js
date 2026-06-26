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
  danger: "#f87171",
};

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/"); return; }
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setProfile({ phone: payload.phone, role: payload.role });
    } catch { router.push("/"); }
    setTimeout(() => setVisible(true), 100);
    setLoading(false);
  }, []);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    router.push("/");
  }

  const roleLabel = (r) => r === "customer" ? "عميل" : r === "owner" ? "صاحب مغسلة" : r === "employee" ? "موظف" : r === "supervisor" ? "مشرف" : r === "super_admin" ? "أدمن" : r;

  if (loading) return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: T.sub, letterSpacing: "2px", fontSize: "12px" }}>جاري التحميل...</p>
    </div>
  );

  const links = [
    { label: "حجوزاتي", path: "/bookings" },
    { label: "عرباياتي", path: "/vehicles" },
    { label: "الرئيسية", path: "/dashboard" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #030508 0%, #080d12 30%, #030508 70%, #050810 100%)",
      padding: "24px 20px 40px",
    }}>
      <div style={{ maxWidth: "500px", margin: "0 auto" }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: "32px",
          opacity: visible ? 1 : 0, transition: "all 0.6s ease",
        }}>
          <h1 style={{ color: T.accent, fontSize: "20px", fontWeight: "800", margin: 0, letterSpacing: "2px" }}>البروفايل</h1>
          <button onClick={() => router.push("/dashboard")} style={{ background: "none", border: "none", color: T.sub, cursor: "pointer", fontSize: "13px" }}>← رجوع</button>
        </div>

        <div style={{
          textAlign: "center", marginBottom: "28px",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.6s cubic-bezier(0.16,1,0.3,1)",
        }}>
          <div style={{
            width: "80px", height: "80px", borderRadius: "50%", margin: "0 auto 14px",
            background: `linear-gradient(135deg, ${T.accent}18, ${T.accent}06)`,
            border: `1px solid ${T.border}`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px",
            boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 20px ${T.accentGlow}`,
          }}>👤</div>
          <p style={{ color: T.accent, fontSize: "14px", fontWeight: "600", margin: 0 }}>{profile?.phone}</p>
          <p style={{ color: T.sub, fontSize: "11px", marginTop: "4px", letterSpacing: "1px" }}>{roleLabel(profile?.role)}</p>
        </div>

        {[
          { label: "رقم الموبايل", value: profile?.phone },
          { label: "الدور", value: roleLabel(profile?.role) },
        ].map((item, i) => (
          <div key={i} style={{
            background: T.card, borderRadius: "16px", padding: "16px 20px",
            border: `1px solid ${T.border}`, marginBottom: "10px",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: `all 0.6s cubic-bezier(0.16,1,0.3,1) ${0.1 + i * 0.06}s`,
          }}>
            <p style={{ color: T.sub, fontSize: "10px", letterSpacing: "1.5px", margin: "0 0 6px" }}>{item.label}</p>
            <p style={{ color: T.text, fontSize: "15px", fontWeight: "600", margin: 0 }}>{item.value}</p>
          </div>
        ))}

        <div style={{
          background: T.card, borderRadius: "16px",
          border: `1px solid ${T.border}`, marginBottom: "20px", overflow: "hidden",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.6s cubic-bezier(0.16,1,0.3,1) 0.2s",
        }}>
          {links.map((link, i) => (
            <div
              key={i}
              onClick={() => router.push(link.path)}
              style={{
                padding: "16px 20px", cursor: "pointer", display: "flex",
                justifyContent: "space-between", alignItems: "center",
                borderBottom: i < links.length - 1 ? `1px solid ${T.border}` : "none",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(176,196,216,0.04)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >
              <span style={{ color: T.text, fontSize: "14px" }}>{link.label}</span>
              <span style={{ color: T.sub, fontSize: "12px" }}>←</span>
            </div>
          ))}
        </div>

        <button onClick={logout} style={{
          width: "100%", padding: "15px", borderRadius: "14px",
          border: "1px solid rgba(248,113,113,0.2)",
          background: "rgba(248,113,113,0.06)", color: T.danger,
          fontSize: "14px", fontWeight: "600", cursor: "pointer",
          boxSizing: "border-box",
          opacity: visible ? 1 : 0,
          transition: "all 0.6s ease 0.25s",
        }}>
          تسجيل خروج
        </button>
      </div>
    </div>
  );
}