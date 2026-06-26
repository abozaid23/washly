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

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/"); return; }
    setTimeout(() => setVisible(true), 100);

    fetch("http://127.0.0.1:8000/bookings/my", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setBookings(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const statusColor = (s) => s === "confirmed" ? T.accent : s === "completed" ? T.success : s === "cancelled" ? T.danger : T.sub;
  const statusLabel = (s) => s === "confirmed" ? "مؤكد" : s === "completed" ? "مكتمل" : s === "cancelled" ? "ملغي" : s === "no_show" ? "لم يحضر" : s;

  if (loading) return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: T.sub, letterSpacing: "2px", fontSize: "12px" }}>جاري التحميل...</p>
    </div>
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #030508 0%, #080d12 30%, #030508 70%, #050810 100%)",
      padding: "24px 20px 40px",
    }}>
      <div style={{ maxWidth: "500px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: "28px",
          opacity: visible ? 1 : 0, transition: "all 0.6s ease",
        }}>
          <h1 style={{ color: T.accent, fontSize: "20px", fontWeight: "800", margin: 0, letterSpacing: "2px" }}>حجوزاتي</h1>
          <button onClick={() => router.push("/dashboard")} style={{
            background: "none", border: "none", color: T.sub, cursor: "pointer", fontSize: "13px",
          }}>← رجوع</button>
        </div>

        {bookings.length === 0 && (
          <div style={{
            background: T.card, borderRadius: "20px", padding: "40px 20px",
            border: `1px solid ${T.border}`, textAlign: "center",
            opacity: visible ? 1 : 0, transition: "all 0.6s ease 0.1s",
          }}>
            <p style={{ color: T.sub, fontSize: "13px" }}>لا توجد حجوزات بعد</p>
          </div>
        )}

        {bookings.map((booking, i) => (
          <div key={booking.id} style={{
            background: T.card, borderRadius: "20px", padding: "20px",
            border: `1px solid ${T.border}`, marginBottom: "12px",
            boxShadow: `0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 ${T.accent}06`,
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: `all 0.6s cubic-bezier(0.16,1,0.3,1) ${0.1 + i * 0.06}s`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
              <div>
                <p style={{ color: T.sub, fontSize: "10px", letterSpacing: "1px", margin: "0 0 6px" }}>حجز رقم {booking.id}</p>
                <p style={{ color: T.text, fontSize: "16px", fontWeight: "600", margin: 0 }}>
                  {new Date(booking.appointment_time).toLocaleString("ar-EG")}
                </p>
              </div>
              <div style={{
                background: `${statusColor(booking.status)}11`,
                border: `1px solid ${statusColor(booking.status)}33`,
                borderRadius: "20px", padding: "5px 12px",
              }}>
                <span style={{ color: statusColor(booking.status), fontSize: "12px", fontWeight: "600" }}>
                  {statusLabel(booking.status)}
                </span>
              </div>
            </div>
            <div style={{ height: "1px", background: T.border }} />
            <p style={{ color: T.sub, fontSize: "11px", margin: "10px 0 0", letterSpacing: "0.5px" }}>
              مغسلة رقم: {booking.wash_id}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}